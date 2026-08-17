import { api } from './api';

export const publicService = {
  getInvitation(slug) {
    return api.get(`/public/invitations/${slug}`);
  },
};
