-- V002: Add extra_views column to projects
-- Stores JSON array of view slugs enabled beyond the methodology defaults
-- e.g. ["backlog", "lista"]

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS extra_views JSONB NOT NULL DEFAULT '[]';
