-- +up
-- One row per admission — an order of quantity 3 issues 3 tickets, each
-- with its own QR. Two identifiers, neither sequential:
--   ticket_code — short, human-readable (CH-XXXXXXXX, 40 random bits) for
--                 support calls and manual door look-ups
--   token       — 256-bit random, base64url; the QR/verification secret
-- uq_tickets_order_seq makes issuance idempotent at the database level:
-- a retried fulfilment can never create a second "ticket #1" for an order.
-- status/checked_in_at are here now so a future door-scanner module can
-- mark tickets as used without another migration.
CREATE TABLE tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_order_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  ticket_type_id INT UNSIGNED NOT NULL,
  seq SMALLINT UNSIGNED NOT NULL,
  ticket_code VARCHAR(16) NOT NULL,
  token VARCHAR(64) NOT NULL,
  holder_name VARCHAR(150) NOT NULL,
  holder_phone VARCHAR(30) NOT NULL,
  holder_email VARCHAR(190) NULL,
  price_tzs INT UNSIGNED NOT NULL,
  status ENUM('valid', 'used', 'cancelled') NOT NULL DEFAULT 'valid',
  checked_in_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tickets_ticket_code (ticket_code),
  UNIQUE KEY uq_tickets_token (token),
  UNIQUE KEY uq_tickets_order_seq (ticket_order_id, seq),
  KEY idx_tickets_event_status (event_id, status),
  CONSTRAINT fk_tickets_order FOREIGN KEY (ticket_order_id) REFERENCES ticket_orders (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES ticket_types (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +down
DROP TABLE IF EXISTS tickets;
