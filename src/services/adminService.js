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
  updateTemplatePricingTier(id, pricingTier) {
    return api.patch(`/admin/templates/${id}/pricing-tier`, { pricingTier });
  },
  listOrders(params) {
    return api.get('/admin/orders', { params });
  },
  getOrder(id) {
    return api.get(`/admin/orders/${id}`);
  },
  updateOrderStatus(id, payload) {
    return api.patch(`/admin/orders/${id}/status`, payload);
  },
  listAuditLogs(params) {
    return api.get('/admin/audit-logs', { params });
  },
};
