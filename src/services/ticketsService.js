import { api } from './api';

/**
 * Public ticket marketplace API (backend/src/routes/v1/tickets.routes.js).
 * No price is ever sent from here: the server computes every total from
 * the ticket type's own database row.
 */
export const ticketsService = {
  listEvents(params) {
    return api.get('/tickets/events', { params });
  },
  getEvent(slug) {
    return api.get(`/tickets/events/${slug}`);
  },
  createOrder(payload) {
    return api.post('/tickets/orders', payload);
  },
  getOrder(token) {
    return api.get(`/tickets/orders/${token}`);
  },
  /** Starts (or resumes) the payment. `phone` is the payer's mobile-money number. There is no PIN field. */
  startPayment(token, { phone } = {}) {
    return api.post(`/tickets/orders/${token}/pay`, { phone });
  },
  /** DEMO PAYMENT MODE only. Sends no body: the demo PIN is checked in the browser and never transmitted. */
  confirmDemoPayment(token) {
    return api.post(`/tickets/orders/${token}/demo-confirm`);
  },
  getTicket(token) {
    return api.get(`/tickets/pass/${token}`);
  },
  verifyTicket(token) {
    return api.get(`/tickets/verify/${token}`);
  },
};
