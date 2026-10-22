import { pool } from '../config/db.js';

/** Admin-managed promotional media (migration 026). */
export const mediaAssetRepository = {
  async findAll({ kind, status } = {}) {
    const conditions = [];
    const params = [];
    if (kind) {
      conditions.push('kind = ?');
      params.push(kind);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM media_assets ${where} ORDER BY sort_order ASC, id DESC`, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM media_assets WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async create({ kind, title, description, category, fileKey, mimeType, sizeBytes, status, createdBy }) {
    const [sortRows] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM media_assets WHERE kind = ?', [kind]);
    const [result] = await pool.query(
      `INSERT INTO media_assets (kind, title, description, category, file_key, mime_type, size_bytes, status, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kind, title, description ?? null, category ?? null, fileKey, mimeType, sizeBytes, status, sortRows[0].next, createdBy ?? null]
    );
    return this.findById(result.insertId);
  },

  async updateDetails(id, { title, description, category, status }) {
    await pool.query('UPDATE media_assets SET title = ?, description = ?, category = ?, status = ? WHERE id = ?', [
      title,
      description ?? null,
      category ?? null,
      status,
      id,
    ]);
    return this.findById(id);
  },

  async updatePoster(id, posterKey) {
    await pool.query('UPDATE media_assets SET poster_key = ? WHERE id = ?', [posterKey, id]);
    return this.findById(id);
  },

  async reorder(ids) {
    if (!ids.length) return;
    const cases = ids.map(() => 'WHEN ? THEN ?').join(' ');
    await pool.query(`UPDATE media_assets SET sort_order = CASE id ${cases} END WHERE id IN (${ids.map(() => '?').join(', ')})`, [
      ...ids.flatMap((id, index) => [id, index + 1]),
      ...ids,
    ]);
  },

  async deleteById(id) {
    await pool.query('DELETE FROM media_assets WHERE id = ?', [id]);
  },
};
