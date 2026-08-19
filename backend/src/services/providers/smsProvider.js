import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const BEEM_SEND_URL = 'https://apisms.beem.africa/v1/send';
const PROVIDER = 'beem';

/** Beem expects dest_addr as digits only (e.g. "255712345678") — a leading '+' is rejected. `to` arrives E.164-normalized (see utils/phone.js), which always has one. */
function toBeemRecipient(e164) {
  return e164.startsWith('+') ? e164.slice(1) : e164;
}

// Each of the three credential fields is checked independently so a
// missing one can be named exactly — "no SMS provider configured" alone
// previously gave no way to tell "all three are empty" apart from "only
// BEEM_SENDER_ID is empty", which is exactly what happened here: the key
// pair was correct but the sender ID was not set, and the generic
// message didn't say so.
const missingFields = ['apiKey', 'secretKey', 'senderId'].filter((field) => !env.sms[field]);
const isConfigured = missingFields.length === 0;

/**
 * Beem (beem.africa) SMS provider — CardHub's chosen SMS gateway. No
 * credentials exist in this environment and none were invented;
 * `isConfigured` gates the real request below, so every caller must still
 * handle `{ status: 'unavailable' }` exactly like every other provider in
 * this codebase (email/payment/image storage). The HTTP call itself is
 * real (Beem's documented Basic Auth + JSON `recipients[]` shape,
 * standard `fetch`, no new dependency needed) but has not been exercised
 * against a real Beem account in this environment — smoke-test it against
 * a real account before relying on it in production.
 *
 * Every branch returns the same normalized shape:
 *   { status, provider: 'beem', providerMessageId, error }
 * `providerMessageId` is only ever Beem's own `request_id` — never
 * fabricated. `status: 'queued'` means Beem *accepted* the message for
 * delivery, not that the recipient received it (Beem confirms final
 * delivery asynchronously via a delivery-report callback this codebase
 * does not implement a webhook for yet).
 */
export const smsProvider = {
  isConfigured,
  missingFields,

  /** payload: { to, message } — `to` must already be E.164-normalized (see utils/phone.js). */
  async send(payload) {
    if (!isConfigured) {
      logger.warn('SMS delivery unavailable — Beem is missing required env vars', {
        to: payload.to,
        missing: missingFields.map((f) => (f === 'apiKey' ? 'BEEM_API_KEY' : f === 'secretKey' ? 'BEEM_SECRET_KEY' : 'BEEM_SENDER_ID')),
      });
      return { status: 'unavailable', provider: PROVIDER, providerMessageId: null, error: 'provider not configured' };
    }

    const credentials = Buffer.from(`${env.sms.apiKey}:${env.sms.secretKey}`).toString('base64');

    let response;
    try {
      response = await fetch(BEEM_SEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_addr: env.sms.senderId,
          schedule_time: '',
          encoding: 0,
          message: payload.message,
          recipients: [{ recipient_id: 1, dest_addr: toBeemRecipient(payload.to) }],
        }),
      });
    } catch (error) {
      logger.error('Beem SMS request failed', { message: error.message });
      return { status: 'failed', provider: PROVIDER, providerMessageId: null, error: `network error: ${error.message}` };
    }

    if (!response.ok) {
      // Log Beem's actual response body (never the credentials) — a bare
      // status code isn't enough to diagnose a 401. Beem returns 401 for
      // a wrong/rotated api_key+secret_key pair, but also for a correctly
      // paired key that isn't yet enabled for the SMS product, or an
      // account still in sandbox/unapproved state — the body text usually
      // says which.
      const bodyText = await response.text().catch(() => '');
      logger.error('Beem SMS send rejected', { statusCode: response.status, body: bodyText.slice(0, 500) });
      const parsedBody = (() => {
        try {
          return JSON.parse(bodyText);
        } catch {
          return null;
        }
      })();
      return {
        status: 'failed',
        provider: PROVIDER,
        providerMessageId: null,
        error: parsedBody?.message
          ? `Beem: ${parsedBody.message} (HTTP ${response.status})`
          : `Beem rejected the request (HTTP ${response.status})`,
      };
    }

    const data = await response.json();
    // Beem's own success flag — a 200 response can still report a
    // provider-side failure (invalid sender id, insufficient credit, etc.).
    if (data.successful === false) {
      logger.error('Beem SMS send failed', { code: data.code });
      return { status: 'failed', provider: PROVIDER, providerMessageId: null, error: `Beem error code ${data.code}` };
    }

    return {
      status: 'queued',
      provider: PROVIDER,
      providerMessageId: data.request_id !== undefined ? String(data.request_id) : null,
      error: null,
    };
  },
};
