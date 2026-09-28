-- +up
-- A single ticket purchase (one ticket type x quantity). Deliberately a
-- separate table from `orders` (migration 016): that table is shaped
-- around a card order (template_id, pricing_tier, SMS/WhatsApp delivery
-- and RSVP columns), none of which apply to a ticket sale. Payment is NOT
-- duplicated — ticket orders are paid through the existing `payments`
-- table (migration 025 adds payments.ticket_order_id) and the same
-- provider abstraction/webhook as card orders.
--
-- status mirrors payments.status (constants/paymentStatus.js) so the two
-- can never disagree on vocabulary. public_token is the unguessable key
-- the buyer's browser uses for this order (never the sequential id).
-- idempotency_key is generated client-side per checkout attempt, so a
-- double-click or a replayed request resolves to the same order instead
-- of reserving inventory twice.
CREATE TABLE ticket_orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_token VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(64) NULL,
  event_id INT UNSIGNED NOT NULL,
  ticket_type_id INT UNSIGNED NOT NULL,
  buyer_name VARCHAR(150) NOT NULL,
  buyer_phone VARCHAR(30) NOT NULL,
  buyer_email VARCHAR(190) NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  unit_price_tzs INT UNSIGNED NOT NULL,
  total_tzs INT UNSIGNED NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TZS',
  status ENUM('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  reservation_expires_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticket_orders_public_token (public_token),
  UNIQUE KEY uq_ticket_orders_idempotency_key (idempotency_key),
  KEY idx_ticket_orders_event (event_id),
  KEY idx_ticket_orders_status_expiry (status, reservation_expires_at),
  CONSTRAINT fk_ticket_orders_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ticket_orders_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES ticket_types (id) ON DELETE RESTRICT,
  CONSTRAINT chk_ticket_orders_quantity CHECK (quantity > 0),
  CONSTRAINT chk_ticket_orders_total CHECK (total_tzs = unit_price_tzs * quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +down
DROP TABLE IF EXISTS ticket_orders;
