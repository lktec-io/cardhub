-- +up
-- Same reasoning as migration 020: rather than a second payments table,
-- a payment row may now belong to a ticket order. Exactly one of
-- subscription_id / order_id / ticket_order_id is set per row, enforced in
-- application code (payment.service.js / tickets.service.js) — not a DB
-- CHECK, because MySQL 8 rejects CHECK constraints on columns that carry
-- an ON DELETE SET NULL referential action (error 3823).
ALTER TABLE payments
  ADD COLUMN ticket_order_id INT UNSIGNED NULL AFTER order_id,
  ADD KEY idx_payments_ticket_order_id (ticket_order_id),
  ADD CONSTRAINT fk_payments_ticket_order FOREIGN KEY (ticket_order_id) REFERENCES ticket_orders (id) ON DELETE SET NULL;

-- +down
ALTER TABLE payments
  DROP FOREIGN KEY fk_payments_ticket_order,
  DROP KEY idx_payments_ticket_order_id,
  DROP COLUMN ticket_order_id;
