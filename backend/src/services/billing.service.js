import { ApiError } from '../utils/ApiError.js';
import { PLANS, getPlan, DEFAULT_PLAN } from '../constants/plans.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { eventRepository } from '../repositories/event.repository.js';
import { paymentProvider } from './providers/paymentProvider.js';

function toPaymentDTO(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    createdAt: row.created_at,
  };
}

export const billingService = {
  async getSummary(userId) {
    const subscription = await subscriptionRepository.findActiveByUserId(userId);
    const planId = subscription?.plan || DEFAULT_PLAN;
    const plan = getPlan(planId);

    const [eventCount, publishedCount, payments] = await Promise.all([
      eventRepository.countByUserId(userId),
      eventRepository.countPublishedByUserId(userId),
      subscriptionRepository.findPaymentsByUserId(userId),
    ]);

    return {
      plan: { id: plan.id, name: plan.name, priceTzs: plan.priceTzs, limits: plan.limits },
      subscription: subscription
        ? {
            status: subscription.status,
            startedAt: subscription.started_at,
            currentPeriodEnd: subscription.current_period_end,
          }
        : null,
      usage: {
        events: eventCount,
        publishedInvitations: publishedCount,
      },
      availablePlans: Object.values(PLANS).map((p) => ({ id: p.id, name: p.name, priceTzs: p.priceTzs, limits: p.limits })),
      paymentHistory: payments.map(toPaymentDTO),
    };
  },

  /** Honest placeholder — see docs/architecture.md "Payment provider status". Never fakes a successful charge. */
  async startUpgrade(userId, planId) {
    if (!PLANS[planId] || planId === DEFAULT_PLAN) {
      throw ApiError.badRequest('Invalid plan selected');
    }
    if (!paymentProvider.isConfigured) {
      throw ApiError.badRequest('Payment processing is not connected yet. Please check back soon.');
    }
    return paymentProvider.createCheckout(userId, planId);
  },
};
