-- =============================================================================
-- Migration: add_licenses
-- Adds the License domain on top of the existing schema.
--
-- Changes:
--   1. CREATE TABLE licenses
--   2. CREATE TABLE license_members
--   3. ALTER TABLE workspaces ADD COLUMN license_id
--   4. Seed: create a Default License and assign existing workspaces/users
-- =============================================================================

-- 1. licenses ─────────────────────────────────────────────────────────────────
CREATE TABLE "licenses" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"       VARCHAR(200) NOT NULL,
    "owner_id"   UUID         NOT NULL,
    "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

CREATE TRIGGER "trg_licenses_updated_at"
    BEFORE UPDATE ON "licenses"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE "licenses"
    ADD CONSTRAINT "licenses_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. license_members ──────────────────────────────────────────────────────────
CREATE TABLE "license_members" (
    "license_id" UUID        NOT NULL,
    "user_id"    UUID        NOT NULL,
    "role"       VARCHAR(20) NOT NULL DEFAULT 'member',
    "joined_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "license_members_pkey" PRIMARY KEY ("license_id", "user_id")
);

ALTER TABLE "license_members"
    ADD CONSTRAINT "license_members_license_id_fkey"
    FOREIGN KEY ("license_id") REFERENCES "licenses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "license_members"
    ADD CONSTRAINT "license_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. workspaces.license_id ────────────────────────────────────────────────────
ALTER TABLE "workspaces" ADD COLUMN "license_id" UUID;

ALTER TABLE "workspaces"
    ADD CONSTRAINT "workspaces_license_id_fkey"
    FOREIGN KEY ("license_id") REFERENCES "licenses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Seed default license for existing data ───────────────────────────────────
DO $$
DECLARE
    v_owner_id   UUID;
    v_license_id UUID;
BEGIN
    -- Use the first admin user, or the earliest created active user
    SELECT id INTO v_owner_id
    FROM users
    WHERE is_active = TRUE
    ORDER BY (role = 'admin') DESC, created_at ASC
    LIMIT 1;

    IF v_owner_id IS NOT NULL THEN
        INSERT INTO "licenses" ("name", "owner_id")
        VALUES ('Default License', v_owner_id)
        RETURNING id INTO v_license_id;

        -- Assign all existing workspaces to the default license
        UPDATE "workspaces" SET "license_id" = v_license_id;

        -- Add all active users as license members
        INSERT INTO "license_members" ("license_id", "user_id", "role")
        SELECT
            v_license_id,
            u.id,
            CASE WHEN u.id = v_owner_id THEN 'owner' ELSE 'member' END
        FROM users u
        WHERE u.is_active = TRUE
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
