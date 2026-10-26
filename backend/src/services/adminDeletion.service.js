import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { withTransaction } from '../utils/withTransaction.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { deletionRepository } from '../repositories/deletion.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { mediaStorage } from './providers/mediaStorage.js';

export const AUDIT_PURGE_PHRASE = 'DELETE AUDIT LOGS';
export const EVENT_DELETE_PHRASE = 'DELETE';
const DELETABLE_TICKET_ORDER_STATUSES = ['expired', 'failed', 'cancelled'];
const MIN_AUDIT_RETENTION_DAYS = 30;

/** Every destructive action: an append-only security event (survives audit-log purges) + a server log line. */
async function trace(actor, action, entityType, entityId, summary, metadata) {
  const user = await userRepository.findById(actor.userId).catch(() => null);
  await deletionRepository.recordSecurityEvent({
    actorUserId: actor.userId,
    actorEmail: user?.email ?? null,
    action,
    entityType,
    entityId,
    summary,
    metadata,
    ipAddress: actor.ipAddress,
  });
  logger.warn('Admin hard delete', { action, entityType, entityId, actorUserId: actor.userId });
}

function requirePhrase(given, expected) {
  if (typeof given !== 'string' || given.trim() !== expected) {
    throw ApiError.validation([{ field: 'confirm', message: `Type ${expected} to confirm` }]);
  }
}

/**
 * Admin hard deletes. Each one re-checks eligibility inside a transaction
 * with the row locked, so the rule that allowed the delete is still true
 * when the DELETE runs. Paid/financial history is never removed: those
 * records are refused (409) with the safe alternative named.
 */
