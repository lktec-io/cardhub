// Image-header template (BEEM_WHATSAPP_TEMPLATE_MEDIA=image) — mocked fetch, never a real send.
// Its own file so the provider loads with this configuration (node --test runs each file in a separate process).
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

const SEND_URL = 'https://apibroadcast.example.test/v1/broadcast/template/api-send';
Object.assign(process.env, {
  CARDHUB_ENV_FILE: path.join(os.tmpdir(), `cardhub-no-env-${process.pid}`),
  WHATSAPP_PROVIDER: '',
  BEEM_WHATSAPP_API_URL: SEND_URL,
  BEEM_WHATSAPP_API_KEY: 'unit-key',
  BEEM_WHATSAPP_API_SECRET: 'unit-secret',
  BEEM_WHATSAPP_FROM: '255700000001',
  BEEM_WHATSAPP_TEMPLATE_ID: '1850',
  BEEM_WHATSAPP_TEMPLATE_MEDIA: 'image',
  BEEM_WHATSAPP_TIMEOUT_MS: '200',
  BEEM_WHATSAPP_RATE_PER_SECOND: '1000',
});

const CARD = 'https://cardhub.example.test/api/v1/media/cards/2026/card.png';
const PARAMS = ['Amina Juma', 'Harusi ya Amina', '12 December 2026', '04:30 PM', 'Serena Hotel', 'https://cardhub.co.tz/card/abc'];

let provider;
let build;
const calls = [];
let respond;

before(async () => {
  const mod = await import('../src/services/providers/whatsappProvider.js');
  provider = mod.whatsappProvider;
  build = mod.buildBeemTemplateBody;
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return respond();
  };
});
beforeEach(() => {
  calls.length = 0;
});

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('body matches the shape Card Generator sends for template 1850 (content.mediaUrl, numeric id)', () => {
  // card-generator/server/services/whatsapp/BeemWhatsAppProvider.js buildPayload(), for a guest with a card.
  const cardGeneratorShape = {
    from_addr: '255700000001',
    destination_addr: [{ phoneNumber: '255674022265', params: PARAMS }],
    channel: 'whatsapp',
    messageTemplateData: { id: 1850 },
    content: { mediaUrl: CARD },
  };
  assert.deepEqual(build('+255674022265', PARAMS, CARD), cardGeneratorShape);
});

test('image header: sends exactly one request carrying the card image', async () => {
  respond = () => json(200, { data: { successful: true, jobId: 'job-9' } });
  const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: PARAMS, mediaUrl: CARD });
  assert.equal(result.status, 'queued');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.content.mediaUrl, CARD);
});

test('image header without a public HTTPS image -> refused locally, nothing sent', async () => {
  respond = () => json(200, { data: { successful: true, jobId: 'x' } });
  for (const mediaUrl of [undefined, null, 'http://cardhub.example.test/card.png', '/api/v1/media/cards/card.png']) {
    const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: PARAMS, mediaUrl });
    assert.equal(result.status, 'failed');
    assert.match(result.error, /public HTTPS card image/);
  }
  assert.equal(calls.length, 0);
});

test('a 400 mismatch is still reported as Beem sent it, with no retry', async () => {
  respond = () => json(400, { statusCode: '400', error_code: 'API_INVALID_PARAMETER', message: 'Template id and channel do not match. Contact support if the issue persists.' });
  const result = await provider.sendInvitationTemplate({ to: '+255674022265', params: PARAMS, mediaUrl: CARD });
  assert.equal(result.status, 'failed');
  assert.equal(result.httpStatus, 400);
  assert.match(result.error, /^Template id and channel do not match/);
  assert.match(result.providerResponse, /API_INVALID_PARAMETER/);
  assert.equal(calls.length, 1);
});

test('diagnostics report the header mode and the key pair in use, no secrets', () => {
  const cfg = provider.describeConfig();
  assert.equal(cfg.templateMedia, 'image');
  assert.equal(cfg.includesMedia, true);
  assert.equal(cfg.credentialSource, 'BEEM_WHATSAPP_API_KEY');
  assert.equal(JSON.stringify(cfg).includes('unit-secret'), false);
});
