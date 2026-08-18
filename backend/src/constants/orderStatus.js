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

export const DELIVERY_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
};
export const DELIVERY_STATUS_VALUES = Object.values(DELIVERY_STATUS);

export const ORDER_SOURCE = {
  TRY_SERVICE: 'try_service',
  DASHBOARD: 'dashboard',
};
