import { pool } from '../config/db.js';

export const paymentRepository = {
  /** A payment row belongs to exactly one of orderId/subscriptionId — enforced in payment.service.js, not the DB (see migration 020's comment). */
  async create({ orderId, userId, subscriptionId, amount, currency, method, provider, status }) {
    const [result] = await pool.query(
      `INSERT INTO payments (order_id, user_id, subscription_id, amount, currency, method, provider, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId ?? null, userId ?? null, subscriptionId ?? null, amount, currency, method ?? null, provider ?? null, status]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM payments WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findByOrderId(orderId) {
    const [rows] = await pool.query('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC', [orderId]);
    return rows;
  },

  /** Batch lookup for admin order listings — one query instead of N, keyed by order_id -> most recent payment. */
  async findLatestByOrderIds(orderIds) {
    if (!orderIds.length) return {};
    const placeholders = orderIds.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT p.* FROM payments p
       INNER JOIN (
         SELECT order_id, MAX(created_at) AS latest_created_at FROM payments WHERE order_id IN (${placeholders}) GROUP BY order_id
       ) latest ON latest.order_id = p.order_id AND latest.latest_created_at = p.created_at`,
      orderIds
    );
    return Object.fromEntries(rows.map((row) => [row.order_id, row]));
  },

  /** The idempotency key for incoming webhooks — a provider_reference is unique once set (migration 020), so a replayed webhook always resolves to the same row. */
  async findByProviderReference(providerReference) {
    const [rows] = await pool.query('SELECT * FROM payments WHERE provider_reference = ? LIMIT 1', [providerReference]);
    return rows[0] || null;
  },

  /** Set once, right after the provider accepts a createPayment() call — before any webhook can arrive. */
  async attachProviderReference(id, providerReference) {
    await pool.query('UPDATE payments SET provider_reference = ? WHERE id = ?', [providerReference, id]);
    return this.findById(id);
  },

  async updateStatus(id, { status, failureReason, paidAt }) {
    await pool.query(
      `UPDATE payments SET status = ?, failure_reason = ?, paid_at = ? WHERE id = ?`,
      [status, failureReason ?? null, paidAt ?? null, id]
    );
    return this.findById(id);
  },

  /**
   * Admin listing — joins in just enough of orders/event_templates/users
   * to render a readable row (order number, customer, card) without a
   * second N+1 lookup per payment. Search matches a typed order number
   * (the `1000 + order.id` display form), customer name/phone/email, or
   * a provider reference — the three things an admin would realistically
   * have on hand when looking a payment up.
   */
  async findAllAdmin({ limit, offset, status, method, dateFrom, dateTo, search }) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (method) {
      conditions.push('p.method = ?');
      params.push(method);
    }
    if (dateFrom) {
      conditions.push('p.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('p.created_at <= ?');
      params.push(dateTo);
    }
    if (search) {
      const orderIdFromSearch = /^\d+$/.test(search) ? Number(search) - 1000 : null;
      const searchConditions = [
        "u.name LIKE ? ESCAPE '\\\\'",
        "u.email LIKE ? ESCAPE '\\\\'",
        "u.phone LIKE ? ESCAPE '\\\\'",
        "o.guest_name LIKE ? ESCAPE '\\\\'",
        "o.guest_phone LIKE ? ESCAPE '\\\\'",
        "p.provider_reference LIKE ? ESCAPE '\\\\'",
      ];
      const like = `%${search}%`;
      const searchParams = [like, like, like, like, like, like];
      if (orderIdFromSearch !== null && orderIdFromSearch > 0) {
        searchConditions.push('o.id = ?');
        searchParams.push(orderIdFromSearch);
      }
      conditions.push(`(${searchConditions.join(' OR ')})`);
      params.push(...searchParams);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const joins = `
      LEFT JOIN orders o ON o.id = p.order_id
      LEFT JOIN event_templates et ON et.id = o.template_id
      LEFT JOIN users u ON u.id = COALESCE(p.user_id, o.user_id)
    `;

    const [rows] = await pool.query(
      `SELECT p.*, o.id AS order_row_id, o.guest_name, o.guest_phone, o.user_id AS order_user_id,
              et.name AS template_name, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM payments p
       ${joins}
       ${whereClause}
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM payments p ${joins} ${whereClause}`, params);

    return { rows, total: countRows[0].total };
  },

  async findByIdAdmin(id) {
    const [rows] = await pool.query(
      `SELECT p.*, o.id AS order_row_id, o.guest_name, o.guest_phone, o.user_id AS order_user_id,
              et.name AS template_name, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM payments p
       LEFT JOIN orders o ON o.id = p.order_id
       LEFT JOIN event_templates et ON et.id = o.template_id
       LEFT JOIN users u ON u.id = COALESCE(p.user_id, o.user_id)
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** One aggregate query for the admin dashboard summary tiles — never computed from frontend-supplied figures. */
  async getStats() {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(status = 'paid'), 0) AS paid,
         COALESCE(SUM(status = 'pending'), 0) AS pending,
         COALESCE(SUM(status = 'processing'), 0) AS processing,
         COALESCE(SUM(status = 'failed'), 0) AS failed,
         COALESCE(SUM(status = 'cancelled'), 0) AS cancelled,
         COALESCE(SUM(status = 'expired'), 0) AS expired,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_paid_amount
       FROM payments`
    );
    return rows[0];
  },
};
