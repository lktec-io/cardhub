import { pool } from '../config/db.js';

export const auditLogRepository = {
  async record({ userId, action, entityType, entityId, metadata, ipAddress, userAgent }) {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId ?? null,
        action,
        entityType ?? null,
        entityId ?? null,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress ?? null,
        userAgent ?? null,
      ]
    );
  },

  async findAllPaginated({ limit, offset, action, userId }) {
    const conditions = [];
    const params = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs ${whereClause}`, params);

    return { rows, total: countRows[0].total };
  },
};
