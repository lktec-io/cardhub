/**
 * Display-only mirror of backend/src/constants/pricingTiers.js. The
 * backend is the source of truth and the only place a price is actually
 * enforced — every template's real price comes back from the API
 * (template.priceTzs) computed server-side. This mirror exists only for
 * pages that need to show the three tiers before/without a template
 * loaded yet (e.g. the Pricing page).
 */
export const PRICING_TIERS = {
  starter: { id: 'starter', name: 'Starter', priceTzs: 1200 },
  premium: { id: 'premium', name: 'Premium', priceTzs: 1500 },
  classic: { id: 'classic', name: 'Classic', priceTzs: 2000 },
};

export const PRICING_TIER_LIST = Object.values(PRICING_TIERS);

export function formatCardPrice(priceTzs) {
  return `TSh ${new Intl.NumberFormat('en-TZ').format(priceTzs)} / card`;
}
