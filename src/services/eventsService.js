import { api } from './api';

export const eventsService = {
  list(params) {
    return api.get('/events', { params });
  },
  create(payload) {
    return api.post('/events', payload);
  },
  getOne(id) {
    return api.get(`/events/${id}`);
  },
  update(id, payload) {
    return api.patch(`/events/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/events/${id}`);
  },
  duplicate(id) {
    return api.post(`/events/${id}/duplicate`);
  },
  changeTemplate(id, templateId) {
    return api.patch(`/events/${id}/template`, { templateId });
  },
  publish(id) {
    return api.post(`/events/${id}/publish`);
  },
  unpublish(id) {
    return api.post(`/events/${id}/unpublish`);
  },
  analytics(id) {
    return api.get(`/events/${id}/analytics`);
  },
  /** Event Workspace → Tickets: settings, tiers and sales stats for one owned event. */
  getTickets(id) {
    return api.get(`/events/${id}/tickets`);
  },
  /** Saves the whole ticket setup at once; the server validates and applies it in one transaction. */
  saveTickets(id, payload) {
    return api.put(`/events/${id}/tickets`, payload);
  },
};
