import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import type { WorkspaceSummary } from './entities/workspace.entity';

const PROJECT_SUMMARY_FIELDS = `
  p.id, p.code, p.name, p.description, p.methodology, p.status,
  p.extra_views, p.created_at, p.updated_at,
  COALESCE(ta.total, 0)::int    AS tasks_total,
  COALESCE(ta.done, 0)::int     AS tasks_done,
  CASE WHEN COALESCE(ta.total, 0) = 0 THEN 0
    ELSE ROUND(ta.done * 100.0 / ta.total)::int
  END                           AS progress_pct,
  COALESCE(tm.data, '[]'::json) AS team,
  ac.name                       AS active_cycle
`;

const PROJECT_LATERAL_JOINS = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*)                                        AS total,
           COUNT(*) FILTER (WHERE status = 'completada')  AS done
    FROM tasks WHERE project_id = p.id AND parent_task_id IS NULL
  ) ta ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('initials', u.initials, 'name', u.name) ORDER BY u.name) AS data
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = p.id
  ) tm ON true
  LEFT JOIN LATERAL (
    SELECT name FROM cycles
    WHERE project_id = p.id AND status = 'activo'
    LIMIT 1
  ) ac ON true
`;

@Injectable()
export class WorkspacesRepository {
  private get pool() {
    return getPool();
  }

  async findAll(): Promise<WorkspaceSummary[]> {
    // 1. Load all workspaces
    const { rows: wRows } = await this.pool.query(`
      SELECT
        w.id, w.name, w.description, w.color, w.icon, w.created_by,
        w.created_at, w.updated_at,
        COALESCE(mem.data, '[]'::json) AS members
      FROM workspaces w
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'initials', u.initials) ORDER BY u.name) AS data
        FROM workspace_members wm
        JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = w.id
      ) mem ON true
      ORDER BY w.created_at ASC
    `);

    if (wRows.length === 0) return [];

    const workspaceIds = wRows.map((w) => w.id);

    // 2. Load all projects associated with these workspaces
    const { rows: pRows } = await this.pool.query(`
      SELECT wp.workspace_id, ${PROJECT_SUMMARY_FIELDS}
      FROM workspace_projects wp
      JOIN projects p ON p.id = wp.project_id
      ${PROJECT_LATERAL_JOINS}
      WHERE wp.workspace_id = ANY($1::uuid[])
      ORDER BY wp.added_at ASC
    `, [workspaceIds]);

    // 3. Group projects by workspace
    const projectsByWorkspace: Record<string, typeof pRows> = {};
    for (const p of pRows) {
      const wsId = p.workspace_id as string;
      if (!projectsByWorkspace[wsId]) projectsByWorkspace[wsId] = [];
      projectsByWorkspace[wsId].push(p);
    }

    return wRows.map((w) => ({
      ...w,
      projects: (projectsByWorkspace[w.id] ?? []).map(({ workspace_id: _wsId, ...p }) => p),
    })) as WorkspaceSummary[];
  }

  async findById(id: string): Promise<WorkspaceSummary | null> {
    const { rows } = await this.pool.query(`
      SELECT
        w.id, w.name, w.description, w.color, w.icon, w.created_by,
        w.created_at, w.updated_at,
        COALESCE(mem.data, '[]'::json) AS members
      FROM workspaces w
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'initials', u.initials) ORDER BY u.name) AS data
        FROM workspace_members wm
        JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = w.id
      ) mem ON true
      WHERE w.id = $1
    `, [id]);

    if (!rows[0]) return null;
    const w = rows[0];

    const { rows: pRows } = await this.pool.query(`
      SELECT ${PROJECT_SUMMARY_FIELDS}
      FROM workspace_projects wp
      JOIN projects p ON p.id = wp.project_id
      ${PROJECT_LATERAL_JOINS}
      WHERE wp.workspace_id = $1
      ORDER BY wp.added_at ASC
    `, [id]);

    return { ...w, projects: pRows } as WorkspaceSummary;
  }

  async create(dto: {
    name: string;
    description?: string;
    color: string;
    icon: string;
    createdBy: string;
  }): Promise<{ id: string }> {
    const { rows } = await this.pool.query(`
      INSERT INTO workspaces (name, description, color, icon, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [dto.name, dto.description ?? null, dto.color, dto.icon, dto.createdBy]);
    return rows[0];
  }

  async updateById(id: string, dto: {
    name?: string;
    description?: string | null;
    color?: string;
    icon?: string;
  }): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (dto.name       !== undefined) { sets.push(`name = $${i++}`);        params.push(dto.name); }
    if ('description' in dto)         { sets.push(`description = $${i++}`); params.push(dto.description ?? null); }
    if (dto.color      !== undefined) { sets.push(`color = $${i++}`);       params.push(dto.color); }
    if (dto.icon       !== undefined) { sets.push(`icon = $${i++}`);        params.push(dto.icon); }
    if (sets.length === 0) return;
    params.push(id);
    await this.pool.query(
      `UPDATE workspaces SET ${sets.join(', ')} WHERE id = $${i}`,
      params,
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM workspaces WHERE id = $1`, [id]);
  }

  /* ── Projects ── */
  async addProject(workspaceId: string, projectId: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO workspace_projects (workspace_id, project_id)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
    `, [workspaceId, projectId]);
  }

  async removeProject(workspaceId: string, projectId: string): Promise<void> {
    await this.pool.query(`
      DELETE FROM workspace_projects WHERE workspace_id = $1 AND project_id = $2
    `, [workspaceId, projectId]);
  }

  /* ── Members ── */
  async addMember(workspaceId: string, userId: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO workspace_members (workspace_id, user_id)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
    `, [workspaceId, userId]);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.pool.query(`
      DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2
    `, [workspaceId, userId]);
  }

  /** All projects not yet assigned to any workspace */
  async findUnassignedProjects() {
    const { rows } = await this.pool.query(`
      SELECT ${PROJECT_SUMMARY_FIELDS}
      FROM projects p
      ${PROJECT_LATERAL_JOINS}
      WHERE p.id NOT IN (SELECT project_id FROM workspace_projects)
      ORDER BY p.created_at ASC
    `);
    return rows;
  }
}
