-- +up
-- Phase 3: the `payments` table (migration 014) already exists for
-- subscription billing (user_id + subscription_id). Rather than creating
-- a second, duplicate "payment record" concept, this extends the same
-- table to also cover per-card order payments (order_id) — a payment
-- row now belongs to exactly one of subscription_id/order_id, enforced
-- in application code (services/payment.service.js), not a DB CHECK:
-- order_id/user_id both carry an ON DELETE SET NULL referential action,
-- and MySQL 8 rejects a column driven by a referential action also being
-- part of a CHECK constraint (error 3823 — the same reason
-- orders.service.js#assertHasContact exists instead of a CHECK on
-- orders). user_id becomes nullable because Try-Our-Service-style guest
-- checkouts (no account) must be able to pay too, same as orders.user_id.
ALTER TABLE payments
  MODIFY COLUMN user_id INT UNSIGNED NULL,
  ADD COLUMN order_id INT UNSIGNED NULL AFTER subscription_id,
  ADD COLUMN method VARCHAR(30) NULL AFTER provider,
  ADD COLUMN failure_reason VARCHAR(500) NULL AFTER provider_reference,
  ADD COLUMN paid_at TIMESTAMP NULL AFTER failure_reason,
  ADD KEY idx_payments_order_id (order_id),
  ADD UNIQUE KEY uq_payments_provider_reference (provider_reference),
  ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;

-- +down
ALTER TABLE payments
  DROP FOREIGN KEY fk_payments_order,
  DROP KEY uq_payments_provider_reference,
  DROP KEY idx_payments_order_id,
  DROP COLUMN paid_at,
  DROP COLUMN failure_reason,
  DROP COLUMN method,
  DROP COLUMN order_id,
  MODIFY COLUMN user_id INT UNSIGNED NOT NULL;
