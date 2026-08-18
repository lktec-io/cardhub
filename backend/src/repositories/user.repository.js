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
      conditions.push("(u.name LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\' OR u.phone LIKE ? ESCAPE '\\\\')");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.preferred_language, u.created_at, u.updated_at,
              COUNT(o.id) AS order_count
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${whereClause}`, params);

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

  async countByRole(role) {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = ?', [role]);
    return rows[0].total;
  },
};
