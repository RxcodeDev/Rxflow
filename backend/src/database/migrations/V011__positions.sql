-- =============================================================================
-- Rxflow — V011: Tabla de cargos por licencia
-- Descripción: Permite definir una lista de cargos/puestos personalizados
--              por cuenta (licencia) para asignar a miembros.
-- =============================================================================

CREATE TABLE IF NOT EXISTS positions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID        NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_id, name)
);

CREATE INDEX IF NOT EXISTS idx_positions_license ON positions(license_id);
