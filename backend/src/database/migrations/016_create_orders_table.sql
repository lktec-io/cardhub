-- +up
CREATE TABLE orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  template_id INT UNSIGNED NULL,
  guest_name VARCHAR(150) NULL,
  guest_phone VARCHAR(30) NULL,
  pricing_tier VARCHAR(20) NOT NULL,
  unit_price_tzs INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  subtotal_tzs INT UNSIGNED NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid', 'pending', 'paid', 'failed') NOT NULL DEFAULT 'unpaid',
  delivery_status ENUM('pending', 'queued', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  source ENUM('try_service', 'dashboard') NOT NULL DEFAULT 'try_service',
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_template_id (template_id),
  KEY idx_orders_status (status),
  KEY idx_orders_payment_status (payment_status),
  KEY idx_orders_created_at (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_template FOREIGN KEY (template_id) REFERENCES event_templates (id) ON DELETE SET NULL,
  CONSTRAINT chk_orders_quantity CHECK (quantity > 0),
  CONSTRAINT chk_orders_unit_price CHECK (unit_price_tzs > 0)
  -- No CHECK constraint here for "must have a user or guest contact": MySQL
  -- 8 rejects it (error 3823) because `user_id` already carries an
  -- ON DELETE SET NULL referential action on fk_orders_user, and a column
  -- driven by a referential action cannot also be constrained by a CHECK —
  -- the SET NULL could otherwise put an existing row in violation outside
  -- of normal DML. That business rule is enforced instead in
  -- services/orders.service.js (assertHasContact), the one place an order
  -- row is ever created.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +down
DROP TABLE IF EXISTS orders;
