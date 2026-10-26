/**
 * Compares the Beem WhatsApp settings of CardHub and Card Generator WITHOUT
 * printing any secret. Run ON THE SERVER, from backend/:
 *
 *   npm run whatsapp:compare -- <cardhub env> <card-generator env>
 *
 *   npm run whatsapp:compare -- .env /var/www/<card-generator>/server/.env
 *
 * Either argument may also be a running process's environment, which is what
 * PM2 actually started it with (read as root):
 *
 *   sudo cat /proc/$(pm2 pid cardhub-api)/environ > /tmp/ch.env   # NUL-separated; handled
 *
 * Keys, secrets and sender numbers are reported only as set / match / DIFFERENT.
 * Template ids, endpoints and auth modes are not secrets and are shown.
 */
import fs from 'node:fs';
import dotenv from 'dotenv';

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.log('usage: npm run whatsapp:compare -- <cardhub env file> <card-generator env file>');
  process.exit(1);
}

function load(file) {
  const raw = fs.readFileSync(file, 'utf8');
  // /proc/<pid>/environ separates entries with NUL instead of newlines.
  return dotenv.parse(raw.includes('\0') ? raw.split('\0').join('\n') : raw);
}

const digits = (v) => String(v || '').replace(/\D/g, '').replace(/^0(?=[67]\d{8}$)/, '255');
const first = (e, ...keys) => keys.map((k) => (e[k] || '').trim()).find(Boolean) || '';

// Each app's effective value, as its own code reads it:
//   CardHub (backend/src/config/env.js) falls back to the SMS key pair when no WhatsApp pair is set.
//   Card Generator (server/config/whatsapp.js) has no fallback but accepts two sender aliases.
const cardhub = load(fileA);
const generator = load(fileB);
const effective = {
  cardhub: {
    key: first(cardhub, 'BEEM_WHATSAPP_API_KEY', 'BEEM_API_KEY'),
    secret: first(cardhub, 'BEEM_WHATSAPP_API_SECRET', 'BEEM_SECRET_KEY'),
    keySource: cardhub.BEEM_WHATSAPP_API_KEY ? 'BEEM_WHATSAPP_API_KEY' : cardhub.BEEM_API_KEY ? 'BEEM_API_KEY (SMS fallback)' : '(none)',
    from: digits(first(cardhub, 'BEEM_WHATSAPP_FROM')),
    templateId: first(cardhub, 'BEEM_WHATSAPP_TEMPLATE_ID'),
    url: first(cardhub, 'BEEM_WHATSAPP_API_URL'),
    auth: first(cardhub, 'BEEM_WHATSAPP_AUTH_MODE') || 'basic',
    media: first(cardhub, 'BEEM_WHATSAPP_TEMPLATE_MEDIA') || 'none',
  },
  generator: {
    key: first(generator, 'BEEM_WHATSAPP_API_KEY'),
    secret: first(generator, 'BEEM_WHATSAPP_API_SECRET'),
    keySource: generator.BEEM_WHATSAPP_API_KEY ? 'BEEM_WHATSAPP_API_KEY' : '(none)',
    from: digits(first(generator, 'BEEM_WHATSAPP_FROM', 'BEEM_WHATSAPP_FROM_ADDR', 'BEEM_WHATSAPP_SENDER_ID')),
    templateId: first(generator, 'BEEM_WHATSAPP_TEMPLATE_ID'),
    url: first(generator, 'BEEM_WHATSAPP_API_URL') || 'https://apibroadcast.beem.africa/v1/broadcast/template/api-send',
    auth: first(generator, 'BEEM_WHATSAPP_AUTH_MODE') || 'basic',
    // Card Generator sends the guest's card image whenever one exists (WhatsAppService.js, includeMedia = true).
    media: 'image (when the guest has a card)',
  },
};

const secretRow = (label, a, b) => {
  const state = !a || !b ? `${a ? 'set' : 'MISSING'} / ${b ? 'set' : 'MISSING'}` : a === b ? 'match' : 'DIFFERENT';
  console.log(`  ${label.padEnd(26)} ${state}`);
};
const plainRow = (label, a, b) => console.log(`  ${label.padEnd(26)} ${a === b ? 'same' : 'DIFFERENT'}   cardhub: ${a || '(none)'}   card-generator: ${b || '(none)'}`);
const host = (u) => {
  try {
    const url = new URL(u);
    return url.host + url.pathname;
  } catch {
    return u;
  }
};

const { cardhub: a, generator: b } = effective;
console.log(`\nBeem WhatsApp: CardHub (${fileA}) vs Card Generator (${fileB})\n`);
secretRow('API key', a.key, b.key);
secretRow('API secret', a.secret, b.secret);
console.log(`  ${'key source'.padEnd(26)} cardhub: ${a.keySource}   card-generator: ${b.keySource}`);
secretRow('sender (from_addr)', a.from, b.from);
plainRow('template id', a.templateId, b.templateId);
plainRow('send endpoint', host(a.url), host(b.url));
plainRow('auth mode', a.auth, b.auth);
console.log(`  ${'template header'.padEnd(26)} cardhub: ${a.media}   card-generator: ${b.media}`);
console.log('\nOnly match/DIFFERENT is shown for keys, secrets and sender; no value was printed.\n');
