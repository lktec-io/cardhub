import { api } from './api';

export const checkoutService = {
  /** Public, unauthenticated — creates a real order + a pending payment, then asks the provider to start checkout. Never returns a "paid" status itself. */
  initiate(payload) {
    return api.post('/public/checkout', payload);
  },
  /** Public, unauthenticated — the payment-status screen polls this, keyed by the order's own unguessable token. */
  getStatus(token) {
    return api.get(`/public/checkout/${token}/status`);
  },
};
