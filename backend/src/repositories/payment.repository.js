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
};
