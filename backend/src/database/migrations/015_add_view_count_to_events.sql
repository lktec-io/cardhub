-- +up
ALTER TABLE events ADD COLUMN view_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER invitation_config;

-- +down
ALTER TABLE events DROP COLUMN view_count;
