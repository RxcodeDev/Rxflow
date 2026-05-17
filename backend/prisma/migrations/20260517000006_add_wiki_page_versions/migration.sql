-- Migration: add_wiki_page_versions
-- Adds a history table for wiki pages to support rollback.
-- Versions are coalesced per editing session by the application layer.

CREATE TABLE "wiki_page_versions" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "page_id"      UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "title"        VARCHAR(500) NOT NULL,
  "content"      JSONB NOT NULL,
  "icon"         VARCHAR(10),
  "created_by"   UUID NOT NULL,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "wiki_page_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wiki_page_versions_page_id_created_at_idx"
  ON "wiki_page_versions" ("page_id", "created_at");

ALTER TABLE "wiki_page_versions"
  ADD CONSTRAINT "wiki_page_versions_page_id_fkey"
  FOREIGN KEY ("page_id") REFERENCES "wiki_pages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
