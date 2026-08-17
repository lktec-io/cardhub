-- +up
ALTER TABLE events
  ADD COLUMN invitation_config JSON NULL AFTER description;

-- +down
ALTER TABLE events DROP COLUMN invitation_config;
