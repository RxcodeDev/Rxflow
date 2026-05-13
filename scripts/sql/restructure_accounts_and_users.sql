-- Reestructura ownership con reglas de negocio actuales (sin destruir estructura existente).
--
-- Reglas:
-- 1) Si un proyecto/workspace fue creado por Michelle o Daniel, pertenece a la cuenta rxcode.
-- 2) Se respeta el workspace actual de los proyectos existentes.
-- 3) Caso atipico: si soporte creo proyectos (y REC por regla de negocio), esos proyectos pertenecen a soporte
--    y deben vivir en un workspace SOPORTE (se crea si no existe).
-- 4) Recuperacion Wiki: notas con workspace huérfano se reasignan al workspace correcto.

DO $$
DECLARE
  v_rx_owner          uuid;
  v_soporte_owner     uuid;
  v_rx_license        uuid;
  v_soporte_license   uuid;
  v_rx_workspace      uuid;
  v_soporte_workspace uuid;
  v_levi_id           uuid;
  v_pm_id             uuid;
  emails              text[];
BEGIN
  -- Usuarios clave
  SELECT id INTO v_rx_owner
  FROM users
  WHERE lower(email) = 'rxcode@gmail.com' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_soporte_owner
  FROM users
  WHERE lower(email) = 'soporte.ricardo.galicia@rxcode.com' AND is_active = true
  LIMIT 1;

  IF v_rx_owner IS NULL THEN
    RAISE EXCEPTION 'No existe usuario activo rxcode@gmail.com';
  END IF;

  IF v_soporte_owner IS NULL THEN
    RAISE EXCEPTION 'No existe usuario activo soporte.ricardo.galicia@rxcode.com';
  END IF;

  -- Obtener IDs de los miembros
  SELECT id INTO v_levi_id FROM users WHERE lower(email) = 'levi.rxcode@gmail.com' AND is_active = true LIMIT 1;
  SELECT id INTO v_pm_id FROM users WHERE lower(email) = 'rxcode.pm@gmail.com' AND is_active = true LIMIT 1;

  -- Licencias owner
  SELECT id INTO v_rx_license
  FROM licenses
  WHERE owner_id = v_rx_owner
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_rx_license IS NULL THEN
    INSERT INTO licenses (name, owner_id)
    VALUES ('Cuenta - rxcode@gmail.com', v_rx_owner)
    RETURNING id INTO v_rx_license;
  END IF;

  -- Asegurar que el owner y los miembros de RXCODE estén en license_members
  INSERT INTO license_members (license_id, user_id, role)
    VALUES (v_rx_license, v_rx_owner, 'owner')
    ON CONFLICT (license_id, user_id) DO NOTHING;
  IF v_levi_id IS NOT NULL THEN
    INSERT INTO license_members (license_id, user_id, role)
      VALUES (v_rx_license, v_levi_id, 'member')
      ON CONFLICT (license_id, user_id) DO NOTHING;
  END IF;
  IF v_pm_id IS NOT NULL THEN
    INSERT INTO license_members (license_id, user_id, role)
      VALUES (v_rx_license, v_pm_id, 'member')
      ON CONFLICT (license_id, user_id) DO NOTHING;
  END IF;

  SELECT id INTO v_soporte_license
  FROM licenses
  WHERE owner_id = v_soporte_owner
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_soporte_license IS NULL THEN
    INSERT INTO licenses (name, owner_id)
    VALUES ('Cuenta - soporte.ricardo.galicia@rxcode.com', v_soporte_owner)
    RETURNING id INTO v_soporte_license;
  END IF;

  -- Workspace principal de rxcode (reusar existente sin importar mayusculas)
  SELECT id INTO v_rx_workspace
  FROM workspaces
  WHERE lower(name) = 'rxcode'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_rx_workspace IS NULL THEN
    INSERT INTO workspaces (name, description, color, icon, created_by, license_id)
    VALUES (
      'RXCODE',
      'Workspace principal de RXCODE',
      '#6366f1',
      'layers',
      v_rx_owner,
      v_rx_license
    )
    RETURNING id INTO v_rx_workspace;
  END IF;

  -- Workspace SOPORTE (crear si no existe)
  SELECT id INTO v_soporte_workspace
  FROM workspaces
  WHERE lower(name) = 'soporte'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_soporte_workspace IS NULL THEN
    INSERT INTO workspaces (name, description, color, icon, created_by, license_id)
    VALUES (
      'SOPORTE',
      'Workspace de proyectos creados por soporte',
      '#0ea5e9',
      'life-buoy',
      v_soporte_owner,
      v_soporte_license
    )
    RETURNING id INTO v_soporte_workspace;
  ELSE
    UPDATE workspaces
    SET created_by = v_soporte_owner,
        license_id = v_soporte_license
    WHERE id = v_soporte_workspace;
  END IF;

  -- Limpiar todos los miembros del workspace RXCODE
  DELETE FROM workspace_members WHERE workspace_id = v_rx_workspace;

  -- Insertar owner y miembros correctos
  INSERT INTO workspace_members (workspace_id, user_id)
    VALUES (v_rx_workspace, v_rx_owner)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  IF v_levi_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id)
      VALUES (v_rx_workspace, v_levi_id)
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  IF v_pm_id IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id)
      VALUES (v_rx_workspace, v_pm_id)
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  -- Limpiar todos los miembros del workspace SOPORTE y dejar solo el owner
  DELETE FROM workspace_members WHERE workspace_id = v_soporte_workspace;
  INSERT INTO workspace_members (workspace_id, user_id)
    VALUES (v_soporte_workspace, v_soporte_owner)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Eliminar usuarios que no sean los requeridos (solo dejar los de la lista)
  emails := ARRAY[
    'rxcode@gmail.com',
    'levi.rxcode@gmail.com',
    'rxcode.pm@gmail.com',
    'soporte.ricardo.galicia@rxcode.com'
  ];
  UPDATE users SET is_active = false WHERE lower(email) <> ALL(emails);

  -- Regla de ownership: lo creado por Michelle o Daniel => cuenta RXCODE
  UPDATE projects p
  SET created_by = v_rx_owner
  FROM users u
  WHERE p.created_by = u.id
    AND (
      lower(u.name) IN ('michelle ramirez', 'daniel galicia')
      OR lower(u.email) IN ('rxcode.pm@gmail.com', 'rxcode.pm1@gmail.com', 'developer@sass.com.mx', 'rxcode@gmail.com')
    )
    AND p.created_by <> v_rx_owner;

  UPDATE workspaces w
  SET created_by = v_rx_owner,
      license_id = v_rx_license
  FROM users u
  WHERE w.created_by = u.id
    AND w.id <> v_soporte_workspace
    AND (
      lower(u.name) IN ('michelle ramirez', 'daniel galicia')
      OR lower(u.email) IN ('rxcode.pm@gmail.com', 'rxcode.pm1@gmail.com', 'developer@sass.com.mx', 'rxcode@gmail.com')
    )
    AND (w.created_by <> v_rx_owner OR w.license_id <> v_rx_license);

  -- Excepcion de negocio: REC pertenece a soporte.
  UPDATE projects
  SET created_by = v_soporte_owner
  WHERE code = 'REC'
    AND created_by <> v_soporte_owner;

  -- Consolidar workspaces duplicados por nombre (RXCODE/SOPORTE) sin perder relaciones.
  INSERT INTO workspace_projects (workspace_id, project_id)
  SELECT v_rx_workspace, wp.project_id
  FROM workspace_projects wp
  JOIN workspaces w ON w.id = wp.workspace_id
  WHERE lower(w.name) = 'rxcode'
    AND w.id <> v_rx_workspace
  ON CONFLICT (workspace_id, project_id) DO NOTHING;

  DELETE FROM workspace_projects wp
  USING workspaces w
  WHERE wp.workspace_id = w.id
    AND lower(w.name) = 'rxcode'
    AND w.id <> v_rx_workspace;

  INSERT INTO workspace_members (workspace_id, user_id)
  SELECT v_rx_workspace, wm.user_id
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  WHERE lower(w.name) = 'rxcode'
    AND w.id <> v_rx_workspace
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  DELETE FROM workspace_members wm
  USING workspaces w
  WHERE wm.workspace_id = w.id
    AND lower(w.name) = 'rxcode'
    AND w.id <> v_rx_workspace;

  UPDATE wiki_pages wk
  SET workspace_id = v_rx_workspace
  WHERE wk.workspace_id IN (
    SELECT id
    FROM workspaces
    WHERE lower(name) = 'rxcode'
      AND id <> v_rx_workspace
  )
    AND NOT EXISTS (
      SELECT 1
      FROM wiki_pages x
      WHERE x.workspace_id = v_rx_workspace
        AND x.slug = wk.slug
    );

  INSERT INTO workspace_projects (workspace_id, project_id)
  SELECT v_soporte_workspace, wp.project_id
  FROM workspace_projects wp
  JOIN workspaces w ON w.id = wp.workspace_id
  WHERE lower(w.name) = 'soporte'
    AND w.id <> v_soporte_workspace
  ON CONFLICT (workspace_id, project_id) DO NOTHING;

  DELETE FROM workspace_projects wp
  USING workspaces w
  WHERE wp.workspace_id = w.id
    AND lower(w.name) = 'soporte'
    AND w.id <> v_soporte_workspace;

  INSERT INTO workspace_members (workspace_id, user_id)
  SELECT v_soporte_workspace, wm.user_id
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  WHERE lower(w.name) = 'soporte'
    AND w.id <> v_soporte_workspace
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  DELETE FROM workspace_members wm
  USING workspaces w
  WHERE wm.workspace_id = w.id
    AND lower(w.name) = 'soporte'
    AND w.id <> v_soporte_workspace;

  UPDATE wiki_pages wk
  SET workspace_id = v_soporte_workspace
  WHERE wk.workspace_id IN (
    SELECT id
    FROM workspaces
    WHERE lower(name) = 'soporte'
      AND id <> v_soporte_workspace
  )
    AND NOT EXISTS (
      SELECT 1
      FROM wiki_pages x
      WHERE x.workspace_id = v_soporte_workspace
        AND x.slug = wk.slug
    );

  -- Si existen duplicados vacios tras consolidacion, limpiarlos de forma segura.
  DELETE FROM workspaces w
  WHERE lower(name) IN ('rxcode', 'soporte')
    AND w.id NOT IN (v_rx_workspace, v_soporte_workspace)
    AND NOT EXISTS (
      SELECT 1 FROM workspace_projects wp WHERE wp.workspace_id = w.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM wiki_pages wk WHERE wk.workspace_id = w.id
    );

  -- Caso atipico soporte:
  -- si soporte creo proyectos, se garantizan en workspace SOPORTE.
  INSERT INTO workspace_projects (workspace_id, project_id)
  SELECT v_soporte_workspace, p.id
  FROM projects p
  WHERE p.created_by = v_soporte_owner
  ON CONFLICT (workspace_id, project_id) DO NOTHING;

  -- Remover proyectos de soporte de otros workspaces para que pertenezcan a SOPORTE.
  DELETE FROM workspace_projects wp
  USING projects p
  WHERE wp.project_id = p.id
    AND p.created_by = v_soporte_owner
    AND wp.workspace_id <> v_soporte_workspace;

  -- Si hay proyectos no-soporte sin workspace, se asignan al workspace principal de RXCODE.
  INSERT INTO workspace_projects (workspace_id, project_id)
  SELECT v_rx_workspace, p.id
  FROM projects p
  LEFT JOIN workspace_projects wp ON wp.project_id = p.id
  WHERE p.created_by <> v_soporte_owner
    AND wp.project_id IS NULL
  ON CONFLICT (workspace_id, project_id) DO NOTHING;

  -- Membresia minima de SOPORTE: owner soporte
  INSERT INTO workspace_members (workspace_id, user_id)
  VALUES (v_soporte_workspace, v_soporte_owner)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Recuperacion de notas wiki huérfanas:
  -- 1) Si el workspace actual no existe y tiene project_code, usar workspace del proyecto.
  WITH orphan_wiki AS (
    SELECT wp.id, wp.project_code
    FROM wiki_pages wp
    LEFT JOIN workspaces w ON w.id = wp.workspace_id
    WHERE w.id IS NULL
  ), target_ws AS (
    SELECT ow.id AS wiki_id, wp2.workspace_id
    FROM orphan_wiki ow
    JOIN projects p ON p.code = ow.project_code
    JOIN workspace_projects wp2 ON wp2.project_id = p.id
  )
  UPDATE wiki_pages wp
  SET workspace_id = tw.workspace_id
  FROM target_ws tw
  WHERE wp.id = tw.wiki_id;

  -- 2) Si sigue huérfana y es de soporte -> SOPORTE
  UPDATE wiki_pages wp
  SET workspace_id = v_soporte_workspace
  WHERE wp.created_by = v_soporte_owner
    AND NOT EXISTS (
      SELECT 1 FROM workspaces w WHERE w.id = wp.workspace_id
    );

  -- 3) Si sigue huérfana -> RXCODE por defecto
  UPDATE wiki_pages wp
  SET workspace_id = v_rx_workspace
  WHERE NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = wp.workspace_id
  );

END $$;

-- Verificaciones sugeridas:
-- 1) SELECT p.code, u.email AS created_by, w.name AS workspace
--    FROM projects p
--    LEFT JOIN users u ON u.id = p.created_by
--    LEFT JOIN workspace_projects wp ON wp.project_id = p.id
--    LEFT JOIN workspaces w ON w.id = wp.workspace_id
--    ORDER BY p.code;
--
-- 2) SELECT w.name, count(*)
--    FROM wiki_pages wp
--    JOIN workspaces w ON w.id = wp.workspace_id
--    GROUP BY w.name
--    ORDER BY w.name;
