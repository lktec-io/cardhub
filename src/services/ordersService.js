import { api } from './api';

export const ordersService = {
  /** Public, unauthenticated — the /try conversion flow. */
  submitTryService(payload) {
    return api.post('/public/orders/try', payload);
  },
  list(params) {
    return api.get('/orders', { params });
  },
  getOne(id) {
    return api.get(`/orders/${id}`);
  },
};
