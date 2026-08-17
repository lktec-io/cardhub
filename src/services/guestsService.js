import { api } from './api';

export const guestsService = {
  list(eventId, params) {
    return api.get(`/events/${eventId}/guests`, { params });
  },
  stats(eventId) {
    return api.get(`/events/${eventId}/guests/stats`);
  },
  create(eventId, payload) {
    return api.post(`/events/${eventId}/guests`, payload);
  },
  update(eventId, guestId, payload) {
    return api.patch(`/events/${eventId}/guests/${guestId}`, payload);
  },
  remove(eventId, guestId) {
    return api.delete(`/events/${eventId}/guests/${guestId}`);
  },
  bulkRemove(eventId, guestIds) {
    return api.post(`/events/${eventId}/guests/bulk-delete`, { guestIds });
  },
  bulkImport(eventId, guests) {
    return api.post(`/events/${eventId}/guests/bulk-import`, { guests });
  },
};
