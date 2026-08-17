import { api } from './api';

export const contactService = {
  submit(payload) {
    return api.post('/contact', payload);
  },
};
