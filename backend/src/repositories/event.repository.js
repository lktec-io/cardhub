import { pool } from '../config/db.js';
import { buildDefaultInvitationConfig } from '../utils/defaultInvitationConfig.js';

const EDITABLE_FIELDS = [
  'title',
  'event_type',
  'event_date',
  'event_time',
  'timezone',
  'venue_name',
  'venue_address',
  'description',
  'host_name',
];

export const eventRepository = {
  async create({
    userId,
    templateId,
    title,
    eventType,
    slug,
    eventDate,
    eventTime,
    timezone,
    venueName,
    venueAddress,
    description,
    hostName,
    invitationConfig,
  }) {
    const [result] = await pool.query(
      `INSERT INTO events
         (user_id, template_id, title, event_type, status, slug, event_date, event_time,
          timezone, venue_name, venue_address, description, host_name, invitation_config)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [
        userId,
        templateId,
        title,
        eventType,
        slug,
        eventDate || null,
        eventTime || null,
        timezone,
        venueName || null,
        venueAddress || null,
        description || null,
        hostName || null,
        JSON.stringify(invitationConfig || buildDefaultInvitationConfig()),
      ]
    );
    return this.findByIdAndUserId(result.insertId, userId);
  },

  async findByIdAndUserId(id, userId) {
    const [rows] = await pool.query(
      `SELECT e.*, t.name AS template_name, t.slug AS template_slug, t.category AS template_category,
              t.config AS template_config, t.status AS template_status
       FROM events e
       JOIN event_templates t ON t.id = e.template_id
       WHERE e.id = ? AND e.user_id = ? AND e.deleted_at IS NULL
       LIMIT 1`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async findAllByUserId(userId, { limit, offset, search, orderBy }) {
    const conditions = ['e.user_id = ?', 'e.deleted_at IS NULL'];
    const params = [userId];

    if (search) {
      conditions.push("(e.title LIKE ? ESCAPE '\\\\' OR e.host_name LIKE ? ESCAPE '\\\\')");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT e.*, t.name AS template_name, t.slug AS template_slug, t.category AS template_category,
              t.config AS template_config, t.status AS template_status
       FROM events e
       JOIN event_templates t ON t.id = e.template_id
       WHERE ${whereClause}
       ORDER BY e.${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM events e WHERE ${whereClause}`,
      params
    );

    return { rows, total: countRows[0].total };
  },

  async countByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM events WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );
    return rows[0].total;
  },

  async countPublishedByUserId(userId) {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS total FROM events WHERE user_id = ? AND status = 'published' AND deleted_at IS NULL",
      [userId]
    );
    return rows[0].total;
  },

  async updateByIdAndUserId(id, userId, changes) {
    const fields = Object.keys(changes).filter((key) => EDITABLE_FIELDS.includes(key));
    if (fields.length === 0) return this.findByIdAndUserId(id, userId);

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => changes[field] ?? null);

    await pool.query(
      `UPDATE events SET ${setClause} WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [...values, id, userId]
    );
    return this.findByIdAndUserId(id, userId);
  },

  async updateTemplateByIdAndUserId(id, userId, templateId) {
    await pool.query(
      'UPDATE events SET template_id = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [templateId, id, userId]
    );
    return this.findByIdAndUserId(id, userId);
  },

  async softDeleteByIdAndUserId(id, userId) {
    const [result] = await pool.query(
      'UPDATE events SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async slugExists(slug) {
    const [rows] = await pool.query('SELECT id FROM events WHERE slug = ? LIMIT 1', [slug]);
    return rows.length > 0;
  },

  async updateInvitationConfigByIdAndUserId(id, userId, config) {
    await pool.query(
      'UPDATE events SET invitation_config = CAST(? AS JSON) WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [JSON.stringify(config), id, userId]
    );
    return this.findByIdAndUserId(id, userId);
  },

  async publishByIdAndUserId(id, userId) {
    await pool.query(
      `UPDATE events SET status = 'published', published_at = NOW()
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return this.findByIdAndUserId(id, userId);
  },

  async unpublishByIdAndUserId(id, userId) {
    await pool.query(
      `UPDATE events SET status = 'draft', published_at = NULL
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return this.findByIdAndUserId(id, userId);
  },

  async incrementViewCount(id) {
    await pool.query('UPDATE events SET view_count = view_count + 1 WHERE id = ?', [id]);
  },

  async findAllPaginatedAdmin({ limit, offset, search, status }) {
    const conditions = ['e.deleted_at IS NULL'];
    const params = [];

    if (status) {
      conditions.push('e.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push("(e.title LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT e.*, u.name AS owner_name, u.email AS owner_email, t.name AS template_name
       FROM events e
       JOIN users u ON u.id = e.user_id
       JOIN event_templates t ON t.id = e.template_id
       WHERE ${whereClause}
       ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM events e JOIN users u ON u.id = e.user_id WHERE ${whereClause}`,
      params
    );

    return { rows, total: countRows[0].total };
  },

  async countAll() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM events WHERE deleted_at IS NULL');
    return rows[0].total;
  },

  async countAllPublished() {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM events WHERE status = 'published' AND deleted_at IS NULL");
    return rows[0].total;
  },

  async findPublishedBySlug(slug) {
    const [rows] = await pool.query(
      `SELECT e.*, t.name AS template_name, t.category AS template_category, t.config AS template_config
       FROM events e
       JOIN event_templates t ON t.id = e.template_id
       WHERE e.slug = ? AND e.status = 'published' AND e.deleted_at IS NULL
       LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  },
};
