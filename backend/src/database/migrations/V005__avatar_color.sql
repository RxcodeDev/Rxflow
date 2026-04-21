-- Add avatar_color column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) NULL;
