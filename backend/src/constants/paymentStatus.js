/**
 * The detailed lifecycle of a single payment ATTEMPT (payments.status) —
 * deliberately separate from orders.payment_status (a simpler
 * unpaid/pending/paid/failed rollup already used elsewhere). One order
 * could in principle have more than one payment row (e.g. a failed
 * attempt followed by a successful retry); the order's own
 * payment_status always reflects the most recent outcome.
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

/**
 * Explicit allow-list of legal manual/internal transitions. paid/failed/
 * cancelled/expired are terminal for everything EXCEPT a genuinely
 * verified provider webhook, which is handled as a deliberate special
 * case in payment.service.js (a late webhook confirming a payment we'd
 * already marked "expired" is allowed to still mark it "paid" — the
 * provider is the one authoritative source of truth for that specific
 * transition, per the explicit "unless there is a legitimate verified
 * provider confirmation" carve-out). Everything else must go through
 * this map.
 */
const TRANSITIONS = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.EXPIRED],
  [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.EXPIRED],
  [PAYMENT_STATUS.PAID]: [],
  [PAYMENT_STATUS.FAILED]: [],
  [PAYMENT_STATUS.CANCELLED]: [],
  [PAYMENT_STATUS.EXPIRED]: [],
};

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export const PAYMENT_METHODS = {
  MOBILE_MONEY: 'mobile_money',
};
export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHODS);
