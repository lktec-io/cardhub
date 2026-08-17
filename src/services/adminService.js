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
  listAuditLogs(params) {
    return api.get('/admin/audit-logs', { params });
  },
};
