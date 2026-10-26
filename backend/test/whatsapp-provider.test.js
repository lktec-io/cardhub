// Beem WhatsApp template provider — mocked fetch, never a real send.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

const KEY = 'unit-key';
const SECRET = 'unit-secret';
const SEND_URL = 'https://apibroadcast.example.test/v1/broadcast/template/api-send';
Object.assign(process.env, {
  CARDHUB_ENV_FILE: path.join(os.tmpdir(), `cardhub-no-env-${process.pid}`), // isolate from any local .env
  WHATSAPP_PROVIDER: '',
  BEEM_WHATSAPP_API_URL: SEND_URL,
  BEEM_WHATSAPP_API_KEY: KEY,
  BEEM_WHATSAPP_API_SECRET: SECRET,
  BEEM_WHATSAPP_FROM: '0700000001', // local format on purpose
  BEEM_WHATSAPP_TEMPLATE_ID: '1859',
  BEEM_WHATSAPP_TIMEOUT_MS: '200',
  BEEM_WHATSAPP_RATE_PER_SECOND: '1000',
});

let provider;
let templates;
const calls = [];
let respond;

before(async () => {
  ({ whatsappProvider: provider } = await import('../src/services/providers/whatsappProvider.js'));
  templates = await import('../src/utils/messageTemplates.js');
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: init?.body ? JSON.parse(init.body) : null });
    return respond(url, init);
  };
});
beforeEach(() => {
  calls.length = 0;
});

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const params = () =>
  templates.buildInvitationTemplateParams({
    guestName: 'Amina  Juma',
    eventName: 'Harusi ya Amina',
    eventDate: '2026-12-12',
    eventTime: '16:30',
    venue: 'Serena Hotel',
    publicUrl: 'https://cardhub.co.tz/card/abc',
  });

test('six template values in the approved order {{0}}..{{5}}', () => {
  assert.deepEqual(params(), ['Amina Juma', 'Harusi ya Amina', '12 December 2026', '04:30 PM', 'Serena Hotel', 'https://cardhub.co.tz/card/abc']);
  assert.equal(templates.INVITATION_TEMPLATE_VARIABLES.length, 6);
});

test('template id comes from configuration and the sender is sent in international digits', async () => {
  const { buildBeemTemplateBody } = await import('../src/services/providers/whatsappProvider.js');
  const body = buildBeemTemplateBody('+255674022265', params());
  assert.deepEqual(body, {
    from_addr: '255700000001',
    destination_addr: [{ phoneNumber: '255674022265', params: params() }],
    channel: 'whatsapp',
    messageTemplateData: { id: 1859 },
  });
  assert.equal('content' in body, false, 'no media header is sent for this text template');
  assert.equal(provider.templateId, '1859');
});

test('accepted by Beem -> "queued" with the jobId, never "sent"/"delivered"; one request, Basic auth', async () => {
  respond = () => json(200, { data: { statusCode: 200, successful: true, message: 'ok', jobId: 'job-123' } });
  const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: params() });
  assert.equal(result.status, 'queued');
  assert.equal(result.providerMessageId, 'job-123');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, SEND_URL);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`);
});

test('HTTP 400 template/channel mismatch -> failed with an actionable reason, no retry', async () => {
  respond = () => json(400, { statusCode: '400', error_code: 'API_INVALID_PARAMETER', message: 'Template id and channel do not match. Contact support if the issue persists.' });
  const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: params() });
  assert.equal(result.status, 'failed');
  assert.equal(result.httpStatus, 400);
  assert.match(result.error, /do not match.*BEEM_WHATSAPP_TEMPLATE_ID/);
  assert.equal(calls.length, 1, 'a rejected send is not retried');
});

test('HTTP 200 with successful:false is a rejection, not acceptance', async () => {
  respond = () => json(200, { data: { successful: false, message: 'Insufficient balance' } });
  const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: params() });
  assert.equal(result.status, 'failed');
  assert.match(result.error, /Insufficient balance/);
});

test('timeout -> failed after BEEM_WHATSAPP_TIMEOUT_MS, exactly one attempt', async () => {
  respond = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
  // AbortSignal.timeout's timer doesn't hold the event loop open (the real server's listener does).
  const keepAlive = setTimeout(() => {}, 5000);
  const started = Date.now();
  const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: params() });
  clearTimeout(keepAlive);
  assert.equal(result.status, 'failed');
  assert.match(result.error, /no response from Beem within 200 ms/);
  assert.ok(Date.now() - started < 2000);
  assert.equal(calls.length, 1);
});

test('network failure -> failed, no retry', async () => {
  respond = () => Promise.reject(new TypeError('fetch failed'));
  const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: params() });
  assert.equal(result.status, 'failed');
  assert.match(result.error, /network error/);
  assert.equal(calls.length, 1);
});

test('invalid recipient or empty required value -> refused before any request', async () => {
  respond = () => json(200, { data: { successful: true, jobId: 'x' } });
  const badPhone = await provider.sendInvitationTemplate({ to: '12', params: params() });
  assert.equal(badPhone.status, 'failed');
  assert.match(badPhone.error, /recipient/);
  const noGuest = await provider.sendInvitationTemplate({ to: '+255674022265', params: ['', ...params().slice(1)] });
  assert.equal(noGuest.status, 'failed');
  assert.match(noGuest.error, /\{\{0\}\} \(guest name\) is empty/);
  const fiveValues = await provider.sendInvitationTemplate({ to: '+255674022265', params: params().slice(0, 5) });
  assert.match(fiveValues.error, /needs 6 values/);
  assert.equal(calls.length, 0);
});

test('describeConfig reports the effective settings without secrets', () => {
  const cfg = provider.describeConfig();
  const text = JSON.stringify(cfg);
  assert.equal(text.includes(KEY), false);
  assert.equal(text.includes(SECRET), false);
  assert.equal(cfg.templateId, '1859');
  assert.equal(cfg.templateIdValid, true);
  assert.equal(cfg.sender, '2557******01');
  assert.equal(cfg.senderFormatOk, true);
  assert.equal(cfg.templateParams, 6);
  assert.equal(cfg.includesMedia, false);
  assert.equal(cfg.sendEndpoint, 'apibroadcast.example.test/v1/broadcast/template/api-send');
});
