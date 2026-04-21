-- =============================================================================
-- Rxflow — Espacios de trabajo
-- Versión : V002
-- Fecha   : 2026-04-21
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLA: workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  description  TEXT,
  color        TEXT        NOT NULL DEFAULT '#6366f1',
  icon         TEXT        NOT NULL DEFAULT 'layers',
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA PIVOT: workspace_projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_projects (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id)   ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, project_id)
);

-- ---------------------------------------------------------------------------
-- TABLA PIVOT: workspace_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
