import { env } from '../../config/env.js';
import { TICKET_PAYMENT_MODES } from '../../constants/ticketStatus.js';
import { paymentProvider } from './paymentProvider.js';
import { demoPaymentProvider } from './demoPaymentProvider.js';

/**
 * Picks the payment provider for ticket sales. Ticket code only talks to
 * this function and the normalized result below, never to a specific
 * gateway. To go live with Selcom, Beem, M-Pesa, Airtel Money, Tigo Pesa
 * or another gateway, implement createPayment/verifyWebhookSignature/
 * normalizeWebhookEvent in providers/paymentProvider.js (or add a
 * provider next to it and select it here), then set TICKET_PAYMENT_MODE=live.
 * Nothing in tickets.service.js has to change.
 */
export function getTicketPaymentProvider() {
  return isTicketDemoMode() ? demoPaymentProvider : paymentProvider;
}

export function isTicketDemoMode() {
  return env.tickets.paymentMode === TICKET_PAYMENT_MODES.DEMO;
}

/**
 * Converts a provider's createPayment() result into the next step the
 * buyer's screen should take:
 *   demo_confirmation — show the demo confirmation screen (demo mode only)
 *   redirect          — send the buyer to the provider's hosted checkout
 *   await_provider    — a push/USSD prompt went to the phone; poll for the webhook result
 *   unavailable       — no gateway is connected; nothing was charged
 */
export function resolveNextAction(provider, providerResult) {
  if (providerResult.status !== 'created') return 'unavailable';
  if (provider.isDemo) return 'demo_confirmation';
  if (providerResult.checkoutUrl) return 'redirect';
  return 'await_provider';
}
