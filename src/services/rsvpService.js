import { api } from './api';

export const rsvpService = {
  submit(slug, payload) {
    return api.post(`/public/invitations/${slug}/rsvp`, payload);
  },
};
