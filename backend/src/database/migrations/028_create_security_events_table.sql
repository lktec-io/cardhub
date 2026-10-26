-- +up
-- Append-only record of destructive admin actions (hard deletes, audit-log
-- purges). Kept separate from audit_logs so that deleting audit entries is
-- itself traceable. No foreign keys on purpose: the actor and the deleted
-- entity are usually gone, and their ids/labels must survive. The app has
-- no endpoint that updates or deletes these rows.
CREATE TABLE security_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  actor_email VARCHAR(190) NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(64) NULL,
  summary VARCHAR(255) NULL,
  metadata JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_security_events_created (created_at),
  KEY idx_security_events_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +down
DROP TABLE IF EXISTS security_events;
