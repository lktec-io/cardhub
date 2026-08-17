-- +up
ALTER TABLE users ADD UNIQUE KEY uq_users_phone (phone);

-- +down
ALTER TABLE users DROP INDEX uq_users_phone;
