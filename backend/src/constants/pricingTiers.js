/**
 * Centralized, server-authoritative per-card pricing. CardHub sells cards
 * individually (TSh per card), not per event — see constants/plans.js for
 * the older per-event subscription model, which this does not replace.
 * Prices are commercial launch figures for Clix Digital Works, in TZS.
 * Every order's price is computed here, server-side, from the template's
 * assigned tier (see event_templates.pricing_tier) — never trusted from
 * the client. Changing a price means editing this file only; no frontend
 * component hardcodes a number.
 */
export const PRICING_TIERS = {
  starter: { id: 'starter', name: 'Starter', priceTzs: 1200 },
  premium: { id: 'premium', name: 'Premium', priceTzs: 1500 },
  classic: { id: 'classic', name: 'Classic', priceTzs: 2000 },
};

export const DEFAULT_PRICING_TIER = 'starter';
export const PRICING_TIER_VALUES = Object.keys(PRICING_TIERS);

export function getPricingTier(tierId) {
  return PRICING_TIERS[tierId] || PRICING_TIERS[DEFAULT_PRICING_TIER];
}
