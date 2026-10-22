/** Server `{ error: { details: [{ field, message }] } }` -> `{ field: message }`. */
export function fieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  return Array.isArray(details) ? Object.fromEntries(details.map((d) => [d.field, d.message])) : {};
}

/** Returns a new array with items[index] moved one step (direction -1 / +1), or the same array if it can't move. */
export function moveItem(items, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const formatTzs = (value) => `TSh ${new Intl.NumberFormat('en-TZ').format(value || 0)}`;

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "2026-12-12" -> "Sat, 12 Dec 2026" without timezone drift. */
export function formatEventDate(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const EMPTY_EVENT_DETAILS = {
  title: '',
  eventType: 'party',
  eventDate: '',
  eventTime: '',
  endTime: '',
  venueName: '',
  venueAddress: '',
  description: '',
  hostName: '',
  organizerContact: '',
};

/** API event -> form values (nulls become empty strings). */
export function toDetailsForm(event) {
  return Object.fromEntries(Object.keys(EMPTY_EVENT_DETAILS).map((key) => [key, event[key] ?? '']));
}

/** Instant feedback only; the API re-validates (backend/src/validators/adminEvents.validator.js). */
export function validateEventDetails(details) {
  const errors = {};
  if (details.title.trim().length < 2) errors.title = 'Add the event title';
  if (!details.eventDate) errors.eventDate = 'Choose the event date';
  if (!details.venueName.trim()) errors.venueName = 'Add the venue';
  return errors;
}
