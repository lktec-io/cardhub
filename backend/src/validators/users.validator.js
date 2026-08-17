import { ApiError } from '../utils/ApiError.js';

const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const LANGUAGES = ['en', 'sw'];

export function validateUpdateProfilePayload({ name, phone }) {
  const details = [];

  if (!name || name.trim().length < 2) {
    details.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  if (phone && !PHONE_RE.test(phone)) {
    details.push({ field: 'phone', message: 'Phone number is invalid' });
  }

  if (details.length) {
    throw ApiError.validation(details);
  }
}

export function validateChangePasswordPayload({ currentPassword, newPassword }) {
  const details = [];

  if (!currentPassword) {
    details.push({ field: 'currentPassword', message: 'Current password is required' });
  }
  if (!newPassword || newPassword.length < 8) {
    details.push({ field: 'newPassword', message: 'New password must be at least 8 characters' });
  }
  if (currentPassword && newPassword && currentPassword === newPassword) {
    details.push({ field: 'newPassword', message: 'New password must be different from the current password' });
  }

  if (details.length) {
    throw ApiError.validation(details);
  }
}

export function validateUpdatePreferencesPayload({ preferredLanguage }) {
  if (preferredLanguage !== undefined && !LANGUAGES.includes(preferredLanguage)) {
    throw ApiError.validation([{ field: 'preferredLanguage', message: 'Unsupported language' }]);
  }
}
