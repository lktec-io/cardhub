import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const PROVIDER = 'meta';

const isConfigured = Boolean(
  env.whatsapp.provider === 'meta' && env.whatsapp.accessToken && env.whatsapp.phoneNumberId
);

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
    return { status: 'failed', provider: PROVIDER, providerMessageId: null, error: `network error: ${error.message}` };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    // Meta's error shape: { error: { message, type, code, error_subcode, fbtrace_id } }
    const message = data?.error?.message || `WhatsApp Cloud API rejected the request (HTTP ${response.status})`;
    logger.error('WhatsApp Cloud API send rejected', { statusCode: response.status, code: data?.error?.code });
    return { status: 'failed', provider: PROVIDER, providerMessageId: null, error: message };
  }

  const providerMessageId = data.messages?.[0]?.id ?? null;
  return { status: 'queued', provider: PROVIDER, providerMessageId, error: null };
}

/**
 * Meta WhatsApp Cloud API — CardHub's chosen WhatsApp provider. The
 * official Business API only; unofficial WhatsApp Web automation/
 * scraping/session bots were never an option (ToS violation, and
 * inherently unreliable for a production delivery pipeline). No
 * credentials exist in this environment and none were invented;
 * `isConfigured` gates the real request below, so every caller must
 * still handle `{ status: 'unavailable' }` exactly like every other
 * provider in this codebase. This HTTP transport has not been exercised
 * against a real Meta Business account — smoke-test it before relying on
 * it in production.
 *
 * `env.whatsapp.provider` exists specifically so a second provider could
 * be added later (e.g. Beem's WhatsApp API) behind these same two method
 * signatures without touching any caller — today only 'meta' is
 * implemented, per this phase's explicit scope.
 *
 * Every branch returns the same normalized shape:
 *   { status, provider: 'meta', providerMessageId, error }
 * `status: 'queued'` means Meta *accepted* the message — not that the
 * recipient received or read it. Meta reports delivery/read receipts
 * asynchronously via a webhook this codebase does not implement yet.
 */
export const whatsappProvider = {
  isConfigured,

  /** payload: { to, message } — `to` must already be E.164-normalized (see utils/phone.js). */
  async sendCardMessage(payload) {
    if (!isConfigured) {
      logger.warn('WhatsApp message unavailable — no WhatsApp provider configured', { to: payload?.to });
      return { status: 'unavailable', provider: PROVIDER, providerMessageId: null, error: 'provider not configured' };
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
    if (!isConfigured) {
      logger.warn('WhatsApp image unavailable — no WhatsApp provider configured', { to: payload?.to });
      return { status: 'unavailable', provider: PROVIDER, providerMessageId: null, error: 'provider not configured' };
    }

    return sendGraphMessage({
      messaging_product: 'whatsapp',
      to: toGraphRecipient(payload.to),
      type: 'image',
      image: { link: payload.imageUrl, caption: payload.caption },
    });
  },
};
