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
