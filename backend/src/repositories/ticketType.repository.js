import { pool } from '../config/db.js';

const SELECT_WITH_FLAGS = `
  SELECT tt.*,
         GREATEST(CAST(tt.quantity_available AS SIGNED) - tt.quantity_sold - tt.quantity_reserved, 0) AS remaining,
         (tt.sales_start IS NULL OR tt.sales_start <= NOW()) AS sales_started,
         (tt.sales_end IS NULL OR tt.sales_end >= NOW()) AS sales_not_ended
  FROM ticket_types tt`;

/**
 * Ticket type inventory. The three mutating methods are single
 * conditional UPDATEs, so two buyers racing for the last ticket can't
 * both win: the database applies them one at a time and the loser sees
 * affectedRows = 0. chk_ticket_types_capacity (migration 022) backs this up.
 */
export const ticketTypeRepository = {
  async findByEventId(eventId, { activeOnly = true } = {}) {
    const [rows] = await pool.query(
      `${SELECT_WITH_FLAGS}
       WHERE tt.event_id = ? ${activeOnly ? "AND tt.status = 'active'" : ''}
       ORDER BY tt.sort_order ASC, tt.price_tzs ASC, tt.id ASC`,
      [eventId]
    );
    return rows;
  },

  async findByIdAndEventId(id, eventId, db = pool) {
    const [rows] = await db.query(`${SELECT_WITH_FLAGS} WHERE tt.id = ? AND tt.event_id = ? LIMIT 1`, [id, eventId]);
    return rows[0] || null;
  },

  async findById(id, db = pool) {
    const [rows] = await db.query(`${SELECT_WITH_FLAGS} WHERE tt.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  // ---------- Organizer management (Event Workspace → Tickets) ----------

  /** Every tier of an event, including paused ones, with how many orders reference it (a referenced tier can't be deleted). */
  async findAllForManagement(eventId, db = pool) {
    const [rows] = await db.query(
      `SELECT tt.*,
              GREATEST(CAST(tt.quantity_available AS SIGNED) - tt.quantity_sold - tt.quantity_reserved, 0) AS remaining,
              (SELECT COUNT(*) FROM ticket_orders o WHERE o.ticket_type_id = tt.id) AS order_count
       FROM ticket_types tt
       WHERE tt.event_id = ?
       ORDER BY tt.sort_order ASC, tt.id ASC`,
      [eventId]
    );
    return rows;
  },

  /** Row-locks an event's tiers for the rest of the transaction, so a concurrent checkout can't change sold/reserved counts mid-edit. */
  async lockAllForEvent(eventId, db) {
    const [rows] = await db.query(
      `SELECT tt.*, (SELECT COUNT(*) FROM ticket_orders o WHERE o.ticket_type_id = tt.id) AS order_count
       FROM ticket_types tt WHERE tt.event_id = ? FOR UPDATE`,
      [eventId]
    );
    return rows;
  },

  async insert({ eventId, name, description, priceTzs, quantityAvailable, maxPerOrder, status, sortOrder }, db) {
    const [result] = await db.query(
      `INSERT INTO ticket_types (event_id, name, description, price_tzs, quantity_available, max_per_order, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, name, description ?? null, priceTzs, quantityAvailable, maxPerOrder, status, sortOrder]
    );
    return result.insertId;
  },

  async updateForEvent(id, eventId, { name, description, priceTzs, quantityAvailable, maxPerOrder, status, sortOrder }, db) {
    await db.query(
      `UPDATE ticket_types
       SET name = ?, description = ?, price_tzs = ?, quantity_available = ?, max_per_order = ?, status = ?, sort_order = ?
       WHERE id = ? AND event_id = ?`,
      [name, description ?? null, priceTzs, quantityAvailable, maxPerOrder, status, sortOrder, id, eventId]
    );
  },

  async setStatusForEvent(id, eventId, status, db) {
    await db.query('UPDATE ticket_types SET status = ? WHERE id = ? AND event_id = ?', [status, id, eventId]);
  },

  /** Only ever called for a tier with no orders (FK RESTRICT would refuse otherwise). */
  async deleteForEvent(id, eventId, db) {
    await db.query('DELETE FROM ticket_types WHERE id = ? AND event_id = ?', [id, eventId]);
  },

  /** Holds `quantity` tickets for a pending checkout. Returns false when there aren't enough left or sales aren't open. */
  async reserve(id, quantity, db = pool) {
    const [result] = await db.query(
      `UPDATE ticket_types
       SET quantity_reserved = quantity_reserved + ?
       WHERE id = ? AND status = 'active'
         AND (sales_start IS NULL OR sales_start <= NOW())
         AND (sales_end IS NULL OR sales_end >= NOW())
         AND quantity_sold + quantity_reserved + ? <= quantity_available`,
      [quantity, id, quantity]
    );
    return result.affectedRows === 1;
  },

  /** Returns held tickets to sale (checkout expired, failed or cancelled). */
  async release(id, quantity, db = pool) {
    await db.query(
      'UPDATE ticket_types SET quantity_reserved = GREATEST(CAST(quantity_reserved AS SIGNED) - ?, 0) WHERE id = ?',
      [quantity, id]
    );
  },

  /** Converts a reservation into sold tickets once payment is confirmed. */
  async convertReservationToSale(id, quantity, db = pool) {
    const [result] = await db.query(
      `UPDATE ticket_types
       SET quantity_reserved = GREATEST(CAST(quantity_reserved AS SIGNED) - ?, 0),
           quantity_sold = quantity_sold + ?
       WHERE id = ?`,
      [quantity, quantity, id]
    );
    return result.affectedRows === 1;
  },

  /**
   * A verified payment arrived for an order whose reservation had
   * already been released (a late provider webhook). Sells directly,
   * but only if capacity still allows. Returns false if the tickets were
   * resold in the meantime, which then needs a manual refund.
   */
  async sellWithoutReservation(id, quantity, db = pool) {
    const [result] = await db.query(
      `UPDATE ticket_types SET quantity_sold = quantity_sold + ?
       WHERE id = ? AND quantity_sold + quantity_reserved + ? <= quantity_available`,
      [quantity, id, quantity]
    );
    return result.affectedRows === 1;
  },
};
