import { ApiError } from '../utils/ApiError.js';
import { ORDER_STATUS_VALUES, PAYMENT_STATUS_VALUES, DELIVERY_STATUS_VALUES, DELIVERY_CHANNEL_VALUES } from '../constants/orderStatus.js';
import { normalizePhoneForDelivery } from '../utils/phone.js';

const NAME_MAX = 150;
const MAX_QUANTITY = 500;

/**
 * Validates the Try Our Service payload and returns the normalized phone
 * number (E.164) so the caller never has to re-derive it — a single
 * source of truth for "what does this phone number actually look like."
 * Throws (rather than silently defaulting) on an invalid phone or an
 * empty/invalid channel selection, per the delivery pipeline's honesty
 * requirements — there is no such thing as "deliver to no channel."
 */
export function validateTryServicePayload({ name, phone, templateId, quantity, channels }) {
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
  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      details.push({ field: 'quantity', message: `Quantity must be between 1 and ${MAX_QUANTITY}` });
    }
  }

  let normalizedChannels = channels;
  if (channels === undefined) {
    normalizedChannels = [...DELIVERY_CHANNEL_VALUES];
  } else if (!Array.isArray(channels) || channels.length === 0 || !channels.every((c) => DELIVERY_CHANNEL_VALUES.includes(c))) {
    details.push({ field: 'channels', message: 'Choose at least one delivery method (WhatsApp and/or SMS)' });
  }

  if (details.length) throw ApiError.validation(details);

  return { normalizedPhone, normalizedChannels: [...new Set(normalizedChannels)] };
}

export function validateOrderId(id) {
  if (!/^\d+$/.test(String(id))) {
    throw ApiError.badRequest('Invalid order id');
  }
}

export function validateOrderQuery({ page, limit }) {
  const details = [];
  if (page !== undefined && !/^\d+$/.test(String(page))) details.push({ field: 'page', message: 'Invalid page' });
  if (limit !== undefined && !/^\d+$/.test(String(limit))) details.push({ field: 'limit', message: 'Invalid limit' });
  if (details.length) throw ApiError.validation(details);
}

export function validateOrderStatusUpdate({ status, paymentStatus, deliveryStatus }) {
  const details = [];

  if (status === undefined && paymentStatus === undefined && deliveryStatus === undefined) {
    details.push({ field: 'status', message: 'Provide at least one of status, paymentStatus, or deliveryStatus' });
  }
  if (status !== undefined && !ORDER_STATUS_VALUES.includes(status)) {
    details.push({ field: 'status', message: 'Invalid order status' });
  }
  if (paymentStatus !== undefined && !PAYMENT_STATUS_VALUES.includes(paymentStatus)) {
    details.push({ field: 'paymentStatus', message: 'Invalid payment status' });
  }
  if (deliveryStatus !== undefined && !DELIVERY_STATUS_VALUES.includes(deliveryStatus)) {
    details.push({ field: 'deliveryStatus', message: 'Invalid delivery status' });
  }

  if (details.length) throw ApiError.validation(details);
}
