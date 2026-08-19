-- +up
-- Widens the overall delivery lifecycle (pending -> processing -> sent /
-- partially_sent / failed) and adds independent per-channel tracking for
-- SMS and WhatsApp, plus an unguessable public token so a customer's own
-- order confirmation page can be linked to (via SMS/WhatsApp) without
-- exposing the sequential primary key — same reasoning as events.slug.
ALTER TABLE orders
  MODIFY COLUMN delivery_status ENUM('pending', 'processing', 'partially_sent', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  ADD COLUMN sms_status ENUM('not_requested', 'queued', 'sent', 'failed', 'unavailable') NOT NULL DEFAULT 'not_requested' AFTER delivery_status,
  ADD COLUMN sms_provider_message_id VARCHAR(190) NULL AFTER sms_status,
  ADD COLUMN sms_error VARCHAR(500) NULL AFTER sms_provider_message_id,
  ADD COLUMN whatsapp_status ENUM('not_requested', 'queued', 'sent', 'failed', 'unavailable') NOT NULL DEFAULT 'not_requested' AFTER sms_error,
  ADD COLUMN whatsapp_provider_message_id VARCHAR(190) NULL AFTER whatsapp_status,
  ADD COLUMN whatsapp_error VARCHAR(500) NULL AFTER whatsapp_provider_message_id,
  ADD COLUMN public_token VARCHAR(40) NULL AFTER whatsapp_error,
  ADD UNIQUE KEY uq_orders_public_token (public_token);

-- +down
ALTER TABLE orders
  DROP KEY uq_orders_public_token,
  DROP COLUMN public_token,
  DROP COLUMN whatsapp_error,
  DROP COLUMN whatsapp_provider_message_id,
  DROP COLUMN whatsapp_status,
  DROP COLUMN sms_error,
  DROP COLUMN sms_provider_message_id,
  DROP COLUMN sms_status,
  MODIFY COLUMN delivery_status ENUM('pending', 'queued', 'sent', 'failed') NOT NULL DEFAULT 'pending';
