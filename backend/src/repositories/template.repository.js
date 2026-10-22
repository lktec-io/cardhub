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

  // ---------- Admin catalogue management ----------

  async slugExists(slug) {
    const [rows] = await pool.query('SELECT id FROM event_templates WHERE slug = ? LIMIT 1', [slug]);
    return rows.length > 0;
  },

  async nextSortOrder() {
    const [rows] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM event_templates');
    return rows[0].next;
  },

  async create({ name, slug, description, category, pricingTier, previewImage, status, sortOrder, config }) {
    const [result] = await pool.query(
      `INSERT INTO event_templates (name, slug, description, category, pricing_tier, preview_image, status, sort_order, config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [name, slug, description ?? null, category, pricingTier, previewImage ?? null, status, sortOrder, JSON.stringify(config)]
    );
    return this.findById(result.insertId);
  },

  async updateDetails(id, { name, description, category, pricingTier, status }) {
    await pool.query(
      'UPDATE event_templates SET name = ?, description = ?, category = ?, pricing_tier = ?, status = ? WHERE id = ?',
      [name, description ?? null, category, pricingTier, status, id]
    );
    return this.findById(id);
  },

  async updatePreviewImage(id, previewImage) {
    await pool.query('UPDATE event_templates SET preview_image = ? WHERE id = ?', [previewImage, id]);
    return this.findById(id);
  },

  /** ids in display order; sort_order becomes 1..n. Runs in one statement so a partial reorder can't be observed. */
  async reorder(ids) {
    if (!ids.length) return;
    const cases = ids.map(() => 'WHEN ? THEN ?').join(' ');
    const params = ids.flatMap((id, index) => [id, index + 1]);
    await pool.query(`UPDATE event_templates SET sort_order = CASE id ${cases} END WHERE id IN (${ids.map(() => '?').join(', ')})`, [
      ...params,
      ...ids,
    ]);
  },

  /** Events reference templates with ON DELETE RESTRICT, so a template in use can only be unpublished. */
  async countEventsUsing(id) {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM events WHERE template_id = ?', [id]);
    return rows[0].total;
  },

  async deleteById(id) {
    await pool.query('DELETE FROM event_templates WHERE id = ?', [id]);
  },
};
