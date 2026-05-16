-- ================================================================
-- Normalización de licencias y tenants — 2026-05-16
-- Separa la BD en 2 licencias:
--   - Rxcode  → owner: Daniel Galicia (rxcode@gmail.com, a4724453)
--   - Soporte → owner: Ricardo Galicia (soporte.ricardo.galicia@rxcode.com, 60ce5ac5)
-- ================================================================

BEGIN;

-- ================================================================
-- 1. CREAR LICENCIAS
-- ================================================================

INSERT INTO licenses (id, name, owner_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Rxcode',
  'a4724453-124c-45a3-a8c5-db01560300cc',
  now(), now()
);

INSERT INTO licenses (id, name, owner_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Soporte',
  '60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3',
  now(), now()
);

-- ================================================================
-- 2. ELIMINAR WORKSPACES "DEVELOPER" DUPLICADOS (conservar b4149039)
-- ================================================================

DELETE FROM workspace_members
WHERE workspace_id IN (
  '200902b1-2072-4ea8-953c-6da27aaccd70',
  '54a7c8ac-dd58-458f-88a9-9e411ac63a0c'
);

DELETE FROM workspace_projects
WHERE workspace_id IN (
  '200902b1-2072-4ea8-953c-6da27aaccd70',
  '54a7c8ac-dd58-458f-88a9-9e411ac63a0c'
);

DELETE FROM workspaces
WHERE id IN (
  '200902b1-2072-4ea8-953c-6da27aaccd70',
  '54a7c8ac-dd58-458f-88a9-9e411ac63a0c'
);

-- ================================================================
-- 3. ASIGNAR WORKSPACES A LICENCIA 1 (Rxcode)
-- ================================================================

UPDATE workspaces
SET license_id = (
  SELECT id FROM licenses WHERE owner_id = 'a4724453-124c-45a3-a8c5-db01560300cc'
)
WHERE id IN (
  'f9d6edaf-e399-4d68-8fc9-ba40ec783d18', -- RecTrack
  '4e703992-df0b-40fc-ac26-20bbce34c66e', -- Rxcode
  '40d6dea4-137d-47ef-aeed-338ab980e743', -- Pruebas
  'da20ed94-878d-4669-8d2b-7f2f352adbb5', -- chota
  '75f07898-e53b-43d3-9c8e-6a3e6e1d5c6d', -- Set
  'b4149039-7e23-4286-85fb-543d2a636b65'  -- Developer (más antiguo, conservado)
);

-- ================================================================
-- 4. PROYECTOS FLOTANTES: REC y RXL → workspace Rxcode
-- ================================================================

INSERT INTO workspace_projects (workspace_id, project_id, added_at)
VALUES
  ('4e703992-df0b-40fc-ac26-20bbce34c66e', '13c4e56a-fc1e-4f80-9a19-ba68f3f5379d', now()), -- REC
  ('4e703992-df0b-40fc-ac26-20bbce34c66e', '8293a962-1901-46bb-9ab6-bb151126376b', now())  -- RXL
ON CONFLICT DO NOTHING;

-- ================================================================
-- 5. MIEMBROS LICENCIA 1 (todos en la imagen excepto Ricardo)
-- ================================================================

INSERT INTO license_members (license_id, user_id, role, joined_at)
SELECT
  (SELECT id FROM licenses WHERE owner_id = 'a4724453-124c-45a3-a8c5-db01560300cc'),
  id,
  CASE WHEN id = 'a4724453-124c-45a3-a8c5-db01560300cc' THEN 'owner' ELSE 'member' END,
  now()
FROM users
WHERE id IN (
  'a4724453-124c-45a3-a8c5-db01560300cc', -- Daniel Galicia rxcode@gmail.com  (owner)
  'a33369e7-d635-4d23-9df5-03754d46afb6', -- Abigail
  '30699250-77d8-410d-9316-25ad6814a3b9', -- Daniel Galicia daniel.galicia.me
  'd1c8ddee-6139-4c30-b53d-722a9d137bba', -- Daniel Galicia developer@sass.com.mx
  'a87077af-4d41-4ea3-a738-73ee9b84b9d3', -- Isaac Levi
  '880fce53-5d27-4c4d-9d1e-e8c1a74d6887', -- Michelle Ramirez
  '9cc69f1b-31d7-4c7b-b913-0070158ed2e3', -- TES
  'd9e0a494-bc42-41ed-984d-967a44bf634e'  -- fER
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- 6. MIEMBRO LICENCIA 2 (solo Ricardo como owner)
-- ================================================================

INSERT INTO license_members (license_id, user_id, role, joined_at)
VALUES (
  (SELECT id FROM licenses WHERE owner_id = '60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3'),
  '60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3',
  'owner',
  now()
);

-- ================================================================
-- 7. ACTUALIZAR user_type A 'owner' PARA DANIEL Y RICARDO
-- ================================================================

UPDATE users
SET user_type = 'owner'
WHERE id IN (
  'a4724453-124c-45a3-a8c5-db01560300cc',
  '60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3'
);

COMMIT;
