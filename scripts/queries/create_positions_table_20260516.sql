-- ================================================================
-- Crea la tabla positions que faltaba en la BD — 2026-05-16
-- El modelo Position existe en prisma/schema.prisma pero nunca
-- se generó la migración correspondiente.
-- ================================================================

CREATE TABLE IF NOT EXISTS positions (
  id         uuid         NOT NULL DEFAULT gen_random_uuid(),
  license_id uuid         NOT NULL,
  name       varchar(100) NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT positions_pkey              PRIMARY KEY (id),
  CONSTRAINT positions_license_id_name_key UNIQUE (license_id, name),
  CONSTRAINT positions_license_id_fkey   FOREIGN KEY (license_id)
    REFERENCES licenses (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS positions_license_id_idx ON positions (license_id);
