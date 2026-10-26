import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { normalizePhoneForDelivery } from '../../utils/phone.js';

const PROVIDER_META = 'meta';
const PROVIDER_BEEM = 'beem';

const selectedProvider = env.whatsapp.provider;

const isMetaConfigured = Boolean(selectedProvider === PROVIDER_META && env.whatsapp.accessToken && env.whatsapp.phoneNumberId);
const isBeemConfigured = Boolean(
  selectedProvider === PROVIDER_BEEM && env.sms.apiKey && env.sms.secretKey && env.whatsapp.beemFrom
);

/** Names exactly which env vars are missing for whichever provider is selected — see smsProvider.js's missingFields for the same reasoning. */
function missingFieldsFor() {
  if (selectedProvider === PROVIDER_BEEM) {
    const missing = [];
    if (!env.sms.apiKey) missing.push('BEEM_API_KEY');
    if (!env.sms.secretKey) missing.push('BEEM_SECRET_KEY');
    if (!env.whatsapp.beemFrom) missing.push('BEEM_WHATSAPP_FROM');
    return missing;
  }
  if (selectedProvider === PROVIDER_META) {
    const missing = [];
    if (!env.whatsapp.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
    if (!env.whatsapp.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    return missing;
  }
  return ['WHATSAPP_PROVIDER'];
}

// ---------------------------------------------------------------------
// Beem WhatsApp ("Moja" multi-channel messaging API). CardHub's chosen
// WhatsApp transport for Phase 2. Reverse-engineered from Beem's own
// published sample (beem.africa/conversational-api/) cross-checked
// against the open-source gowelle/laravel-beem-africa client, since
// docs.beem.africa's own page is JS-rendered and didn't return static
// content — never fabricated. Endpoint, auth, and body shape:
//
//   POST https://apichatcore.beem.africa/v1/chatapi
//   Authorization: Basic base64(BEEM_API_KEY:BEEM_SECRET_KEY)  — the
//     SAME account credential pair as smsProvider.js, not a separate
//     WhatsApp secret.
//   { from, to, channel: "whatsapp", message_type: "text"|"image",
//     text?, image?: { mime_type, url }, transaction_id? }
//
// IMPORTANT — this only covers session/direct messages. Like every
// WhatsApp Business Solution Provider, Beem enforces Meta's rule that a
// business can only free-form-message a customer within 24h of that
// customer's own last message; a cold, business-initiated first contact
// (exactly what a CardHub invitation is) requires a pre-approved message
// TEMPLATE sent via Beem's separate broadcast endpoint
// (`/v1/broadcast/template/api-send`) instead. That endpoint needs a
// real, already-approved template name/language/parameter shape from
// your Beem/Meta WhatsApp Business setup — invented here, it would just
// be a second flavor of fabrication, so it isn't implemented yet. If
// direct sends below come back with a "session"/404-style error, that's
// this exact restriction — send the approved template's details and
// sendCardMessage/sendCardImage can be pointed at the broadcast endpoint
// instead without any caller needing to change.
// ---------------------------------------------------------------------
const BEEM_CHATAPI_URL = 'https://apichatcore.beem.africa/v1/chatapi';

async function sendViaBeem(body) {
  const credentials = Buffer.from(`${env.sms.apiKey}:${env.sms.secretKey}`).toString('base64');

  let response;
  try {
    response = await fetch(BEEM_CHATAPI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.whatsapp.beemFrom, transaction_id: randomUUID(), ...body }),
    });
  } catch (error) {
    logger.error('Beem WhatsApp request failed', { message: error.message });
    return { status: 'failed', provider: PROVIDER_BEEM, providerMessageId: null, error: `network error: ${error.message}` };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const bodyText = JSON.stringify(data)?.slice(0, 500);
    logger.error('Beem WhatsApp send rejected', { statusCode: response.status, body: bodyText });
    const isSessionIssue = response.status === 404 || /session/i.test(data?.message || '');
    const message = isSessionIssue
      ? 'No active WhatsApp session with this recipient — a template message is required for a first contact (see whatsappProvider.js comment)'
      : data?.message || `Beem rejected the request (HTTP ${response.status})`;
    return { status: 'failed', provider: PROVIDER_BEEM, providerMessageId: null, error: message };
  }

  // Beem's Moja API returns a minimal { message: "success" } shape on
  // success with no dedicated message id in the documented sample — only
  // surface an id if one is genuinely present, never invent one.
  const providerMessageId = data?.id ?? data?.message_id ?? data?.transaction_id ?? null;
  return { status: 'queued', provider: PROVIDER_BEEM, providerMessageId, error: null };
}

