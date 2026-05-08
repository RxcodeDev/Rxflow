-- V008: Convert tasks.status and tasks.priority from PostgreSQL ENUM to TEXT
-- Prisma maps these as String but cannot deserialize native ENUM OIDs (P2032).
-- Idempotent: safe to run even if columns are already TEXT.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'status'
      AND data_type    = 'USER-DEFINED'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN status   TYPE TEXT USING status::TEXT;
    ALTER TABLE tasks ALTER COLUMN priority TYPE TEXT USING priority::TEXT;
    ALTER TABLE tasks ALTER COLUMN status   SET DEFAULT 'backlog';
    ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'media';
    RAISE NOTICE 'V008: tasks.status and tasks.priority converted to TEXT';
  ELSE
    RAISE NOTICE 'V008: tasks.status already TEXT, skipping';
  END IF;
END$$;
