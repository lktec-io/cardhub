import { pool } from '../config/db.js';

export const guestRepository = {
  async create({ eventId, name, phone, email, partySize, status, notes }) {
    const [result] = await pool.query(
      `INSERT INTO guests (event_id, name, phone, email, party_size, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventId, name, phone || null, email || null, partySize || 1, status || 'pending', notes || null]
    );
    return this.findByIdAndEventId(result.insertId, eventId);
  },

  async findByIdAndEventId(id, eventId) {
    const [rows] = await pool.query('SELECT * FROM guests WHERE id = ? AND event_id = ? LIMIT 1', [id, eventId]);
    return rows[0] || null;
  },

  async findByEventIdAndPhone(eventId, phone) {
    if (!phone) return null;
    const [rows] = await pool.query('SELECT * FROM guests WHERE event_id = ? AND phone = ? LIMIT 1', [eventId, phone]);
    return rows[0] || null;
  },

  async findAllByEventId(eventId, { limit, offset, search, status }) {
    const conditions = ['event_id = ?'];
    const params = [eventId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push("(name LIKE ? ESCAPE '\\\\' OR phone LIKE ? ESCAPE '\\\\' OR email LIKE ? ESCAPE '\\\\')");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT * FROM guests WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM guests WHERE ${whereClause}`, params);

    return { rows, total: countRows[0].total };
  },

  async getStatsByEventId(eventId) {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM guests WHERE event_id = ? GROUP BY status`,
      [eventId]
    );
    const stats = { total: 0, pending: 0, attending: 0, declined: 0 };
    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }
    return stats;
  },

  async getPlatformStats() {
    const [rows] = await pool.query('SELECT status, COUNT(*) AS count FROM guests GROUP BY status');
    const stats = { total: 0, pending: 0, attending: 0, declined: 0 };
    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }
    return stats;
  },

  async updateByIdAndEventId(id, eventId, changes) {
    const fields = Object.keys(changes);
    if (fields.length === 0) return this.findByIdAndEventId(id, eventId);

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => changes[field] ?? null);

    await pool.query(`UPDATE guests SET ${setClause} WHERE id = ? AND event_id = ?`, [...values, id, eventId]);
    return this.findByIdAndEventId(id, eventId);
  },

  async deleteByIdAndEventId(id, eventId) {
    const [result] = await pool.query('DELETE FROM guests WHERE id = ? AND event_id = ?', [id, eventId]);
    return result.affectedRows > 0;
  },

  async deleteManyByEventId(eventId, ids) {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(', ');
    const [result] = await pool.query(
      `DELETE FROM guests WHERE event_id = ? AND id IN (${placeholders})`,
      [eventId, ...ids]
    );
    return result.affectedRows;
  },

  async bulkCreate(eventId, guests) {
    if (guests.length === 0) return 0;
    const values = guests.map((g) => [eventId, g.name, g.phone || null, g.email || null, g.partySize || 1, 'pending', null]);
    const [result] = await pool.query(
      `INSERT IGNORE INTO guests (event_id, name, phone, email, party_size, status, notes) VALUES ?`,
      [values]
    );
    return result.affectedRows;
  },
};
