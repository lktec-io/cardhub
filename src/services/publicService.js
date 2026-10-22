import { api } from './api';

export const publicService = {
  getInvitation(slug) {
    return api.get(`/public/invitations/${slug}`);
  },
  /** Published event videos for the home page showcase (admin-managed). */
  listVideos() {
    return api.get('/public/media/videos');
  },
};
