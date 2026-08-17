import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const isConfigured = Boolean(env.email.host && env.email.user && env.email.password);

/**
 * Provider abstraction, not a working mail sender. No SMTP credentials
 * exist in this environment and none were invented. Every caller must
 * handle `{ status: 'unavailable' }` — this never resolves as "sent"
 * unless a real provider is wired in behind this same interface.
 */
export const emailProvider = {
  isConfigured,

  /** payload: { to, subject, body } — body intentionally unused until a real transport exists. */
  async send(payload) {
    if (!isConfigured) {
      logger.warn('Email delivery unavailable — no SMTP provider configured', { to: payload.to, subject: payload.subject });
      return { status: 'unavailable' };
    }

    // Real transport (e.g. nodemailer) would be wired in here once
    // SMTP_HOST/SMTP_USER/SMTP_PASSWORD are actually configured.
    throw new Error('Email provider is configured but no transport implementation exists yet');
  },
};
