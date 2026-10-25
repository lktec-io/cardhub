import { pool } from '../config/db.js';

// Everything a ticket page / verification needs in one round trip. Only
// public event columns are joined — never the organizer's user row.
const SELECT_TICKET_WITH_CONTEXT = `
  SELECT t.*,
         o.status AS order_status, o.is_demo, o.currency, o.paid_at,
         tt.name AS ticket_type_name,
         e.slug AS event_slug, e.title AS event_title, e.event_type, e.event_date, e.event_time, e.end_time,
         e.timezone, e.venue_name, e.venue_address, e.cover_image, e.host_name, e.organizer_contact
  FROM tickets t
  JOIN ticket_orders o ON o.id = t.ticket_order_id
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  JOIN events e ON e.id = t.event_id`;

export const ticketRepository = {
  /** Inserts one ticket. Duplicate (order, seq) or code/token collisions surface as ER_DUP_ENTRY for the caller to handle. */
  async create({ ticketOrderId, eventId, ticketTypeId, seq, ticketCode, token, holderName, holderPhone, holderEmail, priceTzs }, db = pool) {
    const [result] = await db.query(
      `INSERT INTO tickets
         (ticket_order_id, event_id, ticket_type_id, seq, ticket_code, token, holder_name, holder_phone, holder_email, price_tzs, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid')`,
      [ticketOrderId, eventId, ticketTypeId, seq, ticketCode, token, holderName, holderPhone, holderEmail ?? null, priceTzs]
    );
    return result.insertId;
  },

  async findSeqsByOrderId(ticketOrderId, db = pool) {
    const [rows] = await db.query('SELECT seq FROM tickets WHERE ticket_order_id = ?', [ticketOrderId]);
    return new Set(rows.map((row) => row.seq));
  },

  async findByOrderIdWithContext(ticketOrderId, db = pool) {
    const [rows] = await db.query(`${SELECT_TICKET_WITH_CONTEXT} WHERE t.ticket_order_id = ? ORDER BY t.seq ASC`, [ticketOrderId]);
    return rows;
  },

  /** Admin: one event's issued tickets (tokens are never returned — only codes). */
  async findByEventForAdmin(eventId, { search, limit, offset }) {
    const conditions = ['t.event_id = ?'];
    const params = [eventId];
    if (search) {
      conditions.push("(t.ticket_code LIKE ? ESCAPE '\\\\' OR t.holder_name LIKE ? ESCAPE '\\\\' OR t.holder_phone LIKE ? ESCAPE '\\\\')");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = conditions.join(' AND ');
    const [rows] = await pool.query(
      `SELECT t.id, t.ticket_code, t.holder_name, t.holder_phone, t.price_tzs, t.status, t.checked_in_at, t.created_at,
              tt.name AS ticket_type_name, o.is_demo, o.status AS order_status
       FROM tickets t
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       JOIN ticket_orders o ON o.id = t.ticket_order_id
       WHERE ${where}
       ORDER BY t.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM tickets t WHERE ${where}`, params);
    return { rows, total: countRows[0].total };
  },

  /**
   * Door check-in: the ticket row (plus what the door screen shows), locked
   * FOR UPDATE inside the caller's transaction so two scanners can't both
   * admit it. Looked up by QR token or by ticket code (manual entry).
   */
  async lockForCheckIn({ token, ticketCode }, conn) {
    const [rows] = await conn.query(
      `SELECT t.id, t.event_id, t.ticket_code, t.holder_name, t.holder_phone, t.status, t.checked_in_at, t.checked_in_by,
              o.status AS order_status, o.is_demo, tt.name AS ticket_type_name,
              e.title AS event_title, e.event_date, e.event_time, e.venue_name, u.name AS checked_in_by_name
       FROM tickets t
       JOIN ticket_orders o ON o.id = t.ticket_order_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       JOIN events e ON e.id = t.event_id
       LEFT JOIN users u ON u.id = t.checked_in_by
       WHERE ${token ? 't.token = ?' : 't.ticket_code = ?'}
       LIMIT 1
       FOR UPDATE OF t`,
      [token || ticketCode]
    );
    return rows[0] || null;
  },

  /** Conditional, so only a still-valid ticket can be admitted. Returns true when this call admitted it. */
  async markCheckedIn(id, userId, conn) {
    const [result] = await conn.query(
      "UPDATE tickets SET status = 'used', checked_in_at = UTC_TIMESTAMP(), checked_in_by = ? WHERE id = ? AND status = 'valid'",
      [userId, id]
    );
    return result.affectedRows === 1;
  },

  async findCheckInTime(id, conn) {
    const [rows] = await conn.query('SELECT checked_in_at FROM tickets WHERE id = ?', [id]);
    return rows[0]?.checked_in_at ?? null;
  },

  async checkInStats(eventId) {
    const [rows] = await pool.query(
      `SELECT SUM(t.status = 'used') AS checked_in, SUM(t.status <> 'cancelled') AS admissible
       FROM tickets t JOIN ticket_orders o ON o.id = t.ticket_order_id
       WHERE t.event_id = ? AND o.status = 'paid'`,
      [eventId]
    );
    return { checkedIn: Number(rows[0].checked_in || 0), total: Number(rows[0].admissible || 0) };
  },

  async findByTokenWithContext(token) {
    const [rows] = await pool.query(`${SELECT_TICKET_WITH_CONTEXT} WHERE t.token = ? LIMIT 1`, [token]);
    return rows[0] || null;
  },
};