// ---------------------------------------------------------------------
// Beem approved-TEMPLATE messages — what a first-contact invitation needs.
// Contract from Beem's Moja docs (docs.beem.africa, "Send template message"
// and "List message templates"):
//
//   POST https://apibroadcast.beem.africa/v1/broadcast/template/api-send
//   { from_addr, channel: "whatsapp",
//     destination_addr: [{ phoneNumber, params: [...] }],
//     messageTemplateData: { id: <integer> } }
//   200 -> { data: { successful, message, jobId, validation, credits } }
//   400 -> { statusCode, message } e.g. "Template id and channel do not match"
//
// messageTemplateData.id is BEEM's template id (the `id` returned by
// GET https://apichatcore.beem.africa/v1/message-templates/list), not
// Meta's `template_id`, and it must belong to the WhatsApp channel that
// `from_addr` (BEEM_WHATSAPP_FROM) is. `params` replace the template's
// placeholders in the order they appear, so the array order is what
// matters (see buildInvitationTemplateParams()). Language is fixed by the
// approved template and isn't sent.
// Auth: Basic base64(key:secret), or the access token sent as
// `Authorization: <token>` with NO "Bearer" prefix (Beem's docs).
// ---------------------------------------------------------------------
const beemTemplate = env.whatsapp.beem;
const isBeemTemplateConfigured = Boolean(
  selectedProvider === PROVIDER_BEEM && beemTemplate.apiUrl && beemTemplate.apiKey && (beemTemplate.apiSecret || usesTokenAuth()) && env.whatsapp.beemFrom && beemTemplate.templateId
);

function usesTokenAuth() {
  return beemTemplate.authMode === 'token' || beemTemplate.authMode === 'bearer';
}

function missingTemplateFields() {
  const missing = [];
  if (!beemTemplate.apiUrl) missing.push('BEEM_WHATSAPP_API_URL');
  if (!beemTemplate.apiKey) missing.push('BEEM_WHATSAPP_API_KEY');
  if (!beemTemplate.apiSecret && !usesTokenAuth()) missing.push('BEEM_WHATSAPP_API_SECRET');
  if (!env.whatsapp.beemFrom) missing.push('BEEM_WHATSAPP_FROM');
  if (!beemTemplate.templateId) missing.push('BEEM_WHATSAPP_TEMPLATE_ID');
  return missing;
}

const digitsOnly = (phone) => String(phone || '').replace(/\D/g, '');

/**
 * Beem identifies the WhatsApp channel by the sender number exactly as
 * registered (international digits, e.g. 2557XXXXXXXX). A local "07…" or
 * "+255 7…" value in BEEM_WHATSAPP_FROM would not match the channel that owns
 * the template ("Template id and channel do not match"), so both sender and
 * recipient are normalised the same way.
 */
export function toBeemNumber(phone) {
  const e164 = normalizePhoneForDelivery(String(phone || ''));
  return e164 ? e164.replace(/^\+/, '') : digitsOnly(phone);
}
/** For logs only: "+255712345678" -> "2557******78". */
export const maskPhoneForLog = (phone) => {
  const d = digitsOnly(phone);
  return d.length > 6 ? `${d.slice(0, 4)}${'*'.repeat(d.length - 6)}${d.slice(-2)}` : '***';
};

function beemAuthHeader() {
  // "token"/"bearer": Beem wants the raw token, no "Bearer " prefix.
  if (usesTokenAuth()) return beemTemplate.apiKey;
  return `Basic ${Buffer.from(`${beemTemplate.apiKey}:${beemTemplate.apiSecret}`).toString('base64')}`;
}

// Simple pacing so bulk sends stay under BEEM_WHATSAPP_RATE_PER_SECOND.
let nextSlot = 0;
async function waitForRateSlot() {
  const interval = 1000 / Math.max(1, beemTemplate.ratePerSecond);
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + interval;
  if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
}

