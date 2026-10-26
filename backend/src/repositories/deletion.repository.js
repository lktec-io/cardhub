import { pool } from '../config/db.js';

/**
 * Queries behind admin hard deletes. Every "lock*" runs inside the caller's
 * transaction (FOR UPDATE) so the eligibility check and the DELETE see the
 * same state. Nothing here disables foreign-key checks.
 */
export const deletionRepository = {
  // ---------- events ----------
  async lockEvent(id, conn) {
    const [rows] = await conn.query('SELECT id, title, status, cover_image, user_id FROM events WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },
  async eventDependents(id, db = pool) {
    const [rows] = await db.query(
      `SELECT (SELECT COUNT(*) FROM ticket_orders WHERE event_id = ?) AS ticket_orders,
              (SELECT COUNT(*) FROM ticket_orders WHERE event_id = ? AND status = 'paid') AS paid_ticket_orders,
              (SELECT COUNT(*) FROM tickets WHERE event_id = ?) AS tickets,
              (SELECT COUNT(*) FROM ticket_types WHERE event_id = ?) AS ticket_types,
              (SELECT COUNT(*) FROM guests WHERE event_id = ?) AS guests`,
      [id, id, id, id, id]
    );
    const r = rows[0];
    return { ticketOrders: Number(r.ticket_orders), paidTicketOrders: Number(r.paid_ticket_orders), tickets: Number(r.tickets), ticketTypes: Number(r.ticket_types), guests: Number(r.guests) };
  },
  /** Ticket types first (they have no orders, or the event would have been refused); guests go with the event (ON DELETE CASCADE). */
  async deleteEvent(id, conn) {
    await conn.query('DELETE FROM ticket_types WHERE event_id = ?', [id]);
    const [result] = await conn.query('DELETE FROM events WHERE id = ?', [id]);
    return result.affectedRows === 1;
  },

  // ---------- ticket orders / tickets ----------
  async lockTicketOrder(id, conn) {
    const [rows] = await conn.query(
      `SELECT o.id, o.status, o.event_id, o.buyer_name,
              (SELECT COUNT(*) FROM tickets t WHERE t.ticket_order_id = o.id) AS tickets,
              (SELECT COUNT(*) FROM payments p WHERE p.ticket_order_id = o.id AND p.status IN ('paid', 'processing', 'pending')) AS live_payments
       FROM ticket_orders o WHERE o.id = ? FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },
  /** Payment rows stay (fk SET NULL): failed/cancelled payment attempts remain part of the money trail. */
  async deleteTicketOrder(id, conn) {
    const [result] = await conn.query('DELETE FROM ticket_orders WHERE id = ?', [id]);
    return result.affectedRows === 1;
  },
  async lockTicket(id, conn) {
    const [rows] = await conn.query('SELECT id, ticket_code, status, event_id FROM tickets WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },
  async cancelTicket(id, conn) {
    const [result] = await conn.query("UPDATE tickets SET status = 'cancelled' WHERE id = ? AND status = 'valid'", [id]);
    return result.affectedRows === 1;
  },

  // ---------- card orders ----------
  async lockCardOrder(id, conn) {
    const [rows] = await conn.query(
      `SELECT o.id, o.payment_status, o.guest_name,
              (SELECT COUNT(*) FROM payments p WHERE p.order_id = o.id AND p.status IN ('paid', 'processing', 'pending')) AS live_payments
       FROM orders o WHERE o.id = ? FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },
  async deleteCardOrder(id, conn) {
    const [result] = await conn.query('DELETE FROM orders WHERE id = ?', [id]);
    return result.affectedRows === 1;
  },

  // ---------- users ----------
  async lockUser(id, conn) {
    const [rows] = await conn.query(
      `SELECT u.id, u.email, u.name, u.role,
              (SELECT COUNT(*) FROM events e WHERE e.user_id = u.id) AS events,
              (SELECT COUNT(*) FROM payments p WHERE p.user_id = u.id) AS payments,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders
       FROM users u WHERE u.id = ? FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },
  /** refresh tokens, preferences, notifications cascade; audit_logs keep the row with user_id NULL. */
  async deleteUser(id, conn) {
    const [result] = await conn.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows === 1;
  },

  // ---------- audit logs ----------
  async deleteAuditLog(id) {
    const [result] = await pool.query('DELETE FROM audit_logs WHERE id = ?', [id]);
    return result.affectedRows;
  },
  async countAuditLogsBefore(cutoff) {
    const [rows] = await pool.query('SELECT COUNT(*) AS n FROM audit_logs WHERE created_at < ?', [cutoff]);
    return Number(rows[0].n);
  },
  async purgeAuditLogsBefore(cutoff) {
    const [result] = await pool.query('DELETE FROM audit_logs WHERE created_at < ?', [cutoff]);
    return result.affectedRows;
  },

  // ---------- security events (append-only) ----------
  async recordSecurityEvent({ actorUserId, actorEmail, action, entityType, entityId, summary, metadata, ipAddress }) {
    await pool.query(
      `INSERT INTO security_events (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [actorUserId ?? null, actorEmail ?? null, action, entityType, entityId == null ? null : String(entityId), summary?.slice(0, 255) ?? null, metadata ? JSON.stringify(metadata) : null, ipAddress ?? null]
    );
  },
  async listSecurityEvents({ limit, offset }) {
    const [rows] = await pool.query('SELECT * FROM security_events ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
    const [count] = await pool.query('SELECT COUNT(*) AS total FROM security_events');
    return { rows, total: Number(count[0].total) };
  },
};
