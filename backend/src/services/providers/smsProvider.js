import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const isConfigured = Boolean(env.sms.provider && env.sms.apiKey);

/**
 * Provider abstraction, not a working SMS sender. No SMS provider
 * (e.g. Africa's Talking, Twilio) is configured in this environment and
 * none were invented. Every caller must handle `{ status: 'unavailable' }`.
 */
export const smsProvider = {
  isConfigured,

  /** payload: { to, message } */
  async send(payload) {
    if (!isConfigured) {
      logger.warn('SMS delivery unavailable — no SMS provider configured', { to: payload.to });
      return { status: 'unavailable' };
    }

    // Real transport would be wired in here once SMS_PROVIDER/SMS_API_KEY
    // are actually configured.
    throw new Error('SMS provider is configured but no transport implementation exists yet');
  },
};
