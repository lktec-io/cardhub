import { pool } from '../config/db.js';

export const userRepository = {
  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findByPhone(phone) {
    const [rows] = await pool.query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
    return rows[0] || null;
  },

  async create({ name, email, phone, passwordHash, role, preferredLanguage }) {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status, preferred_language)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [name, email, phone || null, passwordHash, role, preferredLanguage || 'en']
    );
    return this.findById(result.insertId);
  },

  async updateProfile(id, { name, phone }) {
    await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, id]);
    return this.findById(id);
  },

  async updatePassword(id, passwordHash) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },

  async updatePreferredLanguage(id, preferredLanguage) {
    await pool.query('UPDATE users SET preferred_language = ? WHERE id = ?', [preferredLanguage, id]);
  },

  async findAllPaginated({ limit, offset, search }) {
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push("(name LIKE ? ESCAPE '\\\\' OR email LIKE ? ESCAPE '\\\\')");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, status, preferred_language, created_at, updated_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);

    return { rows, total: countRows[0].total };
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },

  async countAll() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users');
    return rows[0].total;
  },
};
