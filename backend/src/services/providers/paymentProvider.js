import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const PROVIDER_BEEM = 'beem';

const isConfigured = Boolean(env.payment.provider === PROVIDER_BEEM && env.payment.apiKey && env.payment.secretKey);

/**
 * Payment provider abstraction — provider-agnostic on purpose
 * (paymentService never talks to an HTTP API directly, only to this
 * interface), so a real gateway can be swapped in later without
 * touching payment.service.js or any controller.
 *
 * Status honesty split, deliberately:
 *   - createPayment(): NOT wired to a real endpoint. Beem's own
 *     marketing pages confirm they offer a mobile-money collections
 *     product (docs.beem.africa/payments-collections/), but the exact
 *     initiate-collection endpoint URL and request-body field names
 *     aren't published anywhere this integration could verify — only
 *     their webhook/callback shape is (see normalizeWebhookEvent below).
 *     Inventing a plausible-looking endpoint here would be exactly the
 *     kind of fabrication this project has consistently refused to do
 *     (see the same honest gap in whatsappProvider.js for Beem's
 *     session/template requirement). Once you have the real endpoint
 *     from Beem's dashboard/onboarding, wire the fetch() call in here —
 *     nothing else in the payment layer needs to change.
 *   - normalizeWebhookEvent(): genuinely real. The field names below
 *     (`successful`, `transaction_id`, `remote_transaction_id`,
 *     `amount_collected`, `reference_number`, ...) are copied verbatim
 *     from Beem's own published callback example
 *     (beem.africa/mobile-payments-api/), not guessed.
 *
 * Every branch of createPayment() returns the same normalized shape:
 *   { status: 'unavailable' | 'created', checkoutUrl, providerReference, error }
 */
export const paymentProvider = {
  isConfigured,
  providerName: env.payment.provider || PROVIDER_BEEM,

  /** payload: { amount, currency, orderId, phone, description } */
  async createPayment(payload) {
    if (!isConfigured) {
      logger.warn('Payment checkout requested but no payment provider is configured', { orderId: payload?.orderId });
      return { status: 'unavailable', checkoutUrl: null, providerReference: null, error: 'provider not configured' };
    }

    // Deliberately not implemented — see the module comment above. This
    // is reached only once PAYMENT_PROVIDER=beem is set, and still
    // honestly refuses rather than fabricating a request.
    logger.warn('Beem collection-initiation endpoint is not yet wired in — pending documented endpoint/payload from Beem', {
      orderId: payload?.orderId,
    });
    return {
      status: 'unavailable',
      checkoutUrl: null,
      providerReference: null,
      error: 'Payment provider is configured but the checkout call is not implemented yet — pending Beem collection API details',
    };
  },

  /**
   * Beem's collections webhook doesn't publish a documented
   * cryptographic-signature scheme (unlike e.g. Stripe's HMAC header) —
   * common practice for this class of provider is a shared secret
   * delivered as a query param or header on the callback URL you
   * register with them. This checks for that shared secret
   * (PAYMENT_WEBHOOK_SECRET) as the minimum-viable real verification
   * until the exact mechanism is confirmed from Beem's onboarding —
   * never trust an unverified body.
   */
  verifyWebhookSignature(req) {
    if (!env.payment.webhookSecret) return false;
    const provided = req.headers['x-webhook-secret'] || req.query?.secret;
    return typeof provided === 'string' && provided === env.payment.webhookSecret;
  },

  /**
   * Maps Beem's real, published callback field names to CardHub's
   * normalized shape. `successful` is Beem's own boolean; a truthy value
   * is the only thing that ever counts as "paid" — everything else
   * (including a missing/falsy field) normalizes to "failed", never
   * "paid" by default.
   */
  normalizeWebhookEvent(body) {
    const providerReference = body?.transaction_id ? String(body.transaction_id) : body?.reference_number ? String(body.reference_number) : null;
    return {
      providerReference,
      remoteReference: body?.remote_transaction_id ? String(body.remote_transaction_id) : null,
      isPaid: body?.successful === true || body?.successful === 'true',
      amount: body?.amount_collected !== undefined ? Number(body.amount_collected) : null,
      currency: body?.currency_to || body?.currency_from || null,
      msisdn: body?.subscriber_msisdn || null,
      networkName: body?.network_name || null,
      raw: body,
    };
  },
};
