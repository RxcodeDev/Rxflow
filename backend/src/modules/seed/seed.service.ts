import { Injectable, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { getPool } from '../../config/database.config';

@Injectable()
export class SeedService {
  private get pool() {
    return getPool();
  }

  async seed() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Seed no disponible en producción');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      /* ── 1. Demo Users ────────────────────────────────────────── */
      const password = await bcrypt.hash('password123', 10);

      const userRows = await client.query(`
        INSERT INTO users (name, email, password_hash, initials, role, presence_status)
        VALUES
          ('Ana Núñez',   'ana@rxflow.io',  $1, 'AN', 'admin',  'online'),
          ('Luis Mora',   'luis@rxflow.io', $1, 'LM', 'member', 'online'),
          ('Sara Castro', 'sara@rxflow.io', $1, 'SC', 'member', 'away'),
          ('Juan Ríos',   'juan@rxflow.io', $1, 'JR', 'member', 'offline')
        ON CONFLICT (email) DO UPDATE
          SET name = EXCLUDED.name, initials = EXCLUDED.initials
        RETURNING id, initials
      `, [password]);

      const uMap: Record<string, string> = {};
      for (const r of userRows.rows) uMap[r.initials] = r.id;

      /* ── 2. Projects ──────────────────────────────────────────── */
      const projRows = await client.query(`
        INSERT INTO projects (code, name, description, methodology, status, created_by)
        VALUES
          ('ENG', 'Backend API',  'API REST con NestJS y PostgreSQL', 'scrum',    'activo', $1),
          ('DES', 'Frontend',     'Next.js 16 + Design System',       'scrum',    'activo', $1),
          ('MKT', 'Marketing',    'Campañas Q2 y contenido',          'kanban',   'activo', $1)
        ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name
        RETURNING id, code
      `, [uMap['AN']]);

      const pMap: Record<string, string> = {};
      for (const r of projRows.rows) pMap[r.code] = r.id;

      /* ── 3. Project members ───────────────────────────────────── */
      await client.query(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES
          ($1, $3, 'owner'), ($1, $4, 'member'), ($1, $5, 'member'),
          ($2, $3, 'owner'), ($2, $5, 'member'), ($2, $6, 'member')
        ON CONFLICT (project_id, user_id) DO NOTHING
      `, [pMap['ENG'], pMap['DES'], uMap['AN'], uMap['LM'], uMap['SC'], uMap['JR']]);

      /* ── 4. Epics ─────────────────────────────────────────────── */
      const epicRows = await client.query(`
        INSERT INTO epics (project_id, name, status, hill_position, created_by)
        VALUES
          ($1, 'Auth & Onboarding',    'activa', 35, $4),
          ($1, 'Core API',             'activa', 55, $4),
          ($1, 'DevOps & CI/CD',       'activa', 20, $4),
          ($2, 'Design System',        'activa', 48, $4),
          ($2, 'Componentes Core',     'activa', 62, $4),
          ($3, 'Campaña Q2',           'activa', 25, $4)
        ON CONFLICT DO NOTHING
        RETURNING id, name
      `, [pMap['ENG'], pMap['DES'], pMap['MKT'], uMap['AN']]);

      const eMap: Record<string, string> = {};
      for (const r of epicRows.rows) eMap[r.name] = r.id;

      /* ── 5. Cycles ────────────────────────────────────────────── */
      const cycleRows = await client.query(`
        INSERT INTO cycles (project_id, name, number, status, start_date, end_date, scope_pct)
        VALUES
          ($1, 'Cycle 3', 3, 'completado', NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '2 weeks', 100),
          ($1, 'Cycle 4', 4, 'activo',     NOW() - INTERVAL '1 week',  NOW() + INTERVAL '1 week',   67),
          ($1, 'Cycle 5', 5, 'planificado', NOW() + INTERVAL '2 weeks', NOW() + INTERVAL '4 weeks',   0),
          ($2, 'Cycle 3', 3, 'completado', NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '2 weeks', 100),
          ($2, 'Cycle 4', 4, 'activo',     NOW() - INTERVAL '1 week',  NOW() + INTERVAL '1 week',   48)
        ON CONFLICT DO NOTHING
        RETURNING id, project_id, number
      `, [pMap['ENG'], pMap['DES']]);

      /* Active cycle for ENG */
      const engCycle4 = cycleRows.rows.find(r => r.project_id === pMap['ENG'] && r.number === 4);
      const desCycle4 = cycleRows.rows.find(r => r.project_id === pMap['DES'] && r.number === 4);

      /* ── 6. Tasks ENG ─────────────────────────────────────────── */
      const taskData: Array<{
        projectId: string; epicName: string | null; cycleId: string | null;
        assigneeId: string; title: string; status: string; priority: string; position: number;
        dueDate: string | null;
      }> = [
        { projectId: pMap['ENG'], epicName: 'Auth & Onboarding', cycleId: engCycle4?.id ?? null, assigneeId: uMap['AN'],  title: 'Revisar PR de autenticación',    status: 'en_progreso',  priority: 'urgente', position: 1, dueDate: 'today' },
        { projectId: pMap['ENG'], epicName: 'Auth & Onboarding', cycleId: engCycle4?.id ?? null, assigneeId: uMap['LM'],  title: 'Definir contrato de endpoints',   status: 'en_progreso',  priority: 'media',   position: 2, dueDate: null },
        { projectId: pMap['ENG'], epicName: 'Auth & Onboarding', cycleId: engCycle4?.id ?? null, assigneeId: uMap['AN'],  title: 'Auth middleware',                 status: 'en_revision',  priority: 'alta',    position: 1, dueDate: null },
        { projectId: pMap['ENG'], epicName: 'Auth & Onboarding', cycleId: engCycle4?.id ?? null, assigneeId: uMap['LM'],  title: 'Login endpoint',                  status: 'completada',   priority: 'alta',    position: 1, dueDate: null },
        { projectId: pMap['ENG'], epicName: 'Auth & Onboarding', cycleId: engCycle4?.id ?? null, assigneeId: uMap['AN'],  title: 'Register endpoint',               status: 'completada',   priority: 'alta',    position: 2, dueDate: null },
        { projectId: pMap['ENG'], epicName: 'DevOps & CI/CD',   cycleId: null,                  assigneeId: uMap['LM'],  title: 'Setup CI/CD',                     status: 'backlog',      priority: 'media',   position: 1, dueDate: null },
        { projectId: pMap['ENG'], epicName: 'Core API',         cycleId: null,                  assigneeId: uMap['AN'],  title: 'Setup base de datos',             status: 'completada',   priority: 'alta',    position: 1, dueDate: null },
        { projectId: pMap['ENG'], epicName: 'Core API',         cycleId: null,                  assigneeId: uMap['LM'],  title: 'Modelos de datos',               status: 'completada',   priority: 'alta',    position: 2, dueDate: null },
        { projectId: pMap['DES'], epicName: 'Design System',    cycleId: desCycle4?.id ?? null, assigneeId: uMap['SC'],  title: 'Componente TaskCard estados',     status: 'en_progreso',  priority: 'alta',    position: 1, dueDate: null },
        { projectId: pMap['DES'], epicName: 'Design System',    cycleId: null,                  assigneeId: uMap['SC'],  title: 'Button variants',                 status: 'en_revision',  priority: 'media',   position: 1, dueDate: null },
        { projectId: pMap['DES'], epicName: 'Componentes Core', cycleId: desCycle4?.id ?? null, assigneeId: uMap['SC'],  title: 'Input component',                 status: 'completada',   priority: 'alta',    position: 1, dueDate: null },
        { projectId: pMap['DES'], epicName: 'Design System',    cycleId: null,                  assigneeId: uMap['JR'],  title: 'Tokens tipografía',               status: 'backlog',      priority: 'baja',    position: 1, dueDate: null },
        { projectId: pMap['MKT'], epicName: 'Campaña Q2',       cycleId: null,                  assigneeId: uMap['JR'],  title: 'Brief Q2',                        status: 'backlog',      priority: 'media',   position: 1, dueDate: null },
        { projectId: pMap['MKT'], epicName: 'Campaña Q2',       cycleId: null,                  assigneeId: uMap['JR'],  title: 'Revisar copy del onboarding',     status: 'en_progreso',  priority: 'baja',    position: 1, dueDate: 'overdue' },
      ];

      for (const t of taskData) {
        const epicId = t.epicName ? eMap[t.epicName] ?? null : null;
        const dueDate = t.dueDate === 'today'
          ? 'CURRENT_DATE'
          : t.dueDate === 'overdue'
          ? "CURRENT_DATE - INTERVAL '1 day'"
          : 'NULL';

        await client.query(`
          INSERT INTO tasks (project_id, epic_id, cycle_id, assignee_id,
            title, status, priority, position, due_date, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${dueDate}, $4)
          ON CONFLICT DO NOTHING
        `, [t.projectId, epicId, t.cycleId, t.assigneeId, t.title, t.status, t.priority, t.position]);
      }

      /* ── 7. Notifications ─────────────────────────────────────── */
      // Find the registered rxcode user if it exists
      const { rows: rxcodeRows } = await client.query(
        `SELECT id FROM users WHERE email = 'rxcode.dev@gmail.com' LIMIT 1`
      );
      const rxcodeId = rxcodeRows[0]?.id ?? uMap['AN'];

      await client.query(`
        INSERT INTO notifications (recipient_id, sender_id, type, message)
        VALUES
          ($1, $2, 'mention',    'Ana te mencionó en ENG-12'),
          ($1, $3, 'asignado',   'Luis te asignó ENG-18'),
          ($1, $4, 'comentario', 'Sara comentó en DES-04'),
          ($1, $5, 'comentario', 'Juan comentó en ENG-22')
        ON CONFLICT DO NOTHING
      `, [rxcodeId, uMap['AN'], uMap['LM'], uMap['SC'], uMap['JR']]);

      /* ── 9. Workspaces ─────────────────────────────────────────── */
      const wsRows = await client.query(`
        INSERT INTO workspaces (name, description, color, icon, created_by)
        VALUES
          ('Producto & Desarrollo', 'Proyectos técnicos del equipo de producto', '#6366f1', 'code',   $1),
          ('Marketing',            'Campañas, contenido y growth',              '#0ea5e9', 'target',  $1)
        ON CONFLICT DO NOTHING
        RETURNING id, name
      `, [uMap['AN']]);

      if (wsRows.rows.length > 0) {
        const wsMap: Record<string, string> = {};
        for (const r of wsRows.rows) wsMap[r.name] = r.id;

        const wsProd = wsMap['Producto & Desarrollo'];
        const wsMkt  = wsMap['Marketing'];

        if (wsProd && pMap['ENG'] && pMap['DES']) {
          await client.query(`
            INSERT INTO workspace_projects (workspace_id, project_id)
            VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING
          `, [wsProd, pMap['ENG'], pMap['DES']]);

          await client.query(`
            INSERT INTO workspace_members (workspace_id, user_id)
            VALUES ($1, $2), ($1, $3), ($1, $4) ON CONFLICT DO NOTHING
          `, [wsProd, uMap['AN'], uMap['LM'], uMap['SC']]);
        }

        if (wsMkt && pMap['MKT']) {
          await client.query(`
            INSERT INTO workspace_projects (workspace_id, project_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [wsMkt, pMap['MKT']]);

          await client.query(`
            INSERT INTO workspace_members (workspace_id, user_id)
            VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING
          `, [wsMkt, uMap['AN'], uMap['JR']]);
        }
      }

      await client.query('COMMIT');
      return { seeded: true, projects: Object.keys(pMap), users: Object.keys(uMap) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async status() {
    const { rows } = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)    AS users,
        (SELECT COUNT(*) FROM projects) AS projects,
        (SELECT COUNT(*) FROM tasks)    AS tasks,
        (SELECT COUNT(*) FROM cycles)   AS cycles
    `);
    return rows[0];
  }
}
