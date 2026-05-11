-- Allow storing longer avatar payloads (data URLs / base64) from profile uploads.
ALTER TABLE users
  ALTER COLUMN avatar_url TYPE TEXT;