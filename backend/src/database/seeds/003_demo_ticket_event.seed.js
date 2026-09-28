/**
 * DEMO SEED — one ticketed event ("Afro Night 2026") so the whole ticket
 * flow (/ticket -> event -> checkout -> demo payment -> ticket) can be
 * tested immediately.
 *
 * Deliberately NOT part of `npm run seed` (seeds/run.js). Run it
 * explicitly with `npm run seed:demo-tickets`, after `npm run seed` (it
 * needs the template catalogue). That keeps a demo event off a production
 * database unless an operator asks for it.
 *
 * Idempotent: re-running updates the same event and ticket types instead
 * of duplicating them, and never resets sold/reserved counters.
 *
 * The event belongs to a dedicated, inactive system account that cannot
 * log in (its password is random and discarded). No real person's
 * account is used.
 */
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { hashPassword } from '../../utils/password.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { buildDefaultInvitationConfig } from '../../utils/defaultInvitationConfig.js';
import { todayInTimezone, addDays } from '../../utils/dateTime.js';

const ORGANIZER = { email: 'demo-events@cardhub.co.tz', name: 'CardHub Events (Demo)' };

const EVENT = {
  title: 'Afro Night 2026',
  eventType: 'party',
  preferredDate: '2026-10-24',
  startTime: '19:00',
  endTime: '23:30',
  venueName: 'Mlimani City',
  venueAddress: 'Sam Nujoma Road, Dar es Salaam',
  hostName: 'CardHub Events',
  organizerContact: '0794 987 520',
  coverImage: '/events/afro-night-2026.svg',
  templateSlug: 'pulse',
  description:
    'A night of Afrobeats, Amapiano and Bongo Flava with live DJs, a dance floor that stays full until late, and food and drinks all evening. ' +
    'Dress to celebrate. Doors open at 19:00. This is a CardHub demo event for testing ticket purchases. No real payment is taken.',
};

const TICKET_TYPES = [
  { name: 'Regular', priceTzs: 10000, quantity: 300, maxPerOrder: 10, sortOrder: 1, description: 'General admission to the main floor.' },
  { name: 'VIP', priceTzs: 20000, quantity: 100, maxPerOrder: 6, sortOrder: 2, description: 'VIP lounge access, fast-track entry and a welcome drink.' },
  { name: 'VVIP', priceTzs: 50000, quantity: 30, maxPerOrder: 4, sortOrder: 3, description: 'Front-stage table, dedicated host service and premium drinks.' },
];

async function ensureOrganizer(connection) {
  const [rows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [ORGANIZER.email]);
  if (rows[0]) return rows[0].id;

  const unusablePasswordHash = await hashPassword(randomBytes(32).toString('hex'));
  const [result] = await connection.query(
    `INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'customer', 'inactive')`,
    [ORGANIZER.name, ORGANIZER.email, unusablePasswordHash]
  );
  return result.insertId;
}

/** Keeps the demo usable after its date passes: falls back to 30 days from today. */
function resolveEventDate() {
  const today = todayInTimezone();
  return EVENT.preferredDate >= today ? EVENT.preferredDate : addDays(today, 30);
}

async function upsertEvent(connection, userId) {
  const [templates] = await connection.query(
    "SELECT id FROM event_templates WHERE slug = ? OR status = 'active' ORDER BY slug = ? DESC, id ASC LIMIT 1",
    [EVENT.templateSlug, EVENT.templateSlug]
  );
  if (!templates[0]) throw new Error('No event template found — run `npm run seed` first');
  const templateId = templates[0].id;
  const eventDate = resolveEventDate();

  const [existing] = await connection.query('SELECT id, slug FROM events WHERE user_id = ? AND title = ? LIMIT 1', [userId, EVENT.title]);

  if (existing[0]) {
    await connection.query(
      `UPDATE events SET event_type = ?, status = 'published', ticket_sales_enabled = 1, event_date = ?, event_time = ?, end_time = ?,
         venue_name = ?, venue_address = ?, description = ?, host_name = ?, organizer_contact = ?, cover_image = ?,
         deleted_at = NULL, published_at = COALESCE(published_at, NOW())
       WHERE id = ?`,
      [EVENT.eventType, eventDate, EVENT.startTime, EVENT.endTime, EVENT.venueName, EVENT.venueAddress, EVENT.description,
        EVENT.hostName, EVENT.organizerContact, EVENT.coverImage, existing[0].id]
    );
    return { id: existing[0].id, slug: existing[0].slug };
  }

  const slug = uniqueSlug(EVENT.title);
  const [result] = await connection.query(
    `INSERT INTO events
       (user_id, template_id, title, event_type, status, ticket_sales_enabled, slug, event_date, event_time, end_time, timezone,
        venue_name, venue_address, description, host_name, organizer_contact, cover_image, invitation_config, published_at)
     VALUES (?, ?, ?, ?, 'published', 1, ?, ?, ?, ?, 'Africa/Dar_es_Salaam', ?, ?, ?, ?, ?, ?, CAST(? AS JSON), NOW())`,
    [userId, templateId, EVENT.title, EVENT.eventType, slug, eventDate, EVENT.startTime, EVENT.endTime, EVENT.venueName,
      EVENT.venueAddress, EVENT.description, EVENT.hostName, EVENT.organizerContact, EVENT.coverImage,
      JSON.stringify(buildDefaultInvitationConfig())]
  );
  return { id: result.insertId, slug };
}

async function upsertTicketTypes(connection, eventId) {
  for (const type of TICKET_TYPES) {
    // GREATEST keeps capacity from dropping below what's already sold or
    // held, which would violate chk_ticket_types_capacity.
    await connection.query(
      `INSERT INTO ticket_types (event_id, name, description, price_tzs, quantity_available, max_per_order, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
       ON DUPLICATE KEY UPDATE
         description = VALUES(description),
         price_tzs = VALUES(price_tzs),
         quantity_available = GREATEST(VALUES(quantity_available), quantity_sold + quantity_reserved),
         max_per_order = VALUES(max_per_order),
         status = 'active',
         sort_order = VALUES(sort_order)`,
      [eventId, type.name, type.description, type.priceTzs, type.quantity, type.maxPerOrder, type.sortOrder]
    );
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
  });

  try {
    await connection.beginTransaction();
    const userId = await ensureOrganizer(connection);
    const event = await upsertEvent(connection, userId);
    await upsertTicketTypes(connection, event.id);
    await connection.commit();
    logger.info(`Seeded demo ticket event "${EVENT.title}" with ${TICKET_TYPES.length} ticket types`, { path: `/ticket/event/${event.slug}` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  logger.error('Demo ticket seeding failed', { message: error.message });
  process.exit(1);
});
