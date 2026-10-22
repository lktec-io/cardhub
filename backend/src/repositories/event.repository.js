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

  // ---------- Admin portal (mounted behind authorize('admin') only) ----------

  /** Any non-deleted event, regardless of owner. */
  async findByIdAny(id, db = pool) {
    const [rows] = await db.query(
      `SELECT e.*, t.name AS template_name, t.slug AS template_slug, t.category AS template_category,
              t.config AS template_config, t.status AS template_status, u.name AS owner_name, u.email AS owner_email
       FROM events e
       JOIN event_templates t ON t.id = e.template_id
       JOIN users u ON u.id = e.user_id
       WHERE e.id = ? AND e.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async updateDetailsById(id, { title, eventType, eventDate, eventTime, endTime, venueName, venueAddress, description, hostName, organizerContact }) {
    await pool.query(
      `UPDATE events
       SET title = ?, event_type = ?, event_date = ?, event_time = ?, end_time = ?, venue_name = ?, venue_address = ?,
           description = ?, host_name = ?, organizer_contact = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [title, eventType, eventDate, eventTime, endTime, venueName, venueAddress, description, hostName, organizerContact, id]
    );
    return this.findByIdAny(id);
  },

  async updateCoverById(id, coverImage) {
    await pool.query('UPDATE events SET cover_image = ? WHERE id = ? AND deleted_at IS NULL', [coverImage, id]);
    return this.findByIdAny(id);
  },

  async setPublishedById(id, published) {
    await pool.query(
      `UPDATE events SET status = ?, published_at = ${published ? 'COALESCE(published_at, NOW())' : 'NULL'} WHERE id = ? AND deleted_at IS NULL`,
      [published ? 'published' : 'draft', id]
    );
    return this.findByIdAny(id);
  },

  /**
   * Admin ticketing overview: every event that sells (or is set up to sell)
   * tickets, with allocation, sales and revenue. `scope: 'all'` also lists
   * events with no ticket setup yet, so an admin can add tickets to them.
   * Demo-mode revenue is summed separately and never mixed into real revenue.
   */
  async findAllTicketingAdmin({ search, scope, limit, offset }) {
    const conditions = ['e.deleted_at IS NULL'];
    const params = [];
    if (scope !== 'all') conditions.push('(e.ticket_sales_enabled = 1 OR EXISTS (SELECT 1 FROM ticket_types x WHERE x.event_id = e.id))');
    if (search) {
      conditions.push("(e.title LIKE ? ESCAPE '\\\\' OR e.venue_name LIKE ? ESCAPE '\\\\')");
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.join(' AND ');
    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.slug, e.status, e.event_type, e.event_date, e.event_time, e.venue_name, e.cover_image,
              e.ticket_sales_enabled, e.created_at, u.name AS owner_name,
              (SELECT COUNT(*) FROM ticket_types tt WHERE tt.event_id = e.id) AS tier_count,
              (SELECT COALESCE(SUM(tt.quantity_available), 0) FROM ticket_types tt WHERE tt.event_id = e.id) AS allocated,
              (SELECT COALESCE(SUM(tt.quantity_sold), 0) FROM ticket_types tt WHERE tt.event_id = e.id) AS sold,
              (SELECT COALESCE(SUM(tt.quantity_reserved), 0) FROM ticket_types tt WHERE tt.event_id = e.id) AS reserved,
              (SELECT COALESCE(SUM(o.total_tzs), 0) FROM ticket_orders o WHERE o.event_id = e.id AND o.status = 'paid' AND o.is_demo = 0) AS revenue_tzs,
              (SELECT COALESCE(SUM(o.total_tzs), 0) FROM ticket_orders o WHERE o.event_id = e.id AND o.status = 'paid' AND o.is_demo = 1) AS demo_revenue_tzs
       FROM events e
       JOIN users u ON u.id = e.user_id
       WHERE ${where}
       ORDER BY e.event_date IS NULL, e.event_date DESC, e.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM events e WHERE ${where}`, params);
    return { rows, total: countRows[0].total };
  },

  /** Ticket-sales settings (Event Workspace → Tickets). Owner-scoped like every other write in this file. */
  async updateTicketSettingsByIdAndUserId(id, userId, { ticketSalesEnabled, coverImage, organizerContact, endTime }, db = pool) {
    await db.query(
      `UPDATE events
       SET ticket_sales_enabled = ?, cover_image = ?, organizer_contact = ?, end_time = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [ticketSalesEnabled ? 1 : 0, coverImage ?? null, organizerContact ?? null, endTime ?? null, id, userId]
    );
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
