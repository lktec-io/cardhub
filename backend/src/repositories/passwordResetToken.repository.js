import { pool } from '../config/db.js';

export const passwordResetTokenRepository = {
  async create({ userId, tokenHash, expiresAt }) {
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );
  },

  async findValid(tokenHash) {
    const [rows] = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  async markUsed(tokenHash) {
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?', [tokenHash]);
  },
};
