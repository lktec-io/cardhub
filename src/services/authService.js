import { api } from './api';

export const authService = {
  register(payload) {
    return api.post('/auth/register', payload);
  },
  login(credentials) {
    return api.post('/auth/login', credentials);
  },
  refresh() {
    return api.post('/auth/refresh');
  },
  logout() {
    return api.post('/auth/logout');
  },
  me() {
    return api.get('/auth/me');
  },
  forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
  },
  resetPassword({ token, password }) {
    return api.post('/auth/reset-password', { token, password });
  },
};
