-- +up
-- Ticketing reuses the existing `events` table rather than creating a
-- parallel "ticketed event" entity — an event can now carry invitations,
-- tickets, or both. The existing unguessable `slug` (utils/slugify.js
-- uniqueSlug, random suffix) doubles as the public ticket-page slug.
-- `ticket_sales_enabled` is an explicit opt-in: no existing event starts
-- selling tickets because of this migration (default 0).
-- `organizer_contact` is deliberately separate from the owner's account
-- phone/email — it's the contact the organizer chooses to publish.
ALTER TABLE events
  ADD COLUMN end_time TIME NULL AFTER event_time,
  ADD COLUMN organizer_contact VARCHAR(190) NULL AFTER host_name,
  ADD COLUMN ticket_sales_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD KEY idx_events_ticket_sales (ticket_sales_enabled, status, event_date);

-- +down
ALTER TABLE events
  DROP KEY idx_events_ticket_sales,
  DROP COLUMN ticket_sales_enabled,
  DROP COLUMN organizer_contact,
  DROP COLUMN end_time;
