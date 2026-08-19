import { api } from './api';

export const ordersService = {
  /** Public, unauthenticated — the /try conversion flow. `payload` includes `channels` (['whatsapp'|'sms', ...]) and `idempotencyKey`. */
  submitTryService(payload) {
    return api.post('/public/orders/try', payload);
  },
  /** Public, unauthenticated — the order confirmation page reached via the SMS/WhatsApp link. */
  getByToken(token) {
    return api.get(`/public/orders/${token}`);
  },
  list(params) {
    return api.get('/orders', { params });
  },
  getOne(id) {
    return api.get(`/orders/${id}`);
  },
};
