import { api } from './api';

export const usersService = {
  updateProfile(payload) {
    return api.patch('/users/me', payload);
  },
  changePassword(payload) {
    return api.patch('/users/me/password', payload);
  },
  getPreferences() {
    return api.get('/users/me/preferences');
  },
  updatePreferences(payload) {
    return api.patch('/users/me/preferences', payload);
  },
};
