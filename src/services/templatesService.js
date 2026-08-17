import { api } from './api';

export const templatesService = {
  list(params) {
    return api.get('/templates', { params });
  },
  getOne(id) {
    return api.get(`/templates/${id}`);
  },
};
