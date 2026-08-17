import { ApiError } from '../utils/ApiError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterPayload({ name, email, password, phone }) {
  const details = [];

  if (!name || name.trim().length < 2) {
    details.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  if (!email || !EMAIL_RE.test(email)) {
    details.push({ field: 'email', message: 'A valid email is required' });
  }
  if (!password || password.length < 8) {
    details.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }
  if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) {
    details.push({ field: 'phone', message: 'Phone number is invalid' });
  }

  if (details.length) {
    throw ApiError.validation(details);
  }
}

export function validateLoginPayload({ email, password }) {
  const details = [];

  if (!email || !EMAIL_RE.test(email)) {
    details.push({ field: 'email', message: 'A valid email is required' });
  }
  if (!password) {
    details.push({ field: 'password', message: 'Password is required' });
  }

  if (details.length) {
    throw ApiError.validation(details);
  }
}

export function validateForgotPasswordPayload({ email }) {
  if (!email || !EMAIL_RE.test(email)) {
    throw ApiError.validation([{ field: 'email', message: 'A valid email is required' }]);
  }
}

export function validateResetPasswordPayload({ token, password }) {
  const details = [];

  if (!token || typeof token !== 'string') {
    details.push({ field: 'token', message: 'Reset token is required' });
  }
  if (!password || password.length < 8) {
    details.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  if (details.length) {
    throw ApiError.validation(details);
  }
}
