import { api } from './api';

export const invitationService = {
  getConfig(eventId) {
    return api.get(`/events/${eventId}/invitation`);
  },
  updateConfig(eventId, config) {
    return api.patch(`/events/${eventId}/invitation`, config);
  },
};
