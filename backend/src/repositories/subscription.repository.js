import { pool } from '../config/db.js';

export const subscriptionRepository = {
  async findActiveByUserId(userId) {
    const [rows] = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1",
      [userId]
    );
    return rows[0] || null;
  },

  async findPaymentsByUserId(userId, limit = 20) {
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows;
  },
};
