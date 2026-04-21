-- =============================================================================
-- Rxflow — Schema inicial
-- Versión : V001
-- Fecha   : 2026-04-20
-- Autor   : sistema
-- Descripción: Esquema completo inicial con todas las entidades del dominio.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- ENUMERACIONES
-- ---------------------------------------------------------------------------
CREATE TYPE priority_enum AS ENUM (
  'urgente', 'alta', 'media', 'baja'
);

CREATE TYPE task_status_enum AS ENUM (
  'backlog', 'en_progreso', 'en_revision', 'bloqueado', 'completada'
);

CREATE TYPE project_status_enum AS ENUM (
  'activo', 'pausado', 'archivado'
);

CREATE TYPE cycle_status_enum AS ENUM (
  'planificado', 'activo', 'completado'
);

CREATE TYPE epic_status_enum AS ENUM (
  'activa', 'completada', 'archivada'
);

CREATE TYPE methodology_enum AS ENUM (
  'scrum', 'kanban', 'shape_up'
);

CREATE TYPE notification_type_enum AS ENUM (
  'mention', 'asignado', 'comentario', 'completado', 'bloqueado'
);

CREATE TYPE presence_enum AS ENUM (
  'online', 'away', 'offline'
);

CREATE TYPE integration_status_enum AS ENUM (
  'conectado', 'desconectado'
);

CREATE TYPE member_role_enum AS ENUM (
  'owner', 'admin', 'member', 'viewer'
);

-- ---------------------------------------------------------------------------
-- FUNCIÓN AUXILIAR: updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- TABLA: users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(50)  NOT NULL DEFAULT 'member',
  initials        VARCHAR(4)   NOT NULL,          -- 'AN', 'LM', …
  avatar_url      VARCHAR(500),
  presence_status presence_enum NOT NULL DEFAULT 'offline',
  last_seen_at    TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email        ON users (email);
CREATE INDEX idx_users_is_active    ON users (is_active);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA: projects
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id           UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(4)           NOT NULL UNIQUE,  -- 'ENG', 'DES', …
  name         VARCHAR(100)         NOT NULL,
  description  TEXT,
  methodology  methodology_enum     NOT NULL DEFAULT 'kanban',
  status       project_status_enum  NOT NULL DEFAULT 'activo',
  created_by   UUID                 NOT NULL REFERENCES users (id),
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status     ON projects (status);
CREATE INDEX idx_projects_created_by ON projects (created_by);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA: project_members  (pivote usuarios ↔ proyectos)
-- ---------------------------------------------------------------------------
CREATE TABLE project_members (
  project_id  UUID             NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id     UUID             NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
  role        member_role_enum NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members (user_id);

-- ---------------------------------------------------------------------------
-- TABLA: project_task_sequences
-- Lleva el contador de sequential_id por proyecto para generar ENG-12, etc.
-- ---------------------------------------------------------------------------
CREATE TABLE project_task_sequences (
  project_id   UUID    PRIMARY KEY REFERENCES projects (id) ON DELETE CASCADE,
  last_seq     INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- TABLA: epics
-- ---------------------------------------------------------------------------
CREATE TABLE epics (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID             NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name          VARCHAR(100)     NOT NULL,
  description   TEXT,
  status        epic_status_enum NOT NULL DEFAULT 'activa',
  hill_position FLOAT,           -- 0–100: posición en hill chart
  created_by    UUID             NOT NULL REFERENCES users (id),
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_epics_project    ON epics (project_id);
CREATE INDEX idx_epics_status     ON epics (status);

CREATE TRIGGER trg_epics_updated_at
  BEFORE UPDATE ON epics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA: cycles  (sprints / iteraciones)
-- ---------------------------------------------------------------------------
CREATE TABLE cycles (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID              NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name        VARCHAR(50)       NOT NULL,
  number      INTEGER           NOT NULL,
  status      cycle_status_enum NOT NULL DEFAULT 'planificado',
  start_date  DATE              NOT NULL,
  end_date    DATE              NOT NULL,
  scope_pct   INTEGER           NOT NULL DEFAULT 100 CHECK (scope_pct BETWEEN 0 AND 100),
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, number),
  CONSTRAINT chk_cycle_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_cycles_project ON cycles (project_id);
CREATE INDEX idx_cycles_status  ON cycles (status);

CREATE TRIGGER trg_cycles_updated_at
  BEFORE UPDATE ON cycles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA: tasks
-- ---------------------------------------------------------------------------
CREATE TABLE tasks (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  sequential_id   INTEGER           NOT NULL,        -- auto por proyecto (trigger)
  project_id      UUID              NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  epic_id         UUID              REFERENCES epics (id) ON DELETE SET NULL,
  cycle_id        UUID              REFERENCES cycles (id) ON DELETE SET NULL,
  parent_task_id  UUID              REFERENCES tasks (id) ON DELETE CASCADE,
  title           VARCHAR(255)      NOT NULL,
  description     TEXT,
  status          task_status_enum  NOT NULL DEFAULT 'backlog',
  priority        priority_enum     NOT NULL DEFAULT 'media',
  assignee_id     UUID              REFERENCES users (id) ON DELETE SET NULL,
  created_by      UUID              NOT NULL REFERENCES users (id),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  blocked_reason  TEXT,             -- solo relevante si status = 'bloqueado'
  position        INTEGER           NOT NULL DEFAULT 0,  -- orden dentro de columna
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, sequential_id)
);

CREATE INDEX idx_tasks_project        ON tasks (project_id);
CREATE INDEX idx_tasks_assignee       ON tasks (assignee_id);
CREATE INDEX idx_tasks_epic           ON tasks (epic_id);
CREATE INDEX idx_tasks_cycle          ON tasks (cycle_id);
CREATE INDEX idx_tasks_parent         ON tasks (parent_task_id);
CREATE INDEX idx_tasks_status         ON tasks (status);
CREATE INDEX idx_tasks_due_date       ON tasks (due_date) WHERE due_date IS NOT NULL;

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TRIGGER: asignar sequential_id automáticamente por proyecto
CREATE OR REPLACE FUNCTION assign_task_sequential_id()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  -- Insertar si no existe la fila de secuencia para este proyecto
  INSERT INTO project_task_sequences (project_id, last_seq)
    VALUES (NEW.project_id, 0)
    ON CONFLICT (project_id) DO NOTHING;

  -- Incrementar y obtener el siguiente valor
  UPDATE project_task_sequences
    SET last_seq = last_seq + 1
    WHERE project_id = NEW.project_id
    RETURNING last_seq INTO next_seq;

  NEW.sequential_id := next_seq;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_sequential_id
  BEFORE INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.sequential_id IS NULL OR NEW.sequential_id = 0)
  EXECUTE FUNCTION assign_task_sequential_id();

-- ---------------------------------------------------------------------------
-- TABLA: task_labels  (etiquetas libres)
-- ---------------------------------------------------------------------------
CREATE TABLE labels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  color      VARCHAR(7)  NOT NULL DEFAULT '#6b7280',  -- hex
  UNIQUE (project_id, name)
);