export const adminDeletionService = {
  // ---------------- events ----------------
  async previewEvent(id) {
    const event = await withTransaction((conn) => deletionRepository.lockEvent(id, conn));
    if (!event) throw ApiError.notFound('Event not found');
    const scope = await deletionRepository.eventDependents(id);
    const blockedReason = scope.ticketOrders
      ? `This event has ${scope.ticketOrders} ticket order${scope.ticketOrders === 1 ? '' : 's'} (${scope.paidTicketOrders} paid). Sales history can't be deleted — unpublish the event instead.`
      : null;
    return { event: { id: event.id, title: event.title, status: event.status }, scope, canDelete: !blockedReason, blockedReason, confirmPhrase: EVENT_DELETE_PHRASE };
  },

  async deleteEvent(id, confirm, actor) {
    requirePhrase(confirm, EVENT_DELETE_PHRASE);
    const removed = await withTransaction(async (conn) => {
      const event = await deletionRepository.lockEvent(id, conn);
      if (!event) throw ApiError.notFound('Event not found');
      const scope = await deletionRepository.eventDependents(id, conn);
      if (scope.ticketOrders) throw ApiError.conflict('This event has ticket orders, so it can’t be deleted. Unpublish it instead.');
      if (!(await deletionRepository.deleteEvent(id, conn))) throw ApiError.internal('The event could not be deleted');
      return { event, scope };
    });
    await mediaStorage.removeIfUnreferenced(removed.event.cover_image);
    await trace(actor, 'event.hard_deleted', 'event', id, removed.event.title, { scope: removed.scope });
    return { deleted: true, scope: removed.scope };
  },

  // ---------------- ticket orders / tickets ----------------
  async deleteTicketOrder(id, actor) {
    const order = await withTransaction(async (conn) => {
      const row = await deletionRepository.lockTicketOrder(id, conn);
      if (!row) throw ApiError.notFound('Order not found');
      if (!DELETABLE_TICKET_ORDER_STATUSES.includes(row.status)) {
        throw ApiError.conflict(row.status === 'paid' ? 'Paid orders are sales records and can’t be deleted. Cancel individual tickets instead.' : 'This order is still being paid for; it can only be deleted once it has expired, failed or been cancelled.');
      }
      if (Number(row.tickets) || Number(row.live_payments)) throw ApiError.conflict('This order has tickets or an active payment, so it can’t be deleted.');
      if (!(await deletionRepository.deleteTicketOrder(id, conn))) throw ApiError.internal('The order could not be deleted');
      return row;
    });
    await trace(actor, 'ticket_order.hard_deleted', 'ticket_order', id, `TKT-${id} (${order.status})`, { eventId: order.event_id, status: order.status });
    return { deleted: true };
  },

  /** Tickets are never hard-deleted (they belong to a paid order); cancelling voids the QR at the door. */
  async cancelTicket(id, actor) {
    const ticket = await withTransaction(async (conn) => {
      const row = await deletionRepository.lockTicket(id, conn);
      if (!row) throw ApiError.notFound('Ticket not found');
      if (row.status === 'cancelled') throw ApiError.conflict('This ticket is already cancelled.');
      if (row.status === 'used') throw ApiError.conflict('This ticket was already used at the door and can’t be cancelled.');
      if (!(await deletionRepository.cancelTicket(id, conn))) throw ApiError.conflict('This ticket changed while cancelling; refresh and try again.');
      return row;
    });
    await trace(actor, 'ticket.cancelled', 'ticket', id, ticket.ticket_code, { eventId: ticket.event_id });
    return { cancelled: true, ticketId: ticket.ticket_code };
  },

  // ---------------- card orders ----------------
  async deleteCardOrder(id, actor) {
    const order = await withTransaction(async (conn) => {
      const row = await deletionRepository.lockCardOrder(id, conn);
      if (!row) throw ApiError.notFound('Order not found');
      if (row.payment_status === 'paid') throw ApiError.conflict('Paid orders are financial records and can’t be deleted. Cancel the order instead.');
      if (Number(row.live_payments)) throw ApiError.conflict('This order has a payment in progress or completed, so it can’t be deleted.');
      if (!(await deletionRepository.deleteCardOrder(id, conn))) throw ApiError.internal('The order could not be deleted');
      return row;
    });
    await trace(actor, 'card_order.hard_deleted', 'order', id, `Order #${id}`, { paymentStatus: order.payment_status });
    return { deleted: true };
  },

  // ---------------- customers ----------------
  async deleteUser(id, confirm, actor) {
    if (Number(id) === Number(actor.userId)) throw ApiError.conflict('You can’t delete your own account.');
    const user = await withTransaction(async (conn) => {
      const row = await deletionRepository.lockUser(id, conn);
      if (!row) throw ApiError.notFound('Customer not found');
      requirePhrase(confirm, row.email);
      if (row.role !== 'customer') throw ApiError.conflict('Only customer accounts can be deleted here.');
      const blockers = [
        Number(row.events) && `${row.events} event(s)`,
        Number(row.payments) && `${row.payments} payment(s)`,
        Number(row.orders) && `${row.orders} order(s)`,
      ].filter(Boolean);
      // events and payments CASCADE from users, so deleting would silently erase them.
      if (blockers.length) throw ApiError.conflict(`This customer has ${blockers.join(', ')}; deleting the account would erase them. Deactivate the account instead.`);
      if (!(await deletionRepository.deleteUser(id, conn))) throw ApiError.internal('The account could not be deleted');
      return row;
    });
    await trace(actor, 'user.hard_deleted', 'user', id, user.email, { role: user.role });
    return { deleted: true };
  },

  // ---------------- audit logs ----------------
  async deleteAuditLog(id, actor) {
    const removed = await deletionRepository.deleteAuditLog(id);
    if (!removed) throw ApiError.notFound('Audit log entry not found');
    await trace(actor, 'audit_log.deleted', 'audit_log', id, `Audit entry #${id}`, null);
    return { deleted: true };
  },

  previewAuditPurge(olderThanDays) {
    const days = Number(olderThanDays);
    if (!Number.isInteger(days) || days < MIN_AUDIT_RETENTION_DAYS) {
      throw ApiError.validation([{ field: 'olderThanDays', message: `Keep at least the last ${MIN_AUDIT_RETENTION_DAYS} days` }]);
    }
    const cutoff = new Date(Date.now() - days * 86400000);
    return deletionRepository.countAuditLogsBefore(cutoff).then((count) => ({ olderThanDays: days, cutoff: cutoff.toISOString(), count, confirmPhrase: AUDIT_PURGE_PHRASE }));
  },

  async purgeAuditLogs(olderThanDays, confirm, actor) {
    requirePhrase(confirm, AUDIT_PURGE_PHRASE);
    const { cutoff } = await this.previewAuditPurge(olderThanDays);
    const removed = await deletionRepository.purgeAuditLogsBefore(new Date(cutoff));
    await trace(actor, 'audit_log.purged', 'audit_log', null, `${removed} entries older than ${olderThanDays} days`, { olderThanDays: Number(olderThanDays), cutoff, removed });
    return { deleted: removed };
  },

  async listSecurityEvents(query) {
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await deletionRepository.listSecurityEvents({ limit, offset });
    return {
      events: rows.map((r) => ({ id: r.id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, summary: r.summary, actorEmail: r.actor_email, createdAt: r.created_at })),
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  },
};
