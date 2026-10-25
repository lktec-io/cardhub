import { withTransaction } from '../utils/withTransaction.js';
import { maskPhone } from '../utils/serializeTicket.js';
import { TICKET_TOKEN_RE } from '../utils/ticketCode.js';
import { ticketRepository } from '../repositories/ticket.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { TICKET_ORDER_STATUS, TICKET_STATUS } from '../constants/ticketStatus.js';

/** QR content is ".../ticket/verify/<token>"; staff may also type the ticket code (CH-XXXXXXXX). */
const VERIFY_PATH_RE = /\/ticket\/verify\/([A-Za-z0-9_-]{43})(?:[/?#]|$)/;
const CODE_RE = /^(?:CH-?)?([0-9A-HJKMNP-TV-Z]{8})$/;

/** Turns whatever the scanner/keyboard produced into { token } or { ticketCode }, or null. */
export function parseCheckInInput(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value || value.length > 300) return null;
  const fromUrl = VERIFY_PATH_RE.exec(value);
  if (fromUrl) return { token: fromUrl[1] };
  if (TICKET_TOKEN_RE.test(value)) return { token: value };
  // Crockford base32: read-aloud mix-ups (O->0, I/L->1) are normalised.
  const code = CODE_RE.exec(value.toUpperCase().replace(/\s+/g, '').replace(/O/g, '0').replace(/[IL]/g, '1'));
  return code ? { ticketCode: `CH-${code[1]}` } : null;
}

const toIso = (value) => (value ? `${String(value).replace(' ', 'T')}Z` : null);

function ticketView(row, checkedInAt = row.checked_in_at) {
  return {
    ticketId: row.ticket_code,
    holderName: row.holder_name,
    holderPhone: maskPhone(row.holder_phone),
    ticketType: row.ticket_type_name,
    isDemo: Boolean(Number(row.is_demo)),
    checkedInAt: toIso(checkedInAt),
    checkedInBy: row.checked_in_by_name || null,
    event: { id: row.event_id, title: row.event_title, date: row.event_date, startTime: row.event_time ? String(row.event_time).slice(0, 5) : null, venue: row.venue_name },
  };
}

/**
 * Admin → Scan & verify. The database decides: the ticket row is locked
 * FOR UPDATE and admitted with a conditional UPDATE in one transaction,
 * so only the first scan anywhere is ACCEPTED and every later one is
 * ALREADY_USED, even when two phones scan the same QR at the same moment.
 *
 * Results: ACCEPTED | ALREADY_USED | CANCELLED | INVALID (reason:
 * MALFORMED, NOT_FOUND, NOT_PAID, WRONG_EVENT). Always a 200 with a
 * verdict; a network failure is the client's to report, never "valid".
 */
export const ticketCheckInService = {
  async checkIn({ code, eventId }, staffUserId, requestMeta) {
    const lookup = parseCheckInInput(code);
    if (!lookup) return { result: 'INVALID', reason: 'MALFORMED' };

    const outcome = await withTransaction(async (conn) => {
      const row = await ticketRepository.lockForCheckIn(lookup, conn);
      if (!row) return { result: 'INVALID', reason: 'NOT_FOUND' };
      if (eventId && Number(row.event_id) !== Number(eventId)) return { result: 'INVALID', reason: 'WRONG_EVENT', ticket: ticketView(row) };
      if (row.order_status !== TICKET_ORDER_STATUS.PAID) return { result: 'INVALID', reason: 'NOT_PAID', ticket: ticketView(row) };
      if (row.status === TICKET_STATUS.CANCELLED) return { result: 'CANCELLED', ticket: ticketView(row) };
      if (row.status === TICKET_STATUS.USED) return { result: 'ALREADY_USED', ticket: ticketView(row) };

      const admitted = await ticketRepository.markCheckedIn(row.id, staffUserId, conn);
      if (!admitted) return { result: 'ALREADY_USED', ticket: ticketView(row) };
      const checkedInAt = await ticketRepository.findCheckInTime(row.id, conn);
      return { result: 'ACCEPTED', ticketRowId: row.id, eventId: row.event_id, ticket: ticketView(row, checkedInAt) };
    });

    if (outcome.result === 'ACCEPTED') {
      await auditLogRepository.record({
        userId: staffUserId,
        action: 'ticket.checked_in',
        entityType: 'ticket',
        entityId: outcome.ticketRowId,
        metadata: { eventId: outcome.eventId, ticketId: outcome.ticket.ticketId },
        ipAddress: requestMeta?.ipAddress,
        userAgent: requestMeta?.userAgent,
      });
    }
    const { ticketRowId, eventId: _eventId, ...response } = outcome; // eslint-disable-line no-unused-vars
    return response;
  },

  async stats(eventId) {
    return ticketRepository.checkInStats(eventId);
  },
};
