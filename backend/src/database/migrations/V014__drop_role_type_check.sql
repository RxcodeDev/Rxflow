-- The role_type check constraint was created before the positions system existed.
-- Now that positions are free-form and managed per-license, any string is valid.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_type_check;
