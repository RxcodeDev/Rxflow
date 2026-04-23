import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import type { CycleSummary } from './entities/cycle.entity';
import type { CreateCycleDto } from './dto/create-cycle.dto';
import type { UpdateCycleDto } from './dto/update-cycle.dto';

@Injectable()
export class CyclesRepository {
  private get pool() {
    return getPool();
  }

  async findAll(): Promise<CycleSummary[]> {
    const { rows } = await this.pool.query(`
      SELECT
        c.id, c.name, c.number, c.status,
        c.start_date, c.end_date, c.scope_pct,
        c.created_at, c.updated_at,
        p.code AS project_code,
        p.name AS project_name,
        COALESCE(ta.total, 0)::int   AS tasks_total,
        COALESCE(ta.done,  0)::int   AS tasks_done,
        CASE
          WHEN c.status != 'activo' THEN NULL
          WHEN c.end_date IS NULL    THEN NULL
          ELSE GREATEST(0, (c.end_date::date - CURRENT_DATE)::int)
        END AS days_left
      FROM cycles c
      JOIN projects p ON p.id = c.project_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)                                          AS total,
               COUNT(*) FILTER (WHERE status = 'completada')   AS done
        FROM tasks
        WHERE cycle_id = c.id AND parent_task_id IS NULL
      ) ta ON true
      ORDER BY p.code, c.number DESC
    `);
    return rows;
  }

  async findById(id: string): Promise<CycleSummary | null> {
    const { rows } = await this.pool.query(`
      SELECT
        c.id, c.name, c.number, c.status,
        c.start_date, c.end_date, c.scope_pct,
        c.created_at, c.updated_at,
        p.code AS project_code,
        p.name AS project_name,
        COALESCE(ta.total, 0)::int   AS tasks_total,
        COALESCE(ta.done,  0)::int   AS tasks_done,
        CASE
          WHEN c.status != 'activo' THEN NULL
          WHEN c.end_date IS NULL    THEN NULL
          ELSE GREATEST(0, (c.end_date::date - CURRENT_DATE)::int)
        END AS days_left
      FROM cycles c
      JOIN projects p ON p.id = c.project_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)                                          AS total,
               COUNT(*) FILTER (WHERE status = 'completada')   AS done
        FROM tasks
        WHERE cycle_id = c.id AND parent_task_id IS NULL
      ) ta ON true
      WHERE c.id = $1
    `, [id]);
    return rows[0] ?? null;
  }

  async create(dto: CreateCycleDto): Promise<CycleSummary> {
    const { rows: [project] } = await this.pool.query(
      'SELECT id FROM projects WHERE code = $1',
      [dto.project_code],
    );
    if (!project) throw new Error('Proyecto no encontrado');

    const { rows: [{ max_num }] } = await this.pool.query(
      'SELECT COALESCE(MAX(number), 0) AS max_num FROM cycles WHERE project_id = $1',
      [project.id],
    );
    const number = (max_num as number) + 1;

    const startDate = dto.start_date || null;
    const endDate = dto.end_date || null;
    const status = dto.status ?? 'planificado';

    const { rows: [cycle] } = await this.pool.query(
      `INSERT INTO cycles (id, project_id, name, number, status, start_date, end_date, scope_pct)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 100)
       RETURNING id`,
      [project.id, dto.name, number, status, startDate, endDate],
    );
    return (await this.findById(cycle.id as string))!;
  }

  async addTask(cycleId: string, taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE tasks SET cycle_id = $1, updated_at = NOW() WHERE id = $2`,
      [cycleId, taskId],
    );
  }

  async removeTask(cycleId: string, taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE tasks SET cycle_id = NULL, updated_at = NOW()
       WHERE id = $2 AND cycle_id = $1`,
      [cycleId, taskId],
    );
  }

  async addEpicTasks(cycleId: string, epicId: string): Promise<void> {
    await this.pool.query(
      `UPDATE tasks SET cycle_id = $1, updated_at = NOW()
       WHERE epic_id = $2 AND parent_task_id IS NULL`,
      [cycleId, epicId],
    );
  }

  async update(id: string, dto: UpdateCycleDto): Promise<CycleSummary | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined)       { sets.push(`name = $${idx++}`);       values.push(dto.name); }
    if (dto.status !== undefined)     { sets.push(`status = $${idx++}`);     values.push(dto.status); }
    if (dto.start_date !== undefined) { sets.push(`start_date = $${idx++}`); values.push(dto.start_date); }
    if (dto.end_date !== undefined)   { sets.push(`end_date = $${idx++}`);   values.push(dto.end_date); }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);

    await this.pool.query(
      `UPDATE cycles SET ${sets.join(', ')} WHERE id = $${idx}`,
      values,
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    // Detach tasks from cycle first
    await this.pool.query(
      `UPDATE tasks SET cycle_id = NULL WHERE cycle_id = $1`,
      [id],
    );
    await this.pool.query(`DELETE FROM cycles WHERE id = $1`, [id]);
  }
}
