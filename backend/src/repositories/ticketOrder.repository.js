import { pool } from '../config/db.js';

// seconds_left is computed by the database clock, the same clock that
// wrote reservation_expires_at, so app-server/DB timezone differences
// can't make a reservation look longer or shorter than it is.
const SELECT_ORDER = `
  SELECT o.*, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), o.reservation_expires_at), 0) AS seconds_left
  FROM ticket_orders o`;

export const ticketOrderRepository = {
  async create(
    { publicToken, idempotencyKey, eventId, ticketTypeId, buyerName, buyerPhone, buyerEmail, quantity, unitPriceTzs, totalTzs, reservationMinutes, isDemo },
    db = pool
  ) {
    const [result] = await db.query(
      `INSERT INTO ticket_orders
         (public_token, idempotency_key, event_id, ticket_type_id, buyer_name, buyer_phone, buyer_email,
          quantity, unit_price_tzs, total_tzs, currency, status, is_demo, reservation_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TZS', 'pending', ?, NOW() + INTERVAL ? MINUTE)`,
      [
        publicToken,
        idempotencyKey ?? null,
        eventId,
        ticketTypeId,
        buyerName,
        buyerPhone,
        buyerEmail ?? null,
        quantity,
        unitPriceTzs,
        totalTzs,
        isDemo ? 1 : 0,
        reservationMinutes,
      ]
    );
    return this.findById(result.insertId, db);
  },

  async findById(id, db = pool) {
    const [rows] = await db.query(`${SELECT_ORDER} WHERE o.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  /** Row-locks the order for the rest of the transaction — serializes concurrent pay/confirm/expire on the same order. */
  async findByIdForUpdate(id, db) {
    const [rows] = await db.query(`${SELECT_ORDER} WHERE o.id = ? LIMIT 1 FOR UPDATE`, [id]);
    return rows[0] || null;
  },

  async findByPublicToken(publicToken, db = pool) {
    const [rows] = await db.query(`${SELECT_ORDER} WHERE o.public_token = ? LIMIT 1`, [publicToken]);
    return rows[0] || null;
  },

  async findByPublicTokenForUpdate(publicToken, db) {
    const [rows] = await db.query(`${SELECT_ORDER} WHERE o.public_token = ? LIMIT 1 FOR UPDATE`, [publicToken]);
    return rows[0] || null;
  },

  async findByIdempotencyKey(idempotencyKey, db = pool) {
    const [rows] = await db.query(`${SELECT_ORDER} WHERE o.idempotency_key = ? LIMIT 1`, [idempotencyKey]);
    return rows[0] || null;
  },

  async updateStatus(id, { status, paidAt }, db = pool) {
    await db.query('UPDATE ticket_orders SET status = ?, paid_at = COALESCE(?, paid_at) WHERE id = ?', [status, paidAt ?? null, id]);
    return this.findById(id, db);
  },

  /**
   * Open orders whose reservation has lapsed, locked for expiry.
   * SKIP LOCKED lets concurrent sweeps (several requests at once) each
   * take different rows instead of queueing behind one another.
   */
  async findLapsedOpenForUpdate(limit, db) {
    const [rows] = await db.query(
      `SELECT id, ticket_type_id, quantity FROM ticket_orders
       WHERE status IN ('pending', 'processing') AND reservation_expires_at < NOW()
       ORDER BY id ASC LIMIT ? FOR UPDATE SKIP LOCKED`,
      [limit]
    );
    return rows;
  },
};
