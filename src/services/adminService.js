import { api } from './api';

export const adminService = {
  stats() {
    return api.get('/admin/stats');
  },
  listUsers(params) {
    return api.get('/admin/users', { params });
  },
  getUser(id) {
    return api.get(`/admin/users/${id}`);
  },
  updateUserStatus(id, status) {
    return api.patch(`/admin/users/${id}/status`, { status });
  },
  listEvents(params) {
    return api.get('/admin/events', { params });
  },
  listTemplates(params) {
    return api.get('/admin/templates', { params });
  },
  updateTemplateStatus(id, status) {
    return api.patch(`/admin/templates/${id}/status`, { status });
  },
  updateTemplatePricingTier(id, pricingTier) {
    return api.patch(`/admin/templates/${id}/pricing-tier`, { pricingTier });
  },
  listOrders(params) {
    return api.get('/admin/orders', { params });
  },
  getOrder(id) {
    return api.get(`/admin/orders/${id}`);
  },
  updateOrderStatus(id, payload) {
    return api.patch(`/admin/orders/${id}/status`, payload);
  },
  listAuditLogs(params) {
    return api.get('/admin/audit-logs', { params });
  },
  listPayments(params) {
    return api.get('/admin/payments', { params });
  },
  getPayment(id) {
    return api.get(`/admin/payments/${id}`);
  },

  // ---- Invitation card catalogue (multipart: field "image") ----
  listCards() {
    return api.get('/admin/cards');
  },
  createCard(details, file) {
    return api.post('/admin/cards', toForm(details, 'image', file), { timeout: UPLOAD_TIMEOUT });
  },
  updateCard(id, details) {
    return api.put(`/admin/cards/${id}`, details);
  },
  replaceCardImage(id, file) {
    return api.post(`/admin/cards/${id}/image`, toForm({}, 'image', file), { timeout: UPLOAD_TIMEOUT });
  },
  reorderCards(ids) {
    return api.put('/admin/cards/order', { ids });
  },
  deleteCard(id) {
    return api.delete(`/admin/cards/${id}`);
  },

  // ---- Promotional videos (multipart: field "file"; poster field "image") ----
  listMedia(params) {
    return api.get('/admin/media', { params });
  },
  uploadVideo(details, file, onUploadProgress) {
    return api.post('/admin/media/videos', toForm(details, 'file', file), { timeout: 0, onUploadProgress });
  },
  updateMedia(id, details) {
    return api.put(`/admin/media/${id}`, details);
  },
  replaceMediaPoster(id, file) {
    return api.post(`/admin/media/${id}/poster`, toForm({}, 'image', file), { timeout: UPLOAD_TIMEOUT });
  },
  reorderMedia(ids) {
    return api.put('/admin/media/order', { ids });
  },
  deleteMedia(id) {
    return api.delete(`/admin/media/${id}`);
  },

  // ---- Events & tickets ----
  listTicketEvents(params) {
    return api.get('/admin/ticket-events', { params });
  },
  createTicketEvent(details) {
    return api.post('/admin/ticket-events', details);
  },
  getTicketEvent(id) {
    return api.get(`/admin/ticket-events/${id}`);
  },
  updateTicketEvent(id, details) {
    return api.put(`/admin/ticket-events/${id}`, details);
  },
  uploadTicketEventPoster(id, file) {
    return api.post(`/admin/ticket-events/${id}/poster`, toForm({}, 'image', file), { timeout: UPLOAD_TIMEOUT });
  },
  setTicketEventPublished(id, published) {
    return api.post(`/admin/ticket-events/${id}/${published ? 'publish' : 'unpublish'}`);
  },
  saveTicketEventTickets(id, payload) {
    return api.put(`/admin/ticket-events/${id}/tickets`, payload);
  },
  listTicketEventOrders(id, params) {
    return api.get(`/admin/ticket-events/${id}/orders`, { params });
  },
  /** Door scanner: the server decides and admits a ticket at most once. */
  checkInTicket(payload) {
    return api.post('/admin/tickets/check-in', payload);
  },
  checkInStats(eventId) {
    return api.get(`/admin/ticket-events/${eventId}/check-in-stats`);
  },
  // ---- Hard deletes (server re-checks every rule) ----
  eventDeletePreview(id) {
    return api.get(`/admin/events/${id}/delete-preview`);
  },
  deleteEvent(id, confirm) {
    return api.delete(`/admin/events/${id}`, { data: { confirm } });
  },
  deleteTicketOrder(id) {
    return api.delete(`/admin/ticket-orders/${id}`);
  },
  cancelTicket(id) {
    return api.post(`/admin/tickets/${id}/cancel`);
  },
  deleteCardOrder(id) {
    return api.delete(`/admin/orders/${id}`);
  },
  deleteUser(id, confirm) {
    return api.delete(`/admin/users/${id}`, { data: { confirm } });
  },
  deleteAuditLog(id) {
    return api.delete(`/admin/audit-logs/${id}`);
  },
  auditPurgePreview(olderThanDays) {
    return api.get('/admin/audit-logs/purge-preview', { params: { olderThanDays } });
  },
  purgeAuditLogs(olderThanDays, confirm) {
    return api.post('/admin/audit-logs/purge', { olderThanDays, confirm });
  },
  listSecurityEvents(params) {
    return api.get('/admin/security-events', { params });
  },
  listTicketEventTickets(id, params) {
    return api.get(`/admin/ticket-events/${id}/tickets`, { params });
  },
};

const UPLOAD_TIMEOUT = 120000;

function toForm(fields, fileField, file) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => value !== undefined && value !== null && form.append(key, value));
  if (file) form.append(fileField, file);
  return form;
}
