import { ApiError } from '../utils/ApiError.js';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { TIME_RE, isValidCalendarDate } from '../utils/dateTime.js';

const HTML_RE = /[<>]/;

/** Event details as edited in the admin portal (create + update share one shape). */
export function validateAdminEventDetails(body = {}) {
  const details = [];
  const str = (value) => (typeof value === 'string' ? value.trim() : '');
  const field = (name, label, { min = 0, max, required = false }) => {
    const v = str(body[name]).replace(/[ \t]+/g, ' ');
    if (required && !v) details.push({ field: name, message: `${label} is required` });
    else if (v && (v.length < min || v.length > max)) details.push({ field: name, message: `${label} must be ${min ? `${min}–` : 'up to '}${max} characters` });
    else if (v && name !== 'description' && HTML_RE.test(v)) details.push({ field: name, message: `${label} can’t contain < or >` });
    return v || null;
  };

  const title = field('title', 'Event title', { min: 2, max: 190, required: true });
  const description = field('description', 'Description', { max: 5000 });
  if (description && /<\s*\/?\s*script/i.test(description)) details.push({ field: 'description', message: 'Description can’t contain scripts' });
  const venueName = field('venueName', 'Venue', { max: 190, required: true });
  const venueAddress = field('venueAddress', 'Location / address', { max: 255 });
  const hostName = field('hostName', 'Organizer name', { max: 190 });
  const organizerContact = field('organizerContact', 'Organizer contact', { max: 190 });

  if (!EVENT_TYPES.includes(body.eventType)) details.push({ field: 'eventType', message: 'Choose a category' });
  const eventDate = str(body.eventDate);
  if (!isValidCalendarDate(eventDate)) details.push({ field: 'eventDate', message: 'Choose the event date' });
  const eventTime = str(body.eventTime) || null;
  if (eventTime && !TIME_RE.test(eventTime)) details.push({ field: 'eventTime', message: 'Use a 24-hour time, e.g. 19:00' });
  const endTime = str(body.endTime) || null;
  if (endTime && !TIME_RE.test(endTime)) details.push({ field: 'endTime', message: 'Use a 24-hour time, e.g. 23:30' });

  if (details.length) throw ApiError.validation(details);
  return { title, description, eventType: body.eventType, eventDate, eventTime, endTime, venueName, venueAddress, hostName, organizerContact };
}
