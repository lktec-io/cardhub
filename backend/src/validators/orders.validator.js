import { ApiError } from '../utils/ApiError.js';
import { ORDER_STATUS_VALUES, PAYMENT_STATUS_VALUES, DELIVERY_STATUS_VALUES } from '../constants/orderStatus.js';

const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const NAME_MAX = 150;
const MAX_QUANTITY = 500;

export function validateTryServicePayload({ name, phone, templateId, quantity }) {
  const details = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > NAME_MAX) {
    details.push({ field: 'name', message: 'Full name is required' });
  }
  if (!phone || typeof phone !== 'string' || !PHONE_RE.test(phone)) {
    details.push({ field: 'phone', message: 'A valid phone number is required' });
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

  if (details.length) throw ApiError.validation(details);
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
