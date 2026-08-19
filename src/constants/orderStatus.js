export const ORDER_STATUS_BADGE = {
  pending: 'default',
  processing: 'accent',
  completed: 'success',
  cancelled: 'danger',
};

export const PAYMENT_STATUS_BADGE = {
  unpaid: 'default',
  pending: 'accent',
  paid: 'success',
  failed: 'danger',
};

/** Overall delivery lifecycle across every requested channel — see backend/src/constants/orderStatus.js for the exact meaning of each. */
export const DELIVERY_STATUS_BADGE = {
  pending: 'default',
  processing: 'accent',
  partially_sent: 'warning',
  sent: 'success',
  failed: 'danger',
};

/** Per-channel (SMS/WhatsApp) result — independent of DELIVERY_STATUS and of each other. */
export const CHANNEL_STATUS_BADGE = {
  not_requested: 'default',
  queued: 'accent',
  sent: 'success',
  failed: 'danger',
  unavailable: 'default',
};

export const DELIVERY_CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];

export const ORDER_STATUS_VALUES = ['pending', 'processing', 'completed', 'cancelled'];
export const PAYMENT_STATUS_VALUES = ['unpaid', 'pending', 'paid', 'failed'];
export const DELIVERY_STATUS_VALUES = ['pending', 'processing', 'partially_sent', 'sent', 'failed'];
