import { ApiError } from '../utils/ApiError.js';
import { TEMPLATE_CATEGORIES } from '../constants/templateCategories.js';
import { PRICING_TIER_VALUES } from '../constants/pricingTiers.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';

const HTML_RE = /[<>]/;

function text(value, { field, label, min = 0, max, required = false }, details) {
  const v = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if ((required || v) && (v.length < Math.max(min, required ? 1 : 0) || v.length > max || HTML_RE.test(v))) {
    details.push({ field, message: required && !v ? `${label} is required` : `${label} must be ${min ? `${min}–` : 'up to '}${max} characters, no HTML` });
  }
  return v || null;
}

/**
 * Invitation card (event_templates row) details from the admin catalogue.
 * Multipart forms send strings, so `status` arrives as text too.
 */
export function validateCardDetails(body = {}) {
  const details = [];
  const name = text(body.name, { field: 'name', label: 'Card name', min: 2, max: 150, required: true }, details);
  const description = text(body.description, { field: 'description', label: 'Description', max: 500 }, details);
  if (!TEMPLATE_CATEGORIES.includes(body.category)) details.push({ field: 'category', message: 'Choose a category' });
  if (!PRICING_TIER_VALUES.includes(body.pricingTier)) details.push({ field: 'pricingTier', message: 'Choose a pricing tier' });
  if (!['active', 'inactive'].includes(body.status)) details.push({ field: 'status', message: 'Choose Published or Hidden' });
  if (details.length) throw ApiError.validation(details);
  return { name, description, category: body.category, pricingTier: body.pricingTier, status: body.status };
}

/** Promotional video/image details. */
export function validateMediaDetails(body = {}) {
  const details = [];
  const title = text(body.title, { field: 'title', label: 'Title', min: 2, max: 150, required: true }, details);
  const description = text(body.description, { field: 'description', label: 'Description', max: 500 }, details);
  const category = body.category ? String(body.category) : null;
  if (category && !EVENT_TYPES.includes(category)) details.push({ field: 'category', message: 'Choose a valid event category' });
  if (!['draft', 'published'].includes(body.status)) details.push({ field: 'status', message: 'Choose Draft or Published' });
  if (details.length) throw ApiError.validation(details);
  return { title, description, category, status: body.status };
}

/** A reorder request: every id exactly once, numeric, bounded. */
export function validateIdList(ids, { max = 500 } = {}) {
  if (!Array.isArray(ids) || ids.length > max || !ids.every((id) => Number.isInteger(id) && id > 0) || new Set(ids).size !== ids.length) {
    throw ApiError.validation([{ field: 'ids', message: 'Send each item id once, in the new order' }]);
  }
  return ids;
}

export function validateNumericId(id) {
  if (!/^\d+$/.test(String(id))) throw ApiError.badRequest('Invalid id');
  return Number(id);
}
