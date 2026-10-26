// SMS must stay exactly as it was: its own Beem SMS endpoint, sender name and key pair.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

Object.assign(process.env, {
  CARDHUB_ENV_FILE: path.join(os.tmpdir(), `cardhub-no-env-${process.pid}`),
  BEEM_API_KEY: 'sms-key',
  BEEM_SECRET_KEY: 'sms-secret',
  BEEM_SENDER_ID: 'Clix Invite',
  BEEM_WHATSAPP_API_KEY: 'wa-key',
  BEEM_WHATSAPP_API_SECRET: 'wa-secret',
});

let smsProvider;
const calls = [];
before(async () => {
  ({ smsProvider } = await import('../src/services/providers/smsProvider.js'));
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ successful: true, request_id: 991, code: 100, message: 'Message Submitted Successfully', valid: 1, invalid: 0, duplicates: 0 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
});

test('SMS request is unchanged: apisms endpoint, source_addr sender name, digits recipient, SMS key pair', async () => {
  const result = await smsProvider.send({ to: '+255712345678', message: 'Habari' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://apisms.beem.africa/v1/send');
  assert.equal(calls[0].init.headers.Authorization, `Basic ${Buffer.from('sms-key:sms-secret').toString('base64')}`);
  assert.deepEqual(calls[0].body, { source_addr: 'Clix Invite', schedule_time: '', encoding: 0, message: 'Habari', recipients: [{ recipient_id: 1, dest_addr: '255712345678' }] });
  assert.equal(result.status, 'queued');
});