/** Strips anything that looks like a credential before a provider body is logged or shown. */
function sanitizeProviderBody(data) {
  if (data === null || data === undefined) return null;
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return text
    .replace(/"(api_?key|secret|token|authorization|password)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"')
    .slice(0, 500);
}

/** `endpoint`: 'send' (BEEM_WHATSAPP_API_URL) or 'list' (BEEM_WHATSAPP_TEMPLATES_URL), so the hint names the right setting. */
function beemErrorMessage(status, data, endpoint = 'send') {
  const detail = data?.data?.message || data?.message || data?.error?.message || data?.error;
  const base = typeof detail === 'string' && detail ? detail : `Beem rejected the request (HTTP ${status})`;
  if (status === 401 || status === 403) return `${base} — check BEEM_WHATSAPP_API_KEY/SECRET and BEEM_WHATSAPP_AUTH_MODE`;
  if ((status === 404 || status === 405) && endpoint === 'list') {
    return `${base} — the template-list endpoint is not available to this account (this does NOT mean the template is missing; the send itself is the authoritative check)`;
  }
  if (status === 404 || status === 405) return `${base} — check BEEM_WHATSAPP_API_URL`;
  if (/template id and channel do not match/i.test(base)) {
    return `${base} — BEEM_WHATSAPP_TEMPLATE_ID must be Beem's template id for the sender in BEEM_WHATSAPP_FROM; run: npm run whatsapp:test -- --templates`;
  }
  if (/channel settings/i.test(base)) return `${base} — BEEM_WHATSAPP_FROM is not a WhatsApp sender on this Beem account`;
  return base;
}

const TEMPLATE_PARAM_NAMES = ['guest name', 'event name', 'event date', 'event time', 'venue', 'invitation URL'];

/** The approved template has exactly six variables and WhatsApp rejects empty ones; checked before any request. */
export function validateTemplateParams(to, params) {
  if (!/^255[67]\d{8}$|^[1-9]\d{9,14}$/.test(toBeemNumber(to))) return 'recipient phone number is not a valid international number';
  if (!Array.isArray(params) || params.length !== TEMPLATE_PARAM_NAMES.length) return `template needs ${TEMPLATE_PARAM_NAMES.length} values, got ${Array.isArray(params) ? params.length : 0}`;
  const empty = params.findIndex((p) => typeof p !== 'string' || !p.trim());
  if (empty !== -1) return `template value {{${empty}}} (${TEMPLATE_PARAM_NAMES[empty]}) is empty`;
  if (!/^https?:\/\/\S+$/.test(params[5])) return 'template value {{5}} (invitation URL) is not a URL';
  return null;
}

async function readJson(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return raw;
  }
}

