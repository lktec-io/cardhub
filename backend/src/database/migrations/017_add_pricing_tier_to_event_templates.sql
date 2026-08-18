-- +up
ALTER TABLE event_templates
  ADD COLUMN pricing_tier ENUM('starter', 'premium', 'classic') NOT NULL DEFAULT 'starter' AFTER category;

-- +down
ALTER TABLE event_templates DROP COLUMN pricing_tier;
