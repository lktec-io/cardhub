import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const PROVIDER_META = 'meta';
const PROVIDER_BEEM = 'beem';

const selectedProvider = env.whatsapp.provider;

const isMetaConfigured = Boolean(selectedProvider === PROVIDER_META && env.whatsapp.accessToken && env.whatsapp.phoneNumberId);
// Beem's WhatsApp Business API onboarding is in progress — no documented
// endpoint/auth/payload shape has been provided yet, so this deliberately
// never fabricates one (see prompt's explicit "do not fabricate
// undocumented Beem endpoints"). Once real Beem WhatsApp API docs exist,
// implement sendViaBeem() below the same way sendViaMeta() is implemented
// today — every caller already only depends on the normalized
// { status, provider, providerMessageId, error } shape, so no caller
// needs to change.
const isBeemConfigured = false;

function graphUrl() {
  return `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
}

/** Meta expects the recipient without a leading '+' (e.g. "255712345678"). */
function toGraphRecipient(e164) {
  return e164.startsWith('+') ? e164.slice(1) : e164;
}

async function sendGraphMessage(body) {
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
  logger.warn('WhatsApp message unavailable', { provider, reason, to });
  return { status: 'unavailable', provider, providerMessageId: null, error: reason };
}

/**
 * WhatsApp delivery — dispatches to whichever provider `WHATSAPP_PROVIDER`
 * selects. Today only Meta's official WhatsApp Cloud API is actually
 * implemented (see sendGraphMessage above); unofficial WhatsApp Web
 * automation/scraping/session bots were never an option (ToS violation,
 * inherently unreliable for a production delivery pipeline). `provider`
 * exists specifically so Beem's own WhatsApp API can be added later
 * behind the same two method signatures without touching any caller —
 * see isBeemConfigured's comment for why that isn't implemented yet.
 *
 * No credentials exist in this environment and none were invented;
 * `isConfigured` gates every real request, so every caller must still
 * handle `{ status: 'unavailable' }` exactly like every other provider in
 * this codebase. The Meta HTTP transport is real and documented but has
 * not been exercised against a real Meta Business account here — smoke-
 * test it before relying on it in production.
 *
 * Every branch returns the same normalized shape:
 *   { status, provider, providerMessageId, error }
 * `status: 'queued'` means the provider *accepted* the message — not that
 * the recipient received or read it. Delivery/read receipts arrive
 * asynchronously via a webhook this codebase does not implement yet.
 */
export const whatsappProvider = {
  isConfigured: isMetaConfigured || isBeemConfigured,
  providerName: selectedProvider || PROVIDER_META,

  /** payload: { to, message } — `to` must already be E.164-normalized (see utils/phone.js). */
  async sendCardMessage(payload) {
    if (selectedProvider === PROVIDER_BEEM) {
      return unavailable(PROVIDER_BEEM, 'Beem WhatsApp API not yet configured — pending onboarding details', payload?.to);
    }
    if (!isMetaConfigured) {
      return unavailable(PROVIDER_META, 'provider not configured', payload?.to);
    }
    return sendGraphMessage({
      messaging_product: 'whatsapp',
      to: toGraphRecipient(payload.to),
      type: 'text',
      text: { body: payload.message, preview_url: true },
    });
  },

  /** payload: { to, imageUrl, caption } — `imageUrl` must be a publicly reachable HTTPS URL the caller resolved server-side. */
  async sendCardImage(payload) {
    if (selectedProvider === PROVIDER_BEEM) {
      return unavailable(PROVIDER_BEEM, 'Beem WhatsApp API not yet configured — pending onboarding details', payload?.to);
    }
    if (!isMetaConfigured) {
      return unavailable(PROVIDER_META, 'provider not configured', payload?.to);
    }
    return sendGraphMessage({
      messaging_product: 'whatsapp',
      to: toGraphRecipient(payload.to),
      type: 'image',
      image: { link: payload.imageUrl, caption: payload.caption },
    });
  },
};
