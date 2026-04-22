import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import type { ProjectSummary } from './entities/project.entity';

@Injectable()
export class ProjectsRepository {
  private get pool() {
    return getPool();
  }

  async findAll(): Promise<ProjectSummary[]> {
    const { rows } = await this.pool.query(`
      SELECT
        p.id, p.code, p.name, p.description, p.methodology, p.status,
        p.extra_views,
        p.created_at, p.updated_at,
        COALESCE(ta.total, 0)::int    AS tasks_total,
        COALESCE(ta.done, 0)::int     AS tasks_done,
        CASE WHEN COALESCE(ta.total, 0) = 0 THEN 0
          ELSE ROUND(ta.done * 100.0 / ta.total)::int
        END                           AS progress_pct,
        COALESCE(tm.data, '[]'::json) AS team,
        ac.name                       AS active_cycle
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT COUNT(*)                                          AS total,
               COUNT(*) FILTER (WHERE status = 'completada')   AS done
        FROM tasks WHERE project_id = p.id AND parent_task_id IS NULL
      ) ta ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'initials', u.initials, 'name', u.name
        ) ORDER BY u.name) AS data
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = p.id
      ) tm ON true
      LEFT JOIN LATERAL (
        SELECT name FROM cycles
        WHERE project_id = p.id AND status = 'activo'
        LIMIT 1
      ) ac ON true
      WHERE p.status != 'archivado'
      ORDER BY p.created_at ASC
    `);
    return rows;
  }

  async findByCode(code: string): Promise<ProjectSummary | null> {
    const { rows } = await this.pool.query(`
      SELECT
        p.id, p.code, p.name, p.description, p.methodology, p.status,
        p.extra_views,
        p.created_at, p.updated_at,
        COALESCE(ta.total, 0)::int    AS tasks_total,
        COALESCE(ta.done, 0)::int     AS tasks_done,
        CASE WHEN COALESCE(ta.total, 0) = 0 THEN 0
          ELSE ROUND(ta.done * 100.0 / ta.total)::int
        END                           AS progress_pct,
        COALESCE(tm.data, '[]'::json) AS team,
        ac.name                       AS active_cycle
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT COUNT(*)                                          AS total,
               COUNT(*) FILTER (WHERE status = 'completada')   AS done
        FROM tasks WHERE project_id = p.id AND parent_task_id IS NULL
      ) ta ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'initials', u.initials, 'name', u.name
        ) ORDER BY u.name) AS data
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = p.id
      ) tm ON true
      LEFT JOIN LATERAL (
        SELECT name FROM cycles
        WHERE project_id = p.id AND status = 'activo'
        LIMIT 1
      ) ac ON true
      WHERE UPPER(p.code) = UPPER($1)
    `, [code]);
    return rows[0] ?? null;
  }

  async create(data: {
    name: string;
    code: string;
    description?: string;
    methodology: string;
    createdBy: string;
  }): Promise<ProjectSummary> {
    const pool = this.pool;
    const { rows } = await pool.query(
      `INSERT INTO projects (name, code, description, methodology, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING code`,
      [data.name, data.code, data.description ?? null, data.methodology, data.createdBy],
    );
    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       SELECT id, $2, 'owner' FROM projects WHERE code = $1`,
      [rows[0].code, data.createdBy],
    );
    return (await this.findByCode(rows[0].code))!;
  }

  async updateById(id: string, data: {
    name?: string;
    description?: string | null;
    methodology?: string;
    status?: string;
    extra_views?: string[];
  }): Promise<ProjectSummary | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (data.name        !== undefined) { fields.push(`name = $${i++}`);        values.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${i++}`); values.push(data.description); }
    if (data.methodology !== undefined) { fields.push(`methodology = $${i++}`); values.push(data.methodology); }
    if (data.status      !== undefined) { fields.push(`status = $${i++}`);      values.push(data.status); }
    if (data.extra_views !== undefined) { fields.push(`extra_views = $${i++}`); values.push(JSON.stringify(data.extra_views)); }
    if (fields.length === 0) return null;
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i} RETURNING code`,
      values,
    );
    if (!rows[0]) return null;
    return this.findByCode(rows[0].code);
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM projects WHERE id = $1`, [id]);
  }

  async findEpicsByCode(code: string): Promise<{
    id: string; name: string; description: string | null;
    status: string; parent_epic_id: string | null; parent_epic_name: string | null;
  }[]> {
    const { rows } = await this.pool.query(`
      SELECT e.id, e.name, e.description, e.status,
             e.parent_epic_id,
             pe.name AS parent_epic_name
      FROM epics e
      JOIN projects p ON p.id = e.project_id
      LEFT JOIN epics pe ON pe.id = e.parent_epic_id
      WHERE UPPER(p.code) = UPPER($1)
      ORDER BY e.name
    `, [code]);
    return rows;
  }

  async createEpic(
    code: string,
    dto: { name: string; description?: string; parent_epic_id?: string | null },
    createdBy: string,
  ): Promise<{ id: string; name: string; description: string | null; status: string; parent_epic_id: string | null; parent_epic_name: string | null }> {
    const { rows: [proj] } = await this.pool.query(
      'SELECT id FROM projects WHERE UPPER(code) = UPPER($1)',
      [code],
    );
    if (!proj) throw new Error('Proyecto no encontrado');

    const { rows: [epic] } = await this.pool.query(
      `INSERT INTO epics (project_id, name, description, created_by, parent_epic_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, status, parent_epic_id`,
      [proj.id, dto.name, dto.description || null, createdBy, dto.parent_epic_id ?? null],
    );
    return { ...epic, parent_epic_name: null };
  }

  async updateEpic(
    id: string,
    dto: { name?: string; description?: string | null; status?: string; parent_epic_id?: string | null },
  ): Promise<{ id: string; name: string; description: string | null; status: string; parent_epic_id: string | null; parent_epic_name: string | null } | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (dto.name        !== undefined) { fields.push(`name = $${i++}`);          values.push(dto.name); }
    if (dto.description !== undefined) { fields.push(`description = $${i++}`);   values.push(dto.description); }
    if (dto.status      !== undefined) { fields.push(`status = $${i++}`);        values.push(dto.status); }
    if ('parent_epic_id' in dto)       { fields.push(`parent_epic_id = $${i++}`); values.push(dto.parent_epic_id ?? null); }
    if (fields.length === 0) return null;
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE epics SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, description, status, parent_epic_id`,
      values,
    );
    if (!rows[0]) return null;
    // Resolve parent name
    let parent_epic_name: string | null = null;
    if (rows[0].parent_epic_id) {
      const { rows: [parent] } = await this.pool.query(
        'SELECT name FROM epics WHERE id = $1', [rows[0].parent_epic_id],
      );
      parent_epic_name = parent?.name ?? null;
    }
    return { ...rows[0], parent_epic_name };
  }

  async findMembersByCode(_code: string): Promise<{ id: string; name: string; initials: string }[]> {
    const { rows } = await this.pool.query(`
      SELECT id, name, initials FROM users WHERE is_active = true ORDER BY name
    `);
    return rows;
  }
}
