// Configuration loading — run in child processes so each case gets a fresh environment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROVIDER = path.join(BACKEND, 'src/services/providers/whatsappProvider.js');

/** Imports the provider in a clean child process and returns describeConfig(). */
function describe(extraEnv, { cwd = BACKEND } = {}) {
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, CARDHUB_ENV_FILE: path.join(os.tmpdir(), 'cardhub-none'), ...extraEnv };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const script = `import(${JSON.stringify(new URL(`file:///${PROVIDER.replace(/\\/g, '/')}`).href)}).then(({ whatsappProvider: p }) => console.log(JSON.stringify({ ...p.describeConfig(), usesTemplate: p.usesTemplate, missingFields: p.missingFields })))`;
  const out = execFileSync(process.execPath, ['-e', script], { cwd, env, encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}

const BASE = {
  BEEM_WHATSAPP_API_URL: 'https://apibroadcast.example.test/v1/broadcast/template/api-send',
  BEEM_WHATSAPP_API_KEY: 'k',
  BEEM_WHATSAPP_API_SECRET: 's',
  BEEM_WHATSAPP_FROM: '255700000001',
  BEEM_WHATSAPP_TEMPLATE_ID: '1859',
};

test('fully configured -> template mode on with the configured id', () => {
  const cfg = describe(BASE);
  assert.equal(cfg.usesTemplate, true);
  assert.equal(cfg.templateId, '1859');
});

test('missing configuration is named exactly and nothing is sent', () => {
  const cfg = describe({ ...BASE, BEEM_WHATSAPP_FROM: undefined, BEEM_WHATSAPP_TEMPLATE_ID: undefined });
  assert.equal(cfg.usesTemplate, false);
  assert.ok(cfg.missingFields.includes('BEEM_WHATSAPP_FROM'));
  assert.ok(cfg.missingFields.includes('BEEM_WHATSAPP_TEMPLATE_ID'));
});

test('non-numeric template id is rejected, never guessed', () => {
  const cfg = describe({ ...BASE, BEEM_WHATSAPP_TEMPLATE_ID: '18 59' });
  assert.equal(cfg.usesTemplate, false);
  assert.equal(cfg.templateIdValid, false);
  assert.ok(cfg.missingFields.some((m) => /whole number/.test(m)));
});

test('template header defaults to text; an unknown value is rejected, never guessed', () => {
  assert.equal(describe(BASE).templateMedia, 'none');
  assert.equal(describe(BASE).includesMedia, false);
  const bad = describe({ ...BASE, BEEM_WHATSAPP_TEMPLATE_MEDIA: 'video' });
  assert.equal(bad.usesTemplate, false);
  assert.ok(bad.missingFields.some((m) => /BEEM_WHATSAPP_TEMPLATE_MEDIA/.test(m)));
});

test('key pair source: WhatsApp pair, or the SMS pair as fallback (names only)', () => {
  assert.equal(describe(BASE).credentialSource, 'BEEM_WHATSAPP_API_KEY');
  const fallback = describe({ ...BASE, BEEM_WHATSAPP_API_KEY: undefined, BEEM_WHATSAPP_API_SECRET: undefined, BEEM_API_KEY: 'sms-k', BEEM_SECRET_KEY: 'sms-s' });
  assert.equal(fallback.credentialSource, 'BEEM_API_KEY (SMS pair fallback)');
  assert.equal(JSON.stringify(fallback).includes('sms-s'), false);
});

test('backend/.env is found regardless of the working directory', () => {
  const cfg = describe({ ...BASE, CARDHUB_ENV_FILE: undefined }, { cwd: os.tmpdir() });
  assert.equal(path.normalize(cfg.envFile), path.join(BACKEND, '.env'));
});

test('whatsapp:compare reports match/DIFFERENT and never prints a key, secret or sender', () => {
  const ch = path.join(os.tmpdir(), `cardhub-cmp-a-${process.pid}`);
  const cg = path.join(os.tmpdir(), `cardhub-cmp-b-${process.pid}`);
  // CardHub file as a NUL-separated /proc/<pid>/environ dump, using the SMS-pair fallback.
  fs.writeFileSync(ch, ['BEEM_API_KEY=shared-key-111', 'BEEM_SECRET_KEY=sms-secret-222', 'BEEM_WHATSAPP_FROM=0706422927', 'BEEM_WHATSAPP_TEMPLATE_ID=1850', ''].join('\0'));
  fs.writeFileSync(cg, 'BEEM_WHATSAPP_API_KEY=shared-key-111\nBEEM_WHATSAPP_API_SECRET="wa-secret-333"\nBEEM_WHATSAPP_FROM=255706422927\nBEEM_WHATSAPP_TEMPLATE_ID=1850\n');
  try {
    const out = execFileSync(process.execPath, [path.join(BACKEND, 'scripts/compare-whatsapp-env.js'), ch, cg], { encoding: 'utf8' });
    for (const secret of ['shared-key-111', 'sms-secret-222', 'wa-secret-333', '706422927']) assert.equal(out.includes(secret), false, `printed ${secret}`);
    assert.match(out, /API key\s+match/);
    assert.match(out, /API secret\s+DIFFERENT/);
    assert.match(out, /BEEM_API_KEY \(SMS fallback\)/);
    assert.match(out, /sender \(from_addr\)\s+match/);
    assert.match(out, /template id\s+same\s+cardhub: 1850/);
  } finally {
    fs.rmSync(ch, { force: true });
    fs.rmSync(cg, { force: true });
  }
});

test('a stale process environment overriding the .env file is detected (names only)', () => {
  const file = path.join(os.tmpdir(), `cardhub-env-${process.pid}`);
  fs.writeFileSync(file, 'BEEM_WHATSAPP_TEMPLATE_ID=1859\nBEEM_WHATSAPP_FROM=255700000001\n');
  try {
    const fromFile = describe({ ...BASE, BEEM_WHATSAPP_TEMPLATE_ID: undefined, BEEM_WHATSAPP_FROM: undefined, CARDHUB_ENV_FILE: file }, { cwd: os.tmpdir() });
    assert.equal(fromFile.envFileLoaded, true);
    assert.equal(fromFile.templateId, '1859');
    assert.deepEqual(fromFile.overriddenByProcessEnv, []);

    const stale = describe({ ...BASE, BEEM_WHATSAPP_TEMPLATE_ID: '1850', BEEM_WHATSAPP_FROM: undefined, CARDHUB_ENV_FILE: file });
    assert.equal(stale.templateId, '1850', 'the process environment wins (dotenv does not override)');
    assert.deepEqual(stale.overriddenByProcessEnv, ['BEEM_WHATSAPP_TEMPLATE_ID']);
  } finally {
    fs.rmSync(file, { force: true });
  }
});
