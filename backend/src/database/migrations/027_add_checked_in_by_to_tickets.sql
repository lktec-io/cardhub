-- +up
-- Door check-in (Admin → Scan & verify): who admitted the ticket. Additive
-- and nullable, so existing tickets and code paths are unaffected;
-- checked_in_at/status already exist from migration 024.
ALTER TABLE tickets
  ADD COLUMN checked_in_by INT UNSIGNED NULL AFTER checked_in_at,
  ADD CONSTRAINT fk_tickets_checked_in_by FOREIGN KEY (checked_in_by) REFERENCES users (id) ON DELETE SET NULL;

-- +down
ALTER TABLE tickets DROP FOREIGN KEY fk_tickets_checked_in_by;
ALTER TABLE tickets DROP COLUMN checked_in_by;
