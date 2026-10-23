/**
 * Owner/admin account setup — run ON THE SERVER, from backend/:
 *
 *   npm run admin:create
 *
 * Interactive and TTY-only on purpose: the email and password are typed
 * at prompts (the password is never echoed, never passed as an argument,
 * so it never lands in shell history, `ps` output or logs).
 *
 *  - No account with that email yet  -> creates one with role "admin".
 *  - Existing account                -> promotes it to "admin" in place
 *    (its events, orders and history are untouched) and optionally sets a
 *    new password, which also signs out its existing sessions.
 *
 * The password is hashed with the app's own bcrypt helper
 * (src/utils/password.js), exactly like a normal sign-up. Every run writes
 * an audit log entry without the password.
 */
import readline from 'node:readline';
import { pool } from '../src/config/db.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { refreshTokenRepository } from '../src/repositories/refreshToken.repository.js';
import { auditLogRepository } from '../src/repositories/auditLog.repository.js';
import { hashPassword } from '../src/utils/password.js';
import { ROLES } from '../src/constants/roles.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

if (!process.stdin.isTTY) {
  console.error('Run this command in an interactive terminal (e.g. an SSH session on the server).');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
// While muted, swallow what readline would echo so the password is never shown.
rl._writeToOutput = function writeToOutput(text) {
  if (!muted) rl.output.write(text);
};

function ask(question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

async function askHidden(question) {
  process.stdout.write(question);
  muted = true;
  const answer = await new Promise((resolve) => rl.question('', resolve));
  muted = false;
  process.stdout.write('\n');
  return answer;
}

async function askNewPassword() {
  for (;;) {
    const password = await askHidden(`New password (at least ${MIN_PASSWORD} characters): `);
    if (password.length < MIN_PASSWORD) {
      console.log(`  Too short. Use at least ${MIN_PASSWORD} characters.`);
      continue;
    }
    if (password !== (await askHidden('Repeat the password: '))) {
      console.log('  The passwords did not match. Try again.');
      continue;
    }
    return password;
  }
}

async function main() {
  console.log('\nCardHub admin account setup\n');
  const email = (await ask('Admin email (e.g. you@gmail.com): ')).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('That is not a valid email address.');

  const existing = await userRepository.findByEmail(email);
  let userId;
  let action;

  if (existing) {
    console.log(`\nFound an existing account: ${existing.name} (role: ${existing.role}, status: ${existing.status}).`);
    const confirm = await ask(existing.role === ROLES.ADMIN ? 'It is already an admin. Continue to update it? (y/N): ' : 'Promote it to admin? Its data is kept. (y/N): ');
    if (!/^y(es)?$/i.test(confirm)) {
      console.log('No changes made.');
      return;
    }
    await pool.query("UPDATE users SET role = ?, status = 'active' WHERE id = ?", [ROLES.ADMIN, existing.id]);
    const reset = await ask('Set a new password for it? (y/N): ');
    if (/^y(es)?$/i.test(reset)) {
      await userRepository.updatePassword(existing.id, await hashPassword(await askNewPassword()));
      await refreshTokenRepository.revokeAllForUser(existing.id);
      console.log('  Password updated; existing sessions were signed out.');
    }
    userId = existing.id;
    action = 'admin.account_promoted_cli';
  } else {
    const name = (await ask('Full name: ')) || 'CardHub Admin';
    const password = await askNewPassword();
    const created = await userRepository.create({ name: name.slice(0, 120), email, passwordHash: await hashPassword(password), role: ROLES.ADMIN });
    userId = created.id;
    action = 'admin.account_created_cli';
  }

  await auditLogRepository.record({ userId, action, entityType: 'user', entityId: userId, metadata: { via: 'scripts/create-admin.js' } });
  const user = await userRepository.findById(userId);
  console.log(`\nDone. ${user.email} is now role "${user.role}" (status: ${user.status}).`);
  console.log('Sign in at https://cardhub.co.tz/admin/login\n');
}

main()
  .catch((error) => {
    console.error(`\nAdmin setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await pool.end().catch(() => {});
  });
