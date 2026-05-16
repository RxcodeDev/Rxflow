-- =============================================================================
-- Rxflow — V012: Cargos por defecto para licencias existentes
-- Inserta un conjunto base de cargos sugeridos en todas las licencias
-- actuales. Idempotente via ON CONFLICT DO NOTHING.
-- =============================================================================

INSERT INTO positions (license_id, name)
SELECT l.id, p.name
FROM licenses l
CROSS JOIN (VALUES
  -- Tecnología
  ('Tech Lead'),
  ('Backend Developer'),
  ('Frontend Developer'),
  ('Full Stack Developer'),
  ('DevOps Engineer'),
  ('QA Engineer'),
  ('Data Engineer'),
  ('Data Scientist'),
  ('Scrum Master'),
  ('Engineering Manager'),
  -- Diseño & Creativo
  ('UI/UX Designer'),
  ('Product Designer'),
  ('Graphic Designer'),
  ('Creative Director'),
  ('Motion Designer'),
  ('Content Writer'),
  -- Producto & Negocio
  ('Product Manager'),
  ('Product Owner'),
  ('Project Manager'),
  ('Business Analyst'),
  ('Operations Manager'),
  -- Liderazgo
  ('CEO'),
  ('CTO'),
  ('COO'),
  ('CFO'),
  ('CMO'),
  -- Marketing & Ventas
  ('Marketing Manager'),
  ('Social Media Manager'),
  ('Sales Manager'),
  ('Account Manager'),
  ('SEO Specialist'),
  -- Soporte & RR.HH.
  ('HR Manager'),
  ('Recruiter'),
  ('Customer Support'),
  ('IT Support')
) AS p(name)
ON CONFLICT (license_id, name) DO NOTHING;
