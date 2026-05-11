-- =============================================================================
-- Migration: add_wiki_pages
-- Adds the wiki_pages table for the internal knowledge base module.
--
-- Design:
--   - Multi-tenant: every row has license_id — always filter by it.
--   - At least one relation (workspace/project/epic/task) enforced in app layer.
--   - Self-referential parent_page_id for page hierarchy.
--   - content stored as JSONB (Tiptap ProseMirror JSON doc).
-- =============================================================================

CREATE TABLE IF NOT EXISTS "wiki_pages" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "license_id"     UUID         NOT NULL,
    "title"          VARCHAR(500) NOT NULL,
    "slug"           VARCHAR(255) NOT NULL,
    "content"        JSONB        NOT NULL DEFAULT '{"type":"doc","content":[]}',
    "workspace_id"   UUID,
    "project_code"   VARCHAR(4),
    "epic_id"        UUID,
    "task_id"        UUID,
    "parent_page_id" UUID,
    "created_by"     UUID         NOT NULL,
    "updated_by"     UUID,
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "is_archived"    BOOLEAN      NOT NULL DEFAULT false,
    CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
);

-- Tenant isolation FK
DO $$ BEGIN
    ALTER TABLE "wiki_pages"
        ADD CONSTRAINT "wiki_pages_license_id_fkey"
        FOREIGN KEY ("license_id") REFERENCES "licenses"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Self-referential hierarchy
DO $$ BEGIN
    ALTER TABLE "wiki_pages"
        ADD CONSTRAINT "wiki_pages_parent_page_id_fkey"
        FOREIGN KEY ("parent_page_id") REFERENCES "wiki_pages"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Slug unique per license
CREATE UNIQUE INDEX IF NOT EXISTS "wiki_pages_license_id_slug_key" ON "wiki_pages"("license_id", "slug");

-- Query indexes
CREATE INDEX IF NOT EXISTS "wiki_pages_license_id_idx"   ON "wiki_pages"("license_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_project_code_idx" ON "wiki_pages"("project_code");
CREATE INDEX IF NOT EXISTS "wiki_pages_workspace_id_idx" ON "wiki_pages"("workspace_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_epic_id_idx"      ON "wiki_pages"("epic_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_task_id_idx"      ON "wiki_pages"("task_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_parent_page_idx"  ON "wiki_pages"("parent_page_id");