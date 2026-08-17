import { pool } from '../config/db.js';

export const notificationRepository = {
  async create({ userId, type, title, message, data }) {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
      [userId, type, title, message || null, data ? JSON.stringify(data) : null]
    );
    return result.insertId;
  },

  async findAllByUserId(userId, { limit, offset }) {
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?', [userId]);
    return { rows, total: countRows[0].total };
  },

  async countUnreadByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );
    return rows[0].total;
  },

  async markReadByIdAndUserId(id, userId) {
    const [result] = await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async markAllReadByUserId(userId) {
    const [result] = await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );
    return result.affectedRows;
  },
};
