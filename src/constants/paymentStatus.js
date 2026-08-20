/**
 * The detailed lifecycle of a single payment ATTEMPT (payments.status),
 * mirroring backend/src/constants/paymentStatus.js exactly — deliberately
 * separate from orderStatus.js's simpler unpaid/pending/paid/failed
 * order-level rollup, since one order can have more than one payment row.
 */
export const PAYMENT_ATTEMPT_STATUS_VALUES = ['pending', 'processing', 'paid', 'failed', 'cancelled', 'expired'];

export const PAYMENT_ATTEMPT_STATUS_BADGE = {
  pending: 'accent',
  processing: 'accent',
  paid: 'success',
  failed: 'danger',
  cancelled: 'default',
  expired: 'warning',
};

export const PAYMENT_METHOD_VALUES = ['mobile_money'];
