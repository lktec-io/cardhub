import { ApiError } from '../utils/ApiError.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { EVENT_SORT_OPTIONS } from '../constants/eventSort.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'));

function isValidCalendarDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function pushIfInvalidText(details, field, value, { required = false, maxLength = 190, label }) {
  if (value === undefined || value === null || value === '') {
    if (required) details.push({ field, message: `${label} is required` });
    return;
  }
  if (typeof value !== 'string') {
    details.push({ field, message: `${label} must be text` });
    return;
  }
  if (value.length > maxLength) {
    details.push({ field, message: `${label} must be ${maxLength} characters or fewer` });
  }
  if (/[<>]/.test(value)) {
    details.push({ field, message: `${label} cannot contain HTML` });
  }
}

function validateCommonFields(payload, details, { partial }) {
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);

  if (!partial || has('title')) {
    pushIfInvalidText(details, 'title', payload.title, { required: true, maxLength: 190, label: 'Event name' });
  }
  if (!partial || has('eventType')) {
    if (!payload.eventType || !EVENT_TYPES.includes(payload.eventType)) {
      details.push({ field: 'eventType', message: 'Please choose a valid event type' });
    }
  }
  if (has('hostName')) {
    pushIfInvalidText(details, 'hostName', payload.hostName, { maxLength: 190, label: 'Host name' });
  }
  if (has('eventDate') && payload.eventDate) {
    if (!isValidCalendarDate(payload.eventDate)) {
      details.push({ field: 'eventDate', message: 'Please enter a valid date (YYYY-MM-DD)' });
    }
  }
  if (has('eventTime') && payload.eventTime) {
    if (!TIME_RE.test(payload.eventTime)) {
      details.push({ field: 'eventTime', message: 'Please enter a valid time (HH:MM)' });
    }
  }
  if (!partial || has('timezone')) {
    if (!payload.timezone || !VALID_TIMEZONES.has(payload.timezone)) {
      details.push({ field: 'timezone', message: 'Please choose a valid timezone' });
    }
  }
  if (has('venueName')) {
    pushIfInvalidText(details, 'venueName', payload.venueName, { maxLength: 190, label: 'Venue name' });
  }
  if (has('venueAddress')) {
    pushIfInvalidText(details, 'venueAddress', payload.venueAddress, { maxLength: 255, label: 'Venue address' });
  }
  if (has('description')) {
    pushIfInvalidText(details, 'description', payload.description, { maxLength: 2000, label: 'Description' });
  }
}

export function validateCreateEventPayload(payload) {
  const details = [];

  if (!payload.templateId || !/^\d+$/.test(String(payload.templateId))) {
    details.push({ field: 'templateId', message: 'Please choose a template' });
  }
  validateCommonFields(payload, details, { partial: false });

  if (details.length) throw ApiError.validation(details);
}

export function validateUpdateEventPayload(payload) {
  const details = [];

  if (Object.keys(payload).length === 0) {
    throw ApiError.badRequest('No changes were provided');
  }

  validateCommonFields(payload, details, { partial: true });

  if (details.length) throw ApiError.validation(details);
}

export function validateChangeTemplatePayload({ templateId }) {
  if (!templateId || !/^\d+$/.test(String(templateId))) {
    throw ApiError.validation([{ field: 'templateId', message: 'Please choose a valid template' }]);
  }
}

export function validateEventQuery({ page, limit, search, sort }) {
  const details = [];

  if (page !== undefined && !/^\d+$/.test(String(page))) {
    details.push({ field: 'page', message: 'Page must be a positive number' });
  }
  if (limit !== undefined && !/^\d+$/.test(String(limit))) {
    details.push({ field: 'limit', message: 'Limit must be a positive number' });
  }
  if (search && (typeof search !== 'string' || search.length > 100)) {
    details.push({ field: 'search', message: 'Search term is too long' });
  }
  if (sort && !Object.prototype.hasOwnProperty.call(EVENT_SORT_OPTIONS, sort)) {
    details.push({ field: 'sort', message: 'Unknown sort option' });
  }

  if (details.length) throw ApiError.validation(details);
}

export function validateEventId(id) {
  if (!/^\d+$/.test(String(id))) {
    throw ApiError.badRequest('Invalid event id');
  }
}
