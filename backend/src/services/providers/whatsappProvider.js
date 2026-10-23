import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

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
// Request shape from Beem's published WhatsApp API sample
// (beem.africa/whatsapp-api/):
//
//   { from_addr, channel: "whatsapp",
//     destination_addr: [{ phoneNumber, params: [...] }],
//     messageTemplateData: { id } }
//
// The endpoint is not printed in that sample, so it comes from the
// account's own BEEM_WHATSAPP_API_URL. Numbers are sent as digits without
// "+" (Beem's sample uses "2557…"). The template's language is fixed when
// Beem/Meta approve the template id, so it isn't sent (the sample has no
// language field). `params` order must match the approved template — see
// buildInvitationTemplateParams() in utils/messageTemplates.js.
// ---------------------------------------------------------------------
const beemTemplate = env.whatsapp.beem;
const isBeemTemplateConfigured = Boolean(
  selectedProvider === PROVIDER_BEEM && beemTemplate.apiUrl && beemTemplate.apiKey && beemTemplate.apiSecret && env.whatsapp.beemFrom && beemTemplate.templateId
);

function missingTemplateFields() {
  const missing = [];
  if (!beemTemplate.apiUrl) missing.push('BEEM_WHATSAPP_API_URL');
  if (!beemTemplate.apiKey) missing.push('BEEM_WHATSAPP_API_KEY');
  if (!beemTemplate.apiSecret) missing.push('BEEM_WHATSAPP_API_SECRET');
  if (!env.whatsapp.beemFrom) missing.push('BEEM_WHATSAPP_FROM');
  if (!beemTemplate.templateId) missing.push('BEEM_WHATSAPP_TEMPLATE_ID');
  return missing;
}

const digitsOnly = (phone) => String(phone || '').replace(/\D/g, '');
/** For logs only: "+255712345678" -> "2557******78". */
export const maskPhoneForLog = (phone) => {
  const d = digitsOnly(phone);
  return d.length > 6 ? `${d.slice(0, 4)}${'*'.repeat(d.length - 6)}${d.slice(-2)}` : '***';
};

function beemAuthHeader() {
  if (beemTemplate.authMode === 'bearer') return `Bearer ${beemTemplate.apiKey}`;
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

function beemErrorMessage(status, data) {
  const detail = data?.message || data?.error?.message || data?.error || data?.data?.message;
  const base = typeof detail === 'string' && detail ? detail : `Beem rejected the request (HTTP ${status})`;
  if (status === 401 || status === 403) return `${base} — check BEEM_WHATSAPP_API_KEY/SECRET and BEEM_WHATSAPP_AUTH_MODE`;
  if (status === 404 || status === 405) return `${base} — check BEEM_WHATSAPP_API_URL`;
  return base;
}

async function sendBeemTemplate({ to, params, transactionId = randomUUID() }) {
  const body = {
    from_addr: digitsOnly(env.whatsapp.beemFrom),
    destination_addr: [{ phoneNumber: digitsOnly(to), params: params.map((p) => String(p)) }],
    channel: 'whatsapp',
    messageTemplateData: { id: Number(beemTemplate.templateId) || beemTemplate.templateId },
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

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  const providerResponse = sanitizeProviderBody(data);
  // Beem can answer HTTP 200 with an error flag in the body; treat that as a rejection too.
  const bodySaysFailed = data && typeof data === 'object' && (data.successful === false || data.success === false || data.status === 'failed');

  if (!response.ok || bodySaysFailed) {
    const error = beemErrorMessage(response.status, data);
    logger.error('Beem WhatsApp template rejected', { to: maskPhoneForLog(to), templateId: beemTemplate.templateId, httpStatus: response.status, body: providerResponse });
    return { status: 'failed', provider: PROVIDER_BEEM, providerMessageId: null, error, httpStatus: response.status, providerResponse };
  }

  // Accepted for sending, not delivered. Only surface an id Beem actually returned.
  const providerMessageId = data?.data?.id ?? data?.id ?? data?.message_id ?? data?.request_id ?? data?.job_id ?? null;
  logger.info('Beem WhatsApp template accepted', { to: maskPhoneForLog(to), templateId: beemTemplate.templateId, httpStatus: response.status, providerMessageId, transactionId });
  return { status: 'queued', provider: PROVIDER_BEEM, providerMessageId: providerMessageId ? String(providerMessageId) : null, error: null, httpStatus: response.status, providerResponse };
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
  async sendInvitationTemplate({ to, params }) {
    if (!isBeemTemplateConfigured) return unavailable(PROVIDER_BEEM, `provider not configured (missing: ${missingTemplateFields().join(', ') || 'WHATSAPP_PROVIDER=beem'})`, maskPhoneForLog(to));
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