CREATE TABLE task_labels (
  task_id  UUID NOT NULL REFERENCES tasks (id)  ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels (id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- ---------------------------------------------------------------------------
-- TABLA: comments
-- ---------------------------------------------------------------------------
CREATE TABLE comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES users (id),
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_task   ON comments (task_id);
CREATE INDEX idx_comments_author ON comments (author_id);

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA: activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE activity_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        REFERENCES tasks (id)    ON DELETE CASCADE,
  project_id UUID        REFERENCES projects (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users (id),
  action     VARCHAR(100) NOT NULL,
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_task    ON activity_log (task_id)    WHERE task_id IS NOT NULL;
CREATE INDEX idx_activity_project ON activity_log (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_activity_user    ON activity_log (user_id);
CREATE INDEX idx_activity_created ON activity_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- TABLA: notifications
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id           UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID                   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  sender_id    UUID                   NOT NULL REFERENCES users (id),
  type         notification_type_enum NOT NULL,
  task_id      UUID                   REFERENCES tasks (id)    ON DELETE CASCADE,
  project_id   UUID                   REFERENCES projects (id) ON DELETE CASCADE,
  message      VARCHAR(255)           NOT NULL,
  read         BOOLEAN                NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id);
CREATE INDEX idx_notifications_unread    ON notifications (recipient_id) WHERE read = FALSE;
CREATE INDEX idx_notifications_created  ON notifications (created_at DESC);

-- ---------------------------------------------------------------------------
-- TABLA: integrations
-- ---------------------------------------------------------------------------
CREATE TABLE integrations (
  id                UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          VARCHAR(50)            NOT NULL,   -- 'github', 'slack', 'figma'
  connected_as      VARCHAR(255),
  access_token_enc  TEXT,                             -- cifrado en aplicación
  status            integration_status_enum NOT NULL DEFAULT 'desconectado',
  connected_by      UUID                   REFERENCES users (id) ON DELETE SET NULL,
  connected_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  UNIQUE (provider)
);

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA: documents  (herramientas internas)
-- ---------------------------------------------------------------------------
CREATE TABLE documents (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        REFERENCES projects (id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT,                 -- markdown / MDX
  author_id  UUID        NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_project ON documents (project_id) WHERE project_id IS NOT NULL;

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLA: wiki_pages
-- ---------------------------------------------------------------------------
CREATE TABLE wiki_pages (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID         REFERENCES projects (id) ON DELETE CASCADE,
  slug       VARCHAR(200) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  content    TEXT,
  author_id  UUID         NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, slug)
);

CREATE INDEX idx_wiki_project ON wiki_pages (project_id) WHERE project_id IS NOT NULL;

CREATE TRIGGER trg_wiki_updated_at
  BEFORE UPDATE ON wiki_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- FIN DEL SCHEMA V001
-- =============================================================================
