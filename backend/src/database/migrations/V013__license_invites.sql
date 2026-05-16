CREATE TABLE license_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id  UUID        NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  token       VARCHAR(64) NOT NULL UNIQUE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member',
  role_type   VARCHAR(100),
  created_by  UUID        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  used_by     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_license_invites_token ON license_invites(token);
