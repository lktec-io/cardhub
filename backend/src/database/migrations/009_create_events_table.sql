-- +up
CREATE TABLE events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  template_id INT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  slug VARCHAR(220) NOT NULL,
  event_date DATE NULL,
  event_time TIME NULL,
  timezone VARCHAR(60) NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
  venue_name VARCHAR(190) NULL,
  venue_address VARCHAR(255) NULL,
  description TEXT NULL,
  host_name VARCHAR(190) NULL,
  cover_image VARCHAR(500) NULL,
  primary_color VARCHAR(20) NULL,
  secondary_color VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME NULL,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_events_slug (slug),
  KEY idx_events_user_deleted (user_id, deleted_at),
  KEY idx_events_status (status),
  KEY idx_events_event_date (event_date),
  KEY idx_events_updated_at (updated_at),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_events_template FOREIGN KEY (template_id) REFERENCES event_templates (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +down
DROP TABLE IF EXISTS events;
