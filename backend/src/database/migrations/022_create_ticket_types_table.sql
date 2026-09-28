-- +up
-- One row per sellable ticket category of an event (Regular, VIP, VVIP...).
-- Prices live here, never in the frontend — tickets.service.js computes
-- every order total from price_tzs server-side.
--
-- Inventory is three counters instead of a derived COUNT(*) so the
-- oversell guard can be a single atomic conditional UPDATE:
--   quantity_available — total capacity for this type
--   quantity_reserved  — held by pending checkouts (released on expiry/failure)
--   quantity_sold      — issued, paid tickets
-- chk_ticket_types_capacity is the last line of defence: even a buggy
-- caller can never push sold + reserved past capacity.
CREATE TABLE ticket_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  price_tzs INT UNSIGNED NOT NULL,
  quantity_available INT UNSIGNED NOT NULL,
  quantity_sold INT UNSIGNED NOT NULL DEFAULT 0,
  quantity_reserved INT UNSIGNED NOT NULL DEFAULT 0,
  max_per_order SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  sales_start DATETIME NULL,
  sales_end DATETIME NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticket_types_event_name (event_id, name),
  KEY idx_ticket_types_event_status (event_id, status),
  CONSTRAINT fk_ticket_types_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT chk_ticket_types_price CHECK (price_tzs > 0),
  CONSTRAINT chk_ticket_types_max_per_order CHECK (max_per_order > 0),
  CONSTRAINT chk_ticket_types_capacity CHECK (quantity_sold + quantity_reserved <= quantity_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +down
DROP TABLE IF EXISTS ticket_types;
