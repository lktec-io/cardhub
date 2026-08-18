import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const BEEM_SEND_URL = 'https://apisms.beem.africa/v1/send';

const isConfigured = Boolean(env.sms.apiKey && env.sms.secretKey && env.sms.senderId);

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
 */
export const smsProvider = {
  isConfigured,

  /** payload: { to, message } — `to` is a phone number in the format Beem expects (e.g. 255712345678). */
  async send(payload) {
    if (!isConfigured) {
      logger.warn('SMS delivery unavailable — no SMS provider configured', { to: payload.to });
      return { status: 'unavailable' };
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
          encoding: 0,
          message: payload.message,
          recipients: [{ recipient_id: 1, dest_addr: payload.to }],
        }),
      });
    } catch (error) {
      logger.error('Beem SMS request failed', { message: error.message });
      return { status: 'failed', reason: 'network_error' };
    }

    if (!response.ok) {
      logger.error('Beem SMS send rejected', { statusCode: response.status });
      return { status: 'failed', providerStatusCode: response.status };
    }

    const data = await response.json();
    // Beem's own success flag — a 200 response can still report a
    // provider-side failure (invalid sender id, insufficient credit, etc.).
    if (data.successful === false) {
      return { status: 'failed', providerCode: data.code, raw: data };
    }

    // Delivery status tracking: Beem confirms *submission*, not final
    // delivery, synchronously — final delivery state comes from Beem's
    // asynchronous delivery-report callback, which is not wired up yet
    // (no public webhook endpoint exists for it in this codebase). Callers
    // should treat this as "queued with the provider," not "delivered."
    return { status: 'queued', providerRequestId: data.request_id, raw: data };
  },
};
