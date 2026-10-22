-- +up
-- Admin-managed promotional media (event videos, promo images) shown on
-- the public site. Files live on the server disk (services/providers/
-- mediaStorage.js); this table only stores their server-generated keys.
-- Invitation card images are NOT stored here: they belong to the existing
-- event_templates catalogue (preview_image), which the trial and checkout
-- flows already reference by template id.
CREATE TABLE media_assets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind ENUM('video', 'image') NOT NULL,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  category VARCHAR(30) NULL,
  file_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(60) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  poster_key VARCHAR(255) NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_assets_file_key (file_key),
  KEY idx_media_assets_public (status, kind, sort_order),
  CONSTRAINT fk_media_assets_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +down
DROP TABLE IF EXISTS media_assets;
