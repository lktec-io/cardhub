-- +up
-- Phase 2 hardening: the Try Our Service order needs real event details
-- (event type/name/venue/date/time) so the SMS/WhatsApp message engine
-- can build a genuine, dynamic invitation instead of a generic "your card
-- is ready" notice — CardHub is not wedding-only, so these fields are
-- optional at the DB level and the message builder degrades gracefully
-- when any of them is absent. `guest_type` is an optional single/double
-- allowance (relevant for weddings, not forced for other event types).
-- `rsvp_code` is the human-friendly 5-word public link identifier
-- (utils/rsvpCode.js) — kept separate from the existing `public_token`
-- (migration 018) rather than replacing it, per the "don't destroy the
-- existing token" rule; order.repository.js's findByPublicToken matches
-- either. `rsvp_status` tracks the guest's own attendance response,
-- submitted from the public order-card page.
ALTER TABLE orders
  ADD COLUMN event_type VARCHAR(30) NULL AFTER quantity,
  ADD COLUMN event_name VARCHAR(190) NULL AFTER event_type,
  ADD COLUMN venue VARCHAR(190) NULL AFTER event_name,
  ADD COLUMN event_date DATE NULL AFTER venue,
  ADD COLUMN event_time VARCHAR(5) NULL AFTER event_date,
  ADD COLUMN guest_type ENUM('single', 'double') NULL AFTER event_time,
  ADD COLUMN rsvp_code VARCHAR(60) NULL AFTER public_token,
  ADD COLUMN rsvp_status ENUM('pending', 'attending', 'declined') NOT NULL DEFAULT 'pending' AFTER rsvp_code,
  ADD UNIQUE KEY uq_orders_rsvp_code (rsvp_code);

-- +down
ALTER TABLE orders
  DROP KEY uq_orders_rsvp_code,
  DROP COLUMN rsvp_status,
  DROP COLUMN rsvp_code,
  DROP COLUMN guest_type,
  DROP COLUMN event_time,
  DROP COLUMN event_date,
  DROP COLUMN venue,
  DROP COLUMN event_name,
  DROP COLUMN event_type;
