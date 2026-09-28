/**
 * Ticket-module date/time formatting. Fixed to en-GB day-month-year
 * ("24 October 2026") and 24-hour times ("19:00 – 23:30"), the
 * conventions used on Tanzanian event tickets, rather than whatever
 * locale the browser happens to report.
 */
export function formatTicketDate(dateStr, { weekday = false, short = false } = {}) {
  if (!dateStr) return '';
  const date = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    weekday: weekday ? (short ? 'short' : 'long') : undefined,
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}

export function formatTimeRange(start, end) {
  if (!start) return '';
  return end ? `${start} – ${end}` : start;
}

/** { day: '24', month: 'OCT' } for the calendar badge on event cards. */
export function dateBadgeParts(dateStr) {
  if (!dateStr) return null;
  const date = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
  };
}
