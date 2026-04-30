-- =============================================================================
-- Rxflow — Múltiples asignados por tarea
-- Versión : V007
-- Fecha   : 2026-04-30
-- Descripción: Crea tabla task_assignees para soportar múltiples asignados
--              por tarea. Migra los datos existentes de tasks.assignee_id.
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- Migrar asignados existentes del campo singular
INSERT INTO task_assignees (task_id, user_id)
SELECT id, assignee_id
FROM   tasks
WHERE  assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
