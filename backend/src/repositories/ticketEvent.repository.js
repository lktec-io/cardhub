import { pool } from '../config/db.js';

// Remaining = capacity - sold - reserved. Cast to SIGNED first: the
// counters are UNSIGNED and MySQL raises "value is out of range" on an
// unsigned subtraction that would go negative, instead of returning < 0.
const REMAINING_EXPR = 'GREATEST(CAST(tt.quantity_available AS SIGNED) - tt.quantity_sold - tt.quantity_reserved, 0)';

// The one definition of "publicly visible ticketed event", shared by the
// listing and the detail lookup so the two can never disagree.
const PUBLIC_EVENT_CONDITIONS = ["e.ticket_sales_enabled = 1", "e.status = 'published'", 'e.deleted_at IS NULL'];

const PUBLIC_EVENT_COLUMNS = `
  e.id, e.slug, e.title, e.event_type, e.event_date, e.event_time, e.end_time, e.timezone,
  e.venue_name, e.venue_address, e.description, e.cover_image, e.host_name, e.organizer_contact`;

/**
 * Read-only queries behind the public ticket marketplace. Uses the
 * existing `events` table (see migration 021). Only events with
 * ticket_sales_enabled, a published status and at least one active
 * ticket type are ever returned, and only the public columns above are
 * selected. user_id, invitation config and view counts never leave this file.
 */
export const ticketEventRepository = {
  async findAllPublic({ fromDate, toDate, search, category, location, maxPrice, limit, offset }) {
    const conditions = [...PUBLIC_EVENT_CONDITIONS, 'e.event_date >= ?'];
    const params = [fromDate];

    if (toDate) {
      conditions.push('e.event_date <= ?');
      params.push(toDate);
    }
    if (category) {
      conditions.push('e.event_type = ?');
      params.push(category);
    }
    if (search) {
      conditions.push(
        "(e.title LIKE ? ESCAPE '\\\\' OR e.description LIKE ? ESCAPE '\\\\' OR e.host_name LIKE ? ESCAPE '\\\\' OR e.venue_name LIKE ? ESCAPE '\\\\')"
      );
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (location) {
      conditions.push("(e.venue_name LIKE ? ESCAPE '\\\\' OR e.venue_address LIKE ? ESCAPE '\\\\')");
      const like = `%${location}%`;
      params.push(like, like);
    }

    const having = maxPrice ? 'HAVING min_price_tzs <= ?' : '';
    const havingParams = maxPrice ? [maxPrice] : [];

    const baseQuery = `
      SELECT ${PUBLIC_EVENT_COLUMNS},
             MIN(tt.price_tzs) AS min_price_tzs,
             SUM(${REMAINING_EXPR}) AS tickets_remaining
      FROM events e
      JOIN ticket_types tt ON tt.event_id = e.id AND tt.status = 'active'
      WHERE ${conditions.join(' AND ')}
      GROUP BY e.id
      ${having}`;

    const [rows] = await pool.query(
      `${baseQuery} ORDER BY e.event_date ASC, e.event_time ASC, e.id ASC LIMIT ? OFFSET ?`,
      [...params, ...havingParams, limit, offset]
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM (${baseQuery}) AS listed`, [...params, ...havingParams]);

    return { rows, total: countRows[0].total };
  },

  async findPublicBySlug(slug) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_EVENT_COLUMNS}
       FROM events e
       WHERE e.slug = ? AND ${PUBLIC_EVENT_CONDITIONS.join(' AND ')}
       LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  },

  /** For orders/tickets: the same public columns, looked up by id, without the "still on sale" conditions (a sold ticket must stay viewable). */
  async findById(id, db = pool) {
    const [rows] = await db.query(`SELECT ${PUBLIC_EVENT_COLUMNS} FROM events e WHERE e.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },
};