async function sendBeemTemplate({ to, params, transactionId = randomUUID() }) {
  const body = {
    from_addr: toBeemNumber(env.whatsapp.beemFrom),
    destination_addr: [{ phoneNumber: toBeemNumber(to), params: params.map((p) => String(p)) }],
    channel: 'whatsapp',
    messageTemplateData: { id: Number(beemTemplate.templateId) },
  };
  await waitForRateSlot();

  let response;
  try {
    response = await fetch(beemTemplate.apiUrl, {
      method: 'POST',
      headers: { Authorization: beemAuthHeader(), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(beemTemplate.timeoutMs),
    });
  } catch (error) {
    const reason = error.name === 'TimeoutError' ? `no response from Beem within ${beemTemplate.timeoutMs} ms` : `network error: ${error.message}`;
    logger.error('Beem WhatsApp template request failed', { to: maskPhoneForLog(to), templateId: beemTemplate.templateId, reason });
    return { status: 'failed', provider: PROVIDER_BEEM, providerMessageId: null, error: reason, httpStatus: null, providerResponse: null };
  }

  const data = await readJson(response);
  const providerResponse = sanitizeProviderBody(data);
  // Beem documents { data: { successful, jobId } }; an HTTP 200 with successful:false is still a rejection.
  const result = data && typeof data === 'object' ? data.data ?? data : null;
  const bodySaysFailed = result && typeof result === 'object' && (result.successful === false || result.success === false || result.status === 'failed');

  if (!response.ok || bodySaysFailed) {
    const error = beemErrorMessage(response.status, data);
    logger.error('Beem WhatsApp template rejected', { to: maskPhoneForLog(to), templateId: beemTemplate.templateId, httpStatus: response.status, body: providerResponse });
    return { status: 'failed', provider: PROVIDER_BEEM, providerMessageId: null, error, httpStatus: response.status, providerResponse };
  }

  // Accepted for sending (a broadcast job), not delivered. jobId is what delivery reports carry as broadcast_id.
  const providerMessageId = result?.jobId ?? result?.job_id ?? result?.id ?? data?.request_id ?? null;
  logger.info('Beem WhatsApp template accepted', { to: maskPhoneForLog(to), templateId: beemTemplate.templateId, httpStatus: response.status, providerMessageId, transactionId });
  return { status: 'queued', provider: PROVIDER_BEEM, providerMessageId: providerMessageId ? String(providerMessageId) : null, error: null, httpStatus: response.status, providerResponse };
}

/**
 * Read-only: Beem's approved templates (GET message-templates/list). With
 * `channelNumber` set, Beem returns only templates on that sender channel,
 * which is exactly what "Template id and channel do not match" checks.
 * Returns { ok, httpStatus, templates: [{ id, metaTemplateId, name, category, status, language, placeholders, content }], error }.
 */
async function listBeemTemplates({ q, id, channelNumber, limit = 50 } = {}) {
  const url = new URL(beemTemplate.templatesUrl);
  if (q) url.searchParams.set('q', q);
  if (id) url.searchParams.set('id', String(id));
  if (channelNumber) url.searchParams.set('channel_number', toBeemNumber(channelNumber));
  url.searchParams.set('limit', String(limit));
  let response;
  try {
    response = await fetch(url, { headers: { Authorization: beemAuthHeader(), Accept: 'application/json' }, signal: AbortSignal.timeout(beemTemplate.timeoutMs) });
  } catch (error) {
    return { ok: false, httpStatus: null, templates: [], endpoint: `${url.host}${url.pathname}`, error: error.name === 'TimeoutError' ? 'timeout' : error.message };
  }
  const data = await readJson(response);
  if (!response.ok) {
    return { ok: false, httpStatus: response.status, templates: [], endpoint: `${url.host}${url.pathname}`, providerResponse: sanitizeProviderBody(data), error: beemErrorMessage(response.status, data, 'list') };
  }
  const rows = Array.isArray(data?.data) ? data.data : [];
  return {
    ok: true,
    httpStatus: response.status,
    templates: rows.map((t) => ({
      id: t.id,
      metaTemplateId: t.template_id ?? null,
      name: t.name,
      category: t.category,
      status: t.status,
      language: t.language,
      content: typeof t.content === 'string' ? t.content : '',
      placeholders: typeof t.content === 'string' ? (t.content.match(/\{\{\s*\d+\s*\}\}/g) || []).length : null,
    })),
    error: null,
  };
}

// ---------------------------------------------------------------------
// Meta WhatsApp Cloud API — kept as a real, working alternative transport
// (CardHub is standardized on Beem for Phase 2, but this isn't fabricated
// or removed in case that changes).
// ---------------------------------------------------------------------
function graphUrl() {
  return `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
}

/** Meta expects the recipient without a leading '+' (e.g. "255712345678"). */
function toGraphRecipient(e164) {
  return e164.startsWith('+') ? e164.slice(1) : e164;
}

async function sendViaMeta(body) {
  let response;
  try {
    response = await fetch(graphUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error('WhatsApp Cloud API request failed', { message: error.message });
    return { status: 'failed', provider: PROVIDER_META, providerMessageId: null, error: `network error: ${error.message}` };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    // Meta's error shape: { error: { message, type, code, error_subcode, fbtrace_id } }
    const message = data?.error?.message || `WhatsApp Cloud API rejected the request (HTTP ${response.status})`;
    logger.error('WhatsApp Cloud API send rejected', { statusCode: response.status, code: data?.error?.code });
    return { status: 'failed', provider: PROVIDER_META, providerMessageId: null, error: message };
  }

  const providerMessageId = data.messages?.[0]?.id ?? null;
  return { status: 'queued', provider: PROVIDER_META, providerMessageId, error: null };
}

function unavailable(provider, reason, to) {
  logger.warn('WhatsApp message unavailable', { provider, reason, to: maskPhoneForLog(to) });
  return { status: 'unavailable', provider, providerMessageId: null, error: reason };
}

/**
 * WhatsApp delivery — dispatches to whichever provider `WHATSAPP_PROVIDER`
 * selects ('beem' or 'meta'). No credentials exist in this environment
 * and none were invented; `isConfigured` gates every real request, so
 * every caller must still handle `{ status: 'unavailable' }` exactly like
 * every other provider in this codebase. Neither HTTP transport has been
 * exercised against a real account here — smoke-test before relying on
 * either in production, and see the Beem section's comment above for the
 * session/template caveat that a 401 or "session expired" error usually
 * means.
 *
 * Every branch returns the same normalized shape:
 *   { status, provider, providerMessageId, error }
 * `status: 'queued'` means the provider *accepted* the message — not that
 * the recipient received or read it. Delivery/read receipts arrive
 * asynchronously via a webhook this codebase does not implement yet.
 */
export const whatsappProvider = {
  isConfigured: isMetaConfigured || isBeemConfigured || isBeemTemplateConfigured,
  providerName: selectedProvider || PROVIDER_META,
  missingFields: isMetaConfigured || isBeemConfigured || isBeemTemplateConfigured ? [] : selectedProvider === PROVIDER_BEEM ? missingTemplateFields() : missingFieldsFor(),
  /** True when invitations go out as the approved Beem template (BEEM_WHATSAPP_TEMPLATE_ID). */
  usesTemplate: isBeemTemplateConfigured,
  templateId: isBeemTemplateConfigured ? beemTemplate.templateId : null,

  /**
   * Approved-template invitation (Beem). `to` is E.164; `params` is the
   * template's variables in its approved order.
   */
  /** Read-only template lookup for npm run whatsapp:test (see listBeemTemplates). */
  listTemplates: listBeemTemplates,

  async sendInvitationTemplate({ to, params }) {
    if (!isBeemTemplateConfigured) return unavailable(PROVIDER_BEEM, `provider not configured (missing: ${missingTemplateFields().join(', ') || 'WHATSAPP_PROVIDER=beem'})`, maskPhoneForLog(to));
    const problem = validateTemplateParams(to, params);
    if (problem) {
      logger.warn('Beem WhatsApp template not sent: invalid payload', { to: maskPhoneForLog(to), templateId: beemTemplate.templateId, problem });
      return { status: 'failed', provider: PROVIDER_BEEM, providerMessageId: null, error: problem, httpStatus: null, providerResponse: null };
    }
    return sendBeemTemplate({ to, params });
  },

  /** payload: { to, message } — `to` must already be E.164-normalized (see utils/phone.js). */
  async sendCardMessage(payload) {
    if (selectedProvider === PROVIDER_BEEM) {
      if (!isBeemConfigured) return unavailable(PROVIDER_BEEM, 'provider not configured', payload?.to);
      return sendViaBeem({ to: payload.to, channel: 'whatsapp', message_type: 'text', text: payload.message });
    }
    if (!isMetaConfigured) return unavailable(PROVIDER_META, 'provider not configured', payload?.to);
    return sendViaMeta({
      messaging_product: 'whatsapp',
      to: toGraphRecipient(payload.to),
      type: 'text',
      text: { body: payload.message, preview_url: true },
    });
  },

  /** payload: { to, imageUrl, caption } — `imageUrl` must be a publicly reachable HTTPS URL the caller resolved server-side. */
  async sendCardImage(payload) {
    if (selectedProvider === PROVIDER_BEEM) {
      if (!isBeemConfigured) return unavailable(PROVIDER_BEEM, 'provider not configured', payload?.to);
      return sendViaBeem({
        to: payload.to,
        channel: 'whatsapp',
        message_type: 'image',
        image: { mime_type: 'image/jpeg', url: payload.imageUrl },
        // Beem's request DTO carries `text` alongside the media object
        // regardless of message_type, which reads as "caption" the same
        // way Meta's API pairs image+caption — not confirmed against a
        // real account, so verify the caption actually renders once
        // credentials are live; if Beem ignores it, drop this field.
        text: payload.caption,
      });
    }
    if (!isMetaConfigured) return unavailable(PROVIDER_META, 'provider not configured', payload?.to);
    return sendViaMeta({
      messaging_product: 'whatsapp',
      to: toGraphRecipient(payload.to),
      type: 'image',
      image: { link: payload.imageUrl, caption: payload.caption },
    });
  },
};
