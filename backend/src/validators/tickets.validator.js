import { ApiError } from '../utils/ApiError.js';
import { normalizePhoneForDelivery } from '../utils/phone.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { TICKET_MAX_QUANTITY_PER_ORDER } from '../constants/ticketStatus.js';
import { TICKET_ORDER_TOKEN_RE, TICKET_TOKEN_RE } from '../utils/ticketCode.js';

const NAME_MAX = 150;
const EMAIL_MAX = 190;
const SEARCH_MAX = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9-]{1,220}$/;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9-]{16,64}$/;

export const DATE_PRESETS = ['today', 'weekend', 'week', 'month'];

/** Marketplace filters. Anything unrecognised is dropped rather than rejected, so a stale shared URL still loads. */
export function parseEventListQuery(query) {
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, SEARCH_MAX) : '';
  const location = typeof query.location === 'string' ? query.location.trim().slice(0, SEARCH_MAX) : '';
  const category = EVENT_TYPES.includes(query.category) ? query.category : '';
  const date = DATE_PRESETS.includes(query.date) ? query.date : '';
  const maxPriceNumber = Number.parseInt(query.maxPrice, 10);
  const maxPrice = Number.isInteger(maxPriceNumber) && maxPriceNumber > 0 ? Math.min(maxPriceNumber, 100_000_000) : null;
  return { search, location, category, date, maxPrice };
}

export function assertEventSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    // Same 404 as a real miss: a malformed slug must not be distinguishable from an unpublished event.
    throw ApiError.notFound('Event not found');
  }
}

export function assertOrderToken(token) {
  if (typeof token !== 'string' || !TICKET_ORDER_TOKEN_RE.test(token)) {
    throw ApiError.notFound('Order not found');
  }
}

export function isWellFormedTicketToken(token) {
  return typeof token === 'string' && TICKET_TOKEN_RE.test(token);
}

/**
 * Checkout payload. No price, total or currency is accepted at all.
 * The server always computes them from the ticket type's database row.
 */
export function validateCreateTicketOrderPayload(body = {}) {
  const { eventSlug, ticketTypeId, quantity, buyerName, buyerPhone, buyerEmail, idempotencyKey } = body;
  const details = [];

  if (typeof eventSlug !== 'string' || !SLUG_RE.test(eventSlug)) {
    details.push({ field: 'eventSlug', message: 'Event not found' });
  }

  const typeId = Number(ticketTypeId);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    details.push({ field: 'ticketTypeId', message: 'Please choose a ticket type' });
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > TICKET_MAX_QUANTITY_PER_ORDER) {
    details.push({ field: 'quantity', message: `Quantity must be between 1 and ${TICKET_MAX_QUANTITY_PER_ORDER}` });
  }

  const name = typeof buyerName === 'string' ? buyerName.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 3 || name.length > NAME_MAX || !/[\p{L}]/u.test(name)) {
    details.push({ field: 'buyerName', message: 'Please enter your full name' });
  }

  const phone = typeof buyerPhone === 'string' ? normalizePhoneForDelivery(buyerPhone) : null;
  if (!phone) {
    details.push({ field: 'buyerPhone', message: 'Please enter a valid phone number (e.g. 0712 345 678)' });
  }

  let email = null;
  if (buyerEmail !== undefined && buyerEmail !== null && buyerEmail !== '') {
    email = typeof buyerEmail === 'string' ? buyerEmail.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
      details.push({ field: 'buyerEmail', message: 'Please enter a valid email address, or leave it empty' });
    }
  }

  if (idempotencyKey !== undefined && idempotencyKey !== null && (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY_RE.test(idempotencyKey))) {
    details.push({ field: 'idempotencyKey', message: 'Invalid request key' });
  }

  if (details.length) throw ApiError.validation(details);

  return {
    eventSlug,
    ticketTypeId: typeId,
    quantity: qty,
    buyerName: name,
    buyerPhone: phone,
    buyerEmail: email,
    idempotencyKey: idempotencyKey || null,
  };
}

/** Optional payer number for the mobile-money prompt; defaults to the buyer's phone. Never a PIN — there is no PIN field anywhere in this API. */
export function validateStartPaymentPayload(body = {}) {
  if (body.phone === undefined || body.phone === null || body.phone === '') return { phone: null };
  const phone = typeof body.phone === 'string' ? normalizePhoneForDelivery(body.phone) : null;
  if (!phone) {
    throw ApiError.validation([{ field: 'phone', message: 'Please enter a valid mobile money number' }]);
  }
  return { phone };
}
