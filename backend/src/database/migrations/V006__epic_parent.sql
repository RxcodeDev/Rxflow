-- =============================================================================
-- Rxflow — Épica padre-hijo
-- Versión : V006
-- Fecha   : 2026-04-22
-- Descripción: Agrega relación parent_epic_id en epics para jerarquía de épicas.
-- =============================================================================

ALTER TABLE epics
  ADD COLUMN parent_epic_id UUID REFERENCES epics (id) ON DELETE SET NULL;

CREATE INDEX idx_epics_parent ON epics (parent_epic_id);
