import { PAYMENT_STATUS } from './paymentStatus.js';

/**
 * A ticket order's status deliberately reuses the payment-attempt
 * vocabulary (constants/paymentStatus.js) — pending, processing, paid,
 * failed, cancelled, expired — so an order and its payment row can never
 * describe the same state with different words.
 */
export const TICKET_ORDER_STATUS = PAYMENT_STATUS;

/** States that still hold reserved inventory. */
export const TICKET_ORDER_OPEN_STATUSES = [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING];

/** Lifecycle of a single issued admission. `used` is set by a future door-scanner/check-in module. */
export const TICKET_STATUS = {
  VALID: 'valid',
  USED: 'used',
  CANCELLED: 'cancelled',
};

export const TICKET_TYPE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

/** How long a pending checkout holds its tickets before they return to sale. */
export const TICKET_RESERVATION_MINUTES = 15;

/** Hard server-side ceiling per order, on top of each type's own max_per_order. */
export const TICKET_MAX_QUANTITY_PER_ORDER = 20;

export const TICKET_PAYMENT_MODES = {
  DEMO: 'demo',
  LIVE: 'live',
};
