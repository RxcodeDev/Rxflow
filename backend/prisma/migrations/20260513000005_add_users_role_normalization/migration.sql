-- =============================================================================
-- Migration: add_users_role_normalization
-- Adds normalized user role columns to users:
--   - user_type (member | owner | admin)
--   - role_type (functional role)
-- Keeps legacy users.role for backward compatibility.
-- =============================================================================

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "user_type" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "role_type" VARCHAR(100);

-- Backfill normalized values from legacy users.role
UPDATE "users"
SET
  "user_type" = CASE
    WHEN LOWER(COALESCE("role", '')) IN ('member', 'owner', 'admin')
      THEN LOWER("role")
    ELSE 'member'
  END,
  "role_type" = CASE
    WHEN "role" IN ('Tech Lead', 'Backend Dev', 'Frontend Dev', 'Full Stack Dev', 'Designer', 'Product Manager')
      THEN "role"
    ELSE NULL
  END
WHERE "user_type" IS NULL OR "role_type" IS NULL;

ALTER TABLE "users"
  ALTER COLUMN "user_type" SET DEFAULT 'member';

UPDATE "users"
SET "user_type" = 'member'
WHERE "user_type" IS NULL;

ALTER TABLE "users"
  ALTER COLUMN "user_type" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_user_type_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_user_type_check"
      CHECK ("user_type" IN ('member', 'owner', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_type_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_role_type_check"
      CHECK (
        "role_type" IS NULL
        OR "role_type" IN (
          'Tech Lead',
          'Backend Dev',
          'Frontend Dev',
          'Full Stack Dev',
          'Designer',
          'Product Manager'
        )
      );
  END IF;
END $$;
