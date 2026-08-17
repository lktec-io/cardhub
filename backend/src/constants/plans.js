/**
 * Centralized, server-authoritative plan configuration. Prices are in TZS
 * and are placeholder figures for architecture purposes — not final
 * commercial pricing. -1 means unlimited. Every limit here is enforced
 * server-side (see services/plan.service.js) — the frontend billing page
 * only mirrors this for display, it never enforces anything itself.
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceTzs: 0,
    limits: { maxEvents: 1, maxPublishedInvitations: 1, maxGuestsPerEvent: 30 },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceTzs: 25000,
    limits: { maxEvents: 5, maxPublishedInvitations: 5, maxGuestsPerEvent: 300 },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceTzs: 60000,
    limits: { maxEvents: -1, maxPublishedInvitations: -1, maxGuestsPerEvent: -1 },
  },
};

export const DEFAULT_PLAN = 'free';

export function getPlan(planId) {
  return PLANS[planId] || PLANS[DEFAULT_PLAN];
}

export function isWithinLimit(count, limit) {
  return limit === -1 || count < limit;
}
