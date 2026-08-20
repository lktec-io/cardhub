import { ApiError } from '../utils/ApiError.js';
import { GUEST_TYPE_VALUES } from '../constants/orderStatus.js';
import { PAYMENT_METHOD_VALUES } from '../constants/paymentStatus.js';
import { normalizePhoneForDelivery } from '../utils/phone.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { isValidCalendarDate, TIME_RE } from '../utils/dateTime.js';

const NAME_MAX = 150;
const TEXT_MAX = 190;

/**
 * Same shape/rules as orders.validator.js#validateTryServicePayload (this
 * is deliberately the same order-creation contract, just gated behind
 * payment instead of being free) — price/amount is never part of this
 * payload at all, on purpose; the server always computes it from the
 * template's own pricing tier in payment.service.js.
 */
export function validateCheckoutPayload({ name, phone, templateId, quantity, eventType, eventName, venue, eventDate, eventTime, guestType, method }) {
  const details = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > NAME_MAX) {
    details.push({ field: 'name', message: 'Full name is required' });
  }

  const normalizedPhone = typeof phone === 'string' ? normalizePhoneForDelivery(phone) : null;
  if (!normalizedPhone) {
    details.push({ field: 'phone', message: 'Please enter a valid phone number (e.g. 0712 345 678)' });
  }

  if (!templateId || !/^\d+$/.test(String(templateId))) {
    details.push({ field: 'templateId', message: 'Please choose a card' });
  }

  const qty = quantity === undefined ? 1 : Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 500) {
    details.push({ field: 'quantity', message: 'Quantity must be between 1 and 500' });
  }

  if (!eventType || !EVENT_TYPES.includes(eventType)) {
    details.push({ field: 'eventType', message: 'Please choose an event type' });
  }
  if (!eventName || typeof eventName !== 'string' || eventName.trim().length < 2 || eventName.length > TEXT_MAX) {
    details.push({ field: 'eventName', message: 'Please enter an event name' });
  }
  if (venue !== undefined && venue !== null && venue !== '' && (typeof venue !== 'string' || venue.length > TEXT_MAX)) {
    details.push({ field: 'venue', message: 'Venue is too long' });
  }
  if (eventDate !== undefined && eventDate !== null && eventDate !== '' && (typeof eventDate !== 'string' || !isValidCalendarDate(eventDate))) {
    details.push({ field: 'eventDate', message: 'Please enter a valid date (YYYY-MM-DD)' });
  }
  if (eventTime !== undefined && eventTime !== null && eventTime !== '' && (typeof eventTime !== 'string' || !TIME_RE.test(eventTime))) {
    details.push({ field: 'eventTime', message: 'Please enter a valid time (HH:MM)' });
  }
  if (guestType !== undefined && guestType !== null && guestType !== '' && !GUEST_TYPE_VALUES.includes(guestType)) {
    details.push({ field: 'guestType', message: 'Guest type must be Single or Double' });
  }
  if (!method || !PAYMENT_METHOD_VALUES.includes(method)) {
    details.push({ field: 'method', message: 'Please choose a payment method' });
  }

  if (details.length) throw ApiError.validation(details);

  return {
    normalizedPhone,
    quantity: qty,
    eventType,
    eventName: eventName.trim(),
    venue: venue ? venue.trim() : null,
    eventDate: eventDate || null,
    eventTime: eventTime || null,
    guestType: guestType || null,
    method,
  };
}

export function validatePaymentToken(token) {
  if (!token || typeof token !== 'string' || token.length > 190) {
    throw ApiError.badRequest('Invalid payment reference');
  }
}
