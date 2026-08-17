import { ApiError } from '../utils/ApiError.js';
import { RSVP_RESPONSE_VALUES } from '../constants/rsvpStatus.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

export function validateRsvpSubmission(payload) {
  const details = [];

  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
    details.push({ field: 'name', message: 'Please tell us your name' });
  } else if (payload.name.length > 190 || /[<>]/.test(payload.name)) {
    details.push({ field: 'name', message: 'Name is invalid' });
  }

  if (payload.phone && (typeof payload.phone !== 'string' || !PHONE_RE.test(payload.phone))) {
    details.push({ field: 'phone', message: 'Phone number is invalid' });
  }
  if (payload.email && (typeof payload.email !== 'string' || !EMAIL_RE.test(payload.email))) {
    details.push({ field: 'email', message: 'Email is invalid' });
  }
  if (!payload.status || !RSVP_RESPONSE_VALUES.includes(payload.status)) {
    details.push({ field: 'status', message: 'Please choose whether you can attend' });
  }
  if (payload.partySize !== undefined && payload.partySize !== null) {
    const size = Number(payload.partySize);
    if (!Number.isInteger(size) || size < 1 || size > 20) {
      details.push({ field: 'partySize', message: 'Party size must be between 1 and 20' });
    }
  }

  if (details.length) throw ApiError.validation(details);
}
