import { api } from './api';

export const billingService = {
  getSummary() {
    return api.get('/billing/me');
  },
  startUpgrade(planId) {
    return api.post('/billing/upgrade', { planId });
  },
};
