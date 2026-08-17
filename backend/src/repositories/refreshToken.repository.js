import { pool } from '../config/db.js';

export const refreshTokenRepository = {
  async store({ userId, tokenHash, expiresAt, userAgent, ipAddress }) {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null]
    );
  },

  async findValid(tokenHash) {
    const [rows] = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  async revoke(tokenHash) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [tokenHash]);
  },

  async revokeAllForUser(userId) {
    await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [
      userId,
    ]);
  },
};
