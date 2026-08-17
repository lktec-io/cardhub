import { ApiError } from '../utils/ApiError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactPayload({ name, email, message }) {
  const details = [];

  if (!name || name.trim().length < 2) {
    details.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  if (!email || !EMAIL_RE.test(email)) {
    details.push({ field: 'email', message: 'A valid email is required' });
  }
  if (!message || message.trim().length < 10) {
    details.push({ field: 'message', message: 'Message must be at least 10 characters' });
  }

  if (details.length) {
    throw ApiError.validation(details);
  }
}
