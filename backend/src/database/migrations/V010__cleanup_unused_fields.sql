-- =============================================================================
-- Rxflow — V010: Eliminar tablas y columnas sin uso
-- Fecha: 2026-05-15
-- Descripción:
--   - Elimina tablas vacías sin código que las use: labels, task_labels,
--     documents, integrations.
--   - Elimina columnas sin uso en tasks: parent_task_id (modelo subtareas
--     deprecado), completed_at.
--   - Elimina columna sin uso en epics: hill_position.
-- =============================================================================

-- Tablas vacías sin módulo backend ──────────────────────────────────────────

DROP TABLE IF EXISTS task_labels;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS integrations;

-- Columnas obsoletas en epics ────────────────────────────────────────────────

ALTER TABLE epics DROP COLUMN IF EXISTS hill_position;

-- Columnas obsoletas en tasks ────────────────────────────────────────────────

ALTER TABLE tasks DROP COLUMN IF EXISTS completed_at;

-- parent_task_id: modelo subtareas deprecado.
-- Las 3 filas que tenían parent_task_id quedaron como tareas raíz independientes.
UPDATE tasks SET parent_task_id = NULL WHERE parent_task_id IS NOT NULL;
DROP INDEX IF EXISTS idx_tasks_parent;
ALTER TABLE tasks DROP COLUMN IF EXISTS parent_task_id;
