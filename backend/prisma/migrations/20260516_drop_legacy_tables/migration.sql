
-- Tablas para gestión de invitaciones y catálogo de posiciones de miembro
CREATE TABLE IF NOT EXISTS license_invites (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	license_id UUID NOT NULL,
	email VARCHAR(255) NOT NULL,
	invited_by UUID NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'pending',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	accepted_at TIMESTAMPTZ,
	CONSTRAINT license_invites_license_id_fkey FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
	CONSTRAINT license_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS positions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(100) NOT NULL,
	description TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
