/** Shared calendar-date / 24h-time validation — used by events.validator.js and orders.validator.js so the rule only exists once. */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_TIMEZONE = 'Africa/Dar_es_Salaam';

/** Today's calendar date (YYYY-MM-DD) in the given IANA timezone. Independent of the server's own clock timezone. */
export function todayInTimezone(timeZone = DEFAULT_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
}

/** Pure calendar arithmetic on a YYYY-MM-DD string. */
export function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD string. */
export function weekdayOf(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function isValidCalendarDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
