import { pool } from '../config/db.js';

export const templateRepository = {
  async findActivePaginated({ category, search, limit, offset }) {
    const conditions = ["status = 'active'"];
    const params = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(name LIKE ? ESCAPE \'\\\\\' OR description LIKE ? ESCAPE \'\\\\\')');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT * FROM event_templates WHERE ${whereClause}
       ORDER BY sort_order ASC, name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM event_templates WHERE ${whereClause}`,
      params
    );

    return { rows, total: countRows[0].total };
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM event_templates WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findActiveById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM event_templates WHERE id = ? AND status = 'active' LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  async findAllAdmin({ limit, offset }) {
    const [rows] = await pool.query(
      'SELECT * FROM event_templates ORDER BY sort_order ASC, name ASC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM event_templates');
    return { rows, total: countRows[0].total };
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE event_templates SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },

  async updatePricingTier(id, pricingTier) {
    await pool.query('UPDATE event_templates SET pricing_tier = ? WHERE id = ?', [pricingTier, id]);
    return this.findById(id);
  },
};
