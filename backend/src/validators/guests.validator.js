import { ApiError } from '../utils/ApiError.js';
import { RSVP_STATUS_VALUES } from '../constants/rsvpStatus.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const MAX_PARTY_SIZE = 20;
const MAX_GUESTS_PER_IMPORT = 500;

function cleanText(details, field, value, { required = false, maxLength = 190, label }) {
  if (value === undefined || value === null || value === '') {
    if (required) details.push({ field, message: `${label} is required` });
    return;
  }
  if (typeof value !== 'string') {
    details.push({ field, message: `${label} must be text` });
    return;
  }
  if (value.length > maxLength) details.push({ field, message: `${label} must be ${maxLength} characters or fewer` });
  if (/[<>]/.test(value)) details.push({ field, message: `${label} cannot contain HTML` });
}

function validateCommon(payload, details, { partial }) {
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);

  if (!partial || has('name')) {
    cleanText(details, 'name', payload.name, { required: true, maxLength: 190, label: 'Guest name' });
  }
  if (has('phone') && payload.phone) {
    if (!PHONE_RE.test(payload.phone)) details.push({ field: 'phone', message: 'Phone number is invalid' });
  }
  if (has('email') && payload.email) {
    if (!EMAIL_RE.test(payload.email)) details.push({ field: 'email', message: 'Email is invalid' });
  }
  if (has('partySize') && payload.partySize !== undefined && payload.partySize !== null) {
    const size = Number(payload.partySize);
    if (!Number.isInteger(size) || size < 1 || size > MAX_PARTY_SIZE) {
      details.push({ field: 'partySize', message: `Party size must be between 1 and ${MAX_PARTY_SIZE}` });
    }
  }
  if (has('status') && payload.status !== undefined) {
    if (!RSVP_STATUS_VALUES.includes(payload.status)) {
      details.push({ field: 'status', message: 'Invalid RSVP status' });
    }
  }
  if (has('notes')) {
    cleanText(details, 'notes', payload.notes, { maxLength: 500, label: 'Notes' });
  }
}

export function validateCreateGuestPayload(payload) {
  const details = [];
  validateCommon(payload, details, { partial: false });
  if (details.length) throw ApiError.validation(details);
}

export function validateUpdateGuestPayload(payload) {
  const details = [];
  if (Object.keys(payload).length === 0) throw ApiError.badRequest('No changes were provided');
  validateCommon(payload, details, { partial: true });
  if (details.length) throw ApiError.validation(details);
}

export function validateGuestQuery({ page, limit, search, status }) {
  const details = [];
  if (page !== undefined && !/^\d+$/.test(String(page))) details.push({ field: 'page', message: 'Page must be a positive number' });
  if (limit !== undefined && !/^\d+$/.test(String(limit))) details.push({ field: 'limit', message: 'Limit must be a positive number' });
  if (search && (typeof search !== 'string' || search.length > 100)) details.push({ field: 'search', message: 'Search term is too long' });
  if (status && !RSVP_STATUS_VALUES.includes(status)) details.push({ field: 'status', message: 'Invalid RSVP status filter' });
  if (details.length) throw ApiError.validation(details);
}

export function validateGuestId(id) {
  if (!/^\d+$/.test(String(id))) throw ApiError.badRequest('Invalid guest id');
}

export function validateBulkDeletePayload({ guestIds }) {
  if (!Array.isArray(guestIds) || guestIds.length === 0 || guestIds.length > 500) {
    throw ApiError.badRequest('Provide between 1 and 500 guest ids');
  }
  if (!guestIds.every((id) => /^\d+$/.test(String(id)))) {
    throw ApiError.badRequest('Invalid guest id in list');
  }
}

/**
 * Partial-success by design: an import with 200 good rows and 3 bad ones
 * should still import the 200, not reject the whole batch. Returns
 * { valid, invalid } rather than throwing — the service layer inserts
 * `valid` and reports `invalid` back to the customer.
 */
export function validateBulkImportPayload({ guests }) {
  if (!Array.isArray(guests) || guests.length === 0) {
    throw ApiError.badRequest('Provide at least one guest to import');
  }
  if (guests.length > MAX_GUESTS_PER_IMPORT) {
    throw ApiError.badRequest(`You can import up to ${MAX_GUESTS_PER_IMPORT} guests at a time`);
  }

  const valid = [];
  const invalid = [];

  guests.forEach((guest, index) => {
    const rowErrors = [];
    cleanText(rowErrors, 'name', guest?.name, { required: true, maxLength: 190, label: 'Name' });
    if (guest?.phone && !PHONE_RE.test(guest.phone)) rowErrors.push({ field: 'phone', message: 'Invalid phone' });
    if (guest?.email && !EMAIL_RE.test(guest.email)) rowErrors.push({ field: 'email', message: 'Invalid email' });

    if (rowErrors.length) {
      invalid.push({ row: index, name: guest?.name, errors: rowErrors });
    } else {
      valid.push({ name: guest.name, phone: guest.phone || null, email: guest.email || null, partySize: guest.partySize || 1 });
    }
  });

  return { valid, invalid };
}
