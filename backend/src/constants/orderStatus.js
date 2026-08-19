export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};
export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
};
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

/**
 * Overall delivery lifecycle across every requested channel (migration
 * 018). "sent" means every requested channel was accepted by its
 * provider — never "the recipient actually received it" (see
 * CHANNEL_STATUS below, and services/delivery.service.js).
 */
export const DELIVERY_STATUS = {
  PENDING: 'pending', // delivery has not started
  PROCESSING: 'processing', // at least one channel is being attempted
  PARTIALLY_SENT: 'partially_sent', // one requested channel succeeded, another failed/unavailable
  SENT: 'sent', // every requested channel was accepted by its provider
  FAILED: 'failed', // every requested channel failed or was unavailable
};
export const DELIVERY_STATUS_VALUES = Object.values(DELIVERY_STATUS);

/** Per-channel result (orders.sms_status / orders.whatsapp_status) — independent of DELIVERY_STATUS and of each other. */
export const CHANNEL_STATUS = {
  NOT_REQUESTED: 'not_requested',
  QUEUED: 'queued', // provider accepted the message — not proof the recipient received it
  SENT: 'sent',
  FAILED: 'failed',
  UNAVAILABLE: 'unavailable', // provider not configured
};
export const CHANNEL_STATUS_VALUES = Object.values(CHANNEL_STATUS);

export const DELIVERY_CHANNELS = {
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
};
export const DELIVERY_CHANNEL_VALUES = Object.values(DELIVERY_CHANNELS);

export const ORDER_SOURCE = {
  TRY_SERVICE: 'try_service',
  DASHBOARD: 'dashboard',
};
