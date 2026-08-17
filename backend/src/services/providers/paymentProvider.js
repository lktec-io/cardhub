import { logger } from '../../utils/logger.js';

/**
 * Payment provider abstraction — no gateway (mobile money/card) is
 * connected in this environment and none were invented. Every payment
 * flows through this interface so a real provider (e.g. a Tanzanian
 * mobile money aggregator) can be wired in later without touching
 * billing.service.js or any controller. The frontend is never trusted for
 * payment status — only a real provider callback/webhook (verified here)
 * may ever mark a payment "paid".
 */
export const paymentProvider = {
  isConfigured: false,

  async createCheckout() {
    logger.warn('Payment checkout requested but no payment provider is configured');
    return { status: 'unavailable' };
  },

  /** Real implementations must verify the provider's signature before trusting a webhook body. */
  verifyWebhookSignature() {
    return false;
  },
};
