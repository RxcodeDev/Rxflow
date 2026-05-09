-- Migration: add_wiki_icon
-- Adds an optional icon column (emoji) to wiki_pages.

ALTER TABLE "wiki_pages" ADD COLUMN "icon" VARCHAR(10);
