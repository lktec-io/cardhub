/**
 * Form ↔ API mapping and client-side checks for Event Workspace → Tickets.
 * The checks are for instant feedback only; the API re-validates
 * everything (backend/src/validators/eventTickets.validator.js).
 */

export const TIER_LIMITS = { maxTiers: 12, priceMin: 100, quantityMax: 100000, maxPerOrderMax: 20 };

/** Quick-add suggestions. Prices are left for the organizer to fill in. */
export const TIER_PRESETS = ['Early Bird', 'Regular', 'VIP', 'VVIP'];

const COVER_URL_RE = /^https?:\/\/[^\s]+\.(jpe?g|png|webp)(\?[^\s]*)?$/i;
const APP_ASSET_RE = /^\/(?!\/)(?!.*\.\.)[A-Za-z0-9_\-./]+\.(jpe?g|png|webp|svg)$/i;

let keySeed = 0;
const nextKey = () => `tier-${Date.now()}-${keySeed++}`;

export function blankTier(name = '') {
  return {
    key: nextKey(),
    id: null,
    name,
    description: '',
    priceTzs: '',
    quantityAvailable: '',
    maxPerOrder: '10',
    status: 'active',
    quantitySold: 0,
    quantityReserved: 0,
    hasOrders: false,
  };
}

/** API response -> editable form state (numbers as strings, so inputs can be cleared while typing). */
export function toForm(data) {
  return {
    ticketSalesEnabled: data.event.ticketSalesEnabled,
    coverImage: data.event.coverImage || '',
    organizerContact: data.event.organizerContact || '',
    endTime: data.event.endTime || '',
    tiers: data.tiers.map((tier) => ({
      key: `tier-${tier.id}`,
      id: tier.id,
      name: tier.name,
      description: tier.description || '',
      priceTzs: String(tier.priceTzs),
      quantityAvailable: String(tier.quantityAvailable),
      maxPerOrder: String(tier.maxPerOrder),
      status: tier.status,
      quantitySold: tier.quantitySold,
      quantityReserved: tier.quantityReserved,
      hasOrders: tier.hasOrders,
    })),
  };
}

const digits = (value) => String(value ?? '').replace(/[^\d]/g, '');

/** Form state -> API payload. Only the fields the API accepts; never sold/reserved counts. */
export function toPayload(form) {
  return {
    ticketSalesEnabled: form.ticketSalesEnabled,
    coverImage: form.coverImage.trim() || null,
    organizerContact: form.organizerContact.trim() || null,
    endTime: form.endTime || null,
    tiers: form.tiers.map((tier) => ({
      id: tier.id,
      name: tier.name.trim(),
      description: tier.description.trim() || null,
      priceTzs: Number(digits(tier.priceTzs)),
      quantityAvailable: Number(digits(tier.quantityAvailable)),
      maxPerOrder: Number(digits(tier.maxPerOrder)) || 10,
      status: tier.status,
    })),
  };
}

/** A stable string of what would be saved, for "unsaved changes" detection. */
export function snapshot(form) {
  return JSON.stringify(toPayload(form));
}

export function isValidCover(value) {
  const v = value.trim();
  return !v || COVER_URL_RE.test(v) || APP_ASSET_RE.test(v);
}

/** Returns { field: message } using the same keys as the API (`tiers.<i>.<field>`). */
export function validateForm(form) {
  const errors = {};
  const seen = new Set();
  form.tiers.forEach((tier, i) => {
    const name = tier.name.trim();
    if (name.length < 2) errors[`tiers.${i}.name`] = 'Give this tier a name';
    else if (seen.has(name.toLowerCase())) errors[`tiers.${i}.name`] = 'Another tier already uses this name';
    seen.add(name.toLowerCase());

    const price = Number(digits(tier.priceTzs));
    if (!price || price < TIER_LIMITS.priceMin) errors[`tiers.${i}.priceTzs`] = `At least TSh ${TIER_LIMITS.priceMin}`;

    const quantity = Number(digits(tier.quantityAvailable));
    const committed = tier.quantitySold + tier.quantityReserved;
    if (!quantity || quantity > TIER_LIMITS.quantityMax) errors[`tiers.${i}.quantityAvailable`] = 'Enter how many are available';
    else if (quantity < committed) errors[`tiers.${i}.quantityAvailable`] = `At least ${committed} (already sold or held)`;

    const perOrder = Number(digits(tier.maxPerOrder));
    if (!perOrder || perOrder > TIER_LIMITS.maxPerOrderMax) errors[`tiers.${i}.maxPerOrder`] = `1–${TIER_LIMITS.maxPerOrderMax}`;
  });
  if (form.ticketSalesEnabled && !form.tiers.some((tier) => tier.status === 'active')) {
    errors.tiers = 'Add at least one ticket tier that is on sale before switching sales on';
  }
  if (!isValidCover(form.coverImage)) errors.coverImage = 'Use an https image link ending in .jpg, .png or .webp';
  if (form.organizerContact.length > 190) errors.organizerContact = 'Keep this under 190 characters';
  return errors;
}

/** Server `{ details: [{ field, message }] }` -> `{ field: message }`. */
export function serverErrors(error) {
  const details = error?.response?.data?.error?.details;
  return Array.isArray(details) ? Object.fromEntries(details.map((d) => [d.field, d.message])) : {};
}
