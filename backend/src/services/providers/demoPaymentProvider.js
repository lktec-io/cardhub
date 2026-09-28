import { randomBytes } from 'node:crypto';

export const DEMO_PROVIDER_NAME = 'demo';

/**
 * DEMO PAYMENT MODE provider. No money moves and no external service is
 * called. It implements the same createPayment() contract as the real
 * provider (providers/paymentProvider.js) so the ticket flow is identical
 * in shape. The only difference is the confirmation step: a real provider
 * confirms through its verified webhook (payment.service.js
 * #handleProviderWebhook), and the demo provider confirms through
 * tickets.service.js#confirmDemoPayment.
 *
 * Security: this provider never receives, stores or logs a PIN. The demo
 * "PIN" screen is checked in the browser only and is never sent to the
 * API. A real integration must use the provider's own USSD/STK/hosted
 * checkout, where the customer enters their PIN on their phone or on the
 * provider's page, never in CardHub.
 */
export const demoPaymentProvider = {
  providerName: DEMO_PROVIDER_NAME,
  isDemo: true,
  isConfigured: true,

  /** payload: { amount, currency, reference, phone, description } */
  async createPayment() {
    return {
      status: 'created',
      providerReference: `DEMO-${randomBytes(10).toString('hex').toUpperCase()}`,
      checkoutUrl: null,
      error: null,
    };
  },

  /** Builds the same normalized event shape a real webhook produces (paymentProvider.normalizeWebhookEvent). */
  buildConfirmationEvent({ providerReference, amount }) {
    return { providerReference, isPaid: true, amount: Number(amount), currency: 'TZS' };
  },
};
