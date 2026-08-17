import { api } from './api';

export const notificationsService = {
  list(params) {
    return api.get('/notifications', { params });
  },
  unreadCount() {
    return api.get('/notifications/unread-count');
  },
  markRead(id) {
    return api.patch(`/notifications/${id}/read`);
  },
  markAllRead() {
    return api.post('/notifications/read-all');
  },
};
