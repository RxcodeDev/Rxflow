import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import type { TaskItem } from './entities/task.entity';
import { NotificationsRepository } from '../notifications/notifications.repository';

@Injectable()
export class TasksRepository {
  constructor(private readonly notificationsRepo: NotificationsRepository) {}

  private get pool() {
    return getPool();
  }

  async findByAssignee(userId: string): Promise<TaskItem[]> {
    const { rows } = await this.pool.query(`
      SELECT
        t.id, t.sequential_id,
        CONCAT(p.code, '-', t.sequential_id) AS identifier,
        p.name   AS project_name,
        p.code   AS project_code,
        t.title, t.priority, t.status,
        t.epic_id, e.name   AS epic_name,
        t.assignee_id, u.initials AS assignee_initials,
        t.due_date
      FROM tasks t
      JOIN  projects p ON p.id = t.project_id
      LEFT JOIN epics e ON e.id = t.epic_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.assignee_id = $1
        AND t.parent_task_id IS NULL
      ORDER BY
        CASE t.priority
          WHEN 'urgente' THEN 1
          WHEN 'alta'    THEN 2
          WHEN 'media'   THEN 3
          ELSE 4
        END,
        t.created_at DESC
    `, [userId]);
    return rows;
  }

  async findByProject(projectCode: string): Promise<TaskItem[]> {
    const { rows } = await this.pool.query(`
      SELECT
        t.id, t.sequential_id,
        CONCAT(p.code, '-', t.sequential_id) AS identifier,
        p.name   AS project_name,
        p.code   AS project_code,
        t.title, t.priority, t.status,
        t.epic_id, e.name   AS epic_name,
        t.assignee_id, u.initials AS assignee_initials,
        t.due_date
      FROM tasks t
      JOIN  projects p ON p.id = t.project_id
      LEFT JOIN epics e ON e.id = t.epic_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE UPPER(p.code) = UPPER($1)
        AND t.parent_task_id IS NULL
      ORDER BY t.status, t.position, t.sequential_id
    `, [projectCode]);
    return rows;
  }

  async findAllWithFilters(filters: {
    projectCode?: string;
    status?: string;
    cycleId?: string;
  }): Promise<TaskItem[]> {
    const conditions: string[] = ['t.parent_task_id IS NULL'];
    const params: string[] = [];
    let idx = 1;

    if (filters.projectCode) {
      conditions.push(`UPPER(p.code) = UPPER($${idx++})`);
      params.push(filters.projectCode);
    }
    if (filters.status) {
      conditions.push(`t.status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.cycleId) {
      conditions.push(`t.cycle_id = $${idx++}`);
      params.push(filters.cycleId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await this.pool.query(`
      SELECT
        t.id, t.sequential_id,
        CONCAT(p.code, '-', t.sequential_id) AS identifier,
        p.name     AS project_name,
        p.code     AS project_code,
        t.title, t.priority, t.status,
        t.epic_id, e.name     AS epic_name,
        t.assignee_id, u.initials AS assignee_initials,
        t.due_date
      FROM tasks t
      JOIN  projects p ON p.id = t.project_id
      LEFT JOIN epics e ON e.id = t.epic_id
      LEFT JOIN users u ON u.id = t.assignee_id
      ${where}
      ORDER BY
        CASE t.priority
          WHEN 'urgente' THEN 1
          WHEN 'alta'    THEN 2
          WHEN 'media'   THEN 3
          ELSE 4
        END,
        t.sequential_id
    `, params);
    return rows;
  }

  async findRecentByTeam(limit = 20): Promise<TaskItem[]> {
    const { rows } = await this.pool.query(`
      SELECT
        t.id, t.sequential_id,
        CONCAT(p.code, '-', t.sequential_id) AS identifier,
        p.name     AS project_name,
        p.code     AS project_code,
        t.title, t.priority, t.status,
        t.epic_id, e.name     AS epic_name,
        t.assignee_id, u.initials AS assignee_initials,
        t.due_date
      FROM tasks t
      JOIN  projects p ON p.id = t.project_id
      LEFT JOIN epics e ON e.id = t.epic_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.parent_task_id IS NULL
      ORDER BY t.updated_at DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  async create(dto: {
    projectCode: string;
    title: string;
    priority: string;
    status: string;
    assigneeId?: string | null;
    epicId?: string | null;
    cycleId?: string | null;
    parentTaskId?: string | null;
    dueDate?: string | null;
    createdBy: string;
  }): Promise<TaskItem> {
    const { rows: [proj] } = await this.pool.query(
      'SELECT id FROM projects WHERE UPPER(code) = UPPER($1)',
      [dto.projectCode],
    );
    if (!proj) throw new Error('Proyecto no encontrado');

    const { rows: [task] } = await this.pool.query(
      `INSERT INTO tasks (project_id, title, priority, status, assignee_id, epic_id, cycle_id, parent_task_id, due_date, created_by, sequential_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         COALESCE((SELECT MAX(sequential_id) FROM tasks WHERE project_id = $1), 0) + 1
       )
       RETURNING id`,
      [
        proj.id, dto.title, dto.priority.toLowerCase(), dto.status,
        dto.assigneeId || null, dto.epicId || null,
        dto.cycleId || null, dto.parentTaskId || null,
        dto.dueDate || null, dto.createdBy,
      ],
    );

    const { rows: [full] } = await this.pool.query(`
      SELECT
        t.id, t.sequential_id,
        CONCAT(p.code, '-', t.sequential_id) AS identifier,
        p.name AS project_name, p.code AS project_code,
        t.title, t.priority, t.status,
        t.epic_id, e.name AS epic_name,
        t.assignee_id, u.initials AS assignee_initials,
        t.due_date
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN epics e ON e.id = t.epic_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.id = $1
    `, [task.id]);
    return full;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.pool.query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id],
    );
  }

  async update(id: string, dto: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    blockedReason?: string | null;
  }): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dto.title       !== undefined) { sets.push(`title = $${idx++}`);          params.push(dto.title); }
    if (dto.description !== undefined) { sets.push(`description = $${idx++}`);    params.push(dto.description || null); }
    if (dto.status      !== undefined) { sets.push(`status = $${idx++}`);         params.push(dto.status); }
    if (dto.priority    !== undefined) { sets.push(`priority = $${idx++}`);       params.push(dto.priority); }
    if ('assigneeId'    in dto)        { sets.push(`assignee_id = $${idx++}`);    params.push(dto.assigneeId ?? null); }
    if ('epicId'        in dto)        { sets.push(`epic_id = $${idx++}`);        params.push(dto.epicId ?? null); }
    if ('cycleId'       in dto)        { sets.push(`cycle_id = $${idx++}`);       params.push(dto.cycleId ?? null); }
    if ('dueDate'       in dto)        { sets.push(`due_date = $${idx++}`);       params.push(dto.dueDate || null); }
    if ('blockedReason' in dto)        { sets.push(`blocked_reason = $${idx++}`); params.push(dto.blockedReason || null); }

    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);
    params.push(id);

    await this.pool.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${idx}`,
      params,
    );
  }

  async updateAndLog(id: string, userId: string, dto: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    epicId?: string | null;
    cycleId?: string | null;
    dueDate?: string | null;
    blockedReason?: string | null;
  }): Promise<void> {
    await this.update(id, dto);

    const actions: string[] = [];
    if (dto.title       !== undefined) actions.push(`cambió el título`);
    if (dto.description !== undefined) actions.push(`actualizó la descripción`);
    if (dto.status      !== undefined) actions.push(`cambió el estado a "${dto.status}"`);
    if (dto.priority    !== undefined) actions.push(`cambió la prioridad a "${dto.priority}"`);
    if ('assigneeId'    in dto)        actions.push(dto.assigneeId ? `asignó la tarea` : `removió la asignación`);
    if ('epicId'        in dto)        actions.push(dto.epicId ? `asignó una épica` : `removió la épica`);
    if ('cycleId'       in dto)        actions.push(dto.cycleId ? `asignó un ciclo` : `removió el ciclo`);
    if ('dueDate'       in dto)        actions.push(dto.dueDate ? `cambió la fecha de entrega` : `removió la fecha de entrega`);

    for (const action of actions) {
      await this.pool.query(
        `INSERT INTO activity_log (task_id, user_id, action) VALUES ($1, $2, $3)`,
        [id, userId, action],
      );
    }
  }

  async createComment(
    taskId: string,
    authorId: string,
    body: string,
  ) {
    const { rows: [comment] } = await this.pool.query(
      `INSERT INTO comments (task_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [taskId, authorId, body],
    );
    await this.pool.query(
      `INSERT INTO activity_log (task_id, user_id, action)
       VALUES ($1, $2, 'comentó en la tarea')`,
      [taskId, authorId],
    );

    /* ── Mention notifications ──────────────────────── */
    const { rows: allUsers } = await this.pool.query(
      `SELECT id, name FROM users WHERE id != $1 AND is_active = true`,
      [authorId],
    );
    const sortedUsers = allUsers.sort((a: { name: string }, b: { name: string }) => b.name.length - a.name.length);
    const notified = new Set<string>();
    for (const u of sortedUsers) {
      if (notified.has(u.id)) continue;
      const escaped = u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`@${escaped}(?:\\s|@|$)`, 'i');
      if (pattern.test(body)) {
        notified.add(u.id);
        await this.notificationsRepo.createMentionNotification({
          recipientId: u.id,
          senderId:    authorId,
          taskId,
          message:     `te mencionó: "${body.length > 60 ? body.slice(0, 60) + '…' : body}"`,
        });
      }
    }

    return comment;
  }

  async logActivity(taskId: string, userId: string, action: string) {
    await this.pool.query(
      `INSERT INTO activity_log (task_id, user_id, action)
       VALUES ($1, $2, $3)`,
      [taskId, userId, action],
    );
  }

  async findById(id: string) {
    const { rows: [task] } = await this.pool.query(`
      SELECT
        t.id, t.sequential_id,
        CONCAT(p.code, '-', t.sequential_id) AS identifier,
        t.title, t.description, t.status, t.priority,
        t.due_date, t.blocked_reason, t.created_at,
        t.assignee_id,
        u_a.initials AS assignee_initials, u_a.name AS assignee_name,
        u_a.avatar_url AS assignee_avatar_url, u_a.avatar_color AS assignee_avatar_color,
        u_c.initials AS creator_initials,  u_c.name AS creator_name,
        u_c.avatar_url AS creator_avatar_url, u_c.avatar_color AS creator_avatar_color,
        p.code AS project_code, p.name AS project_name,
        t.epic_id, e.name AS epic_name,
        t.cycle_id
      FROM tasks t
      JOIN  projects p  ON p.id = t.project_id
      LEFT JOIN users u_a ON u_a.id = t.assignee_id
      LEFT JOIN users u_c ON u_c.id = t.created_by
      LEFT JOIN epics  e  ON e.id  = t.epic_id
      WHERE t.id = $1
    `, [id]);
    if (!task) return null;

    const { rows: subtasks } = await this.pool.query(`
      SELECT t.id, t.sequential_id,
             CONCAT(p.code, '-', t.sequential_id) AS identifier,
             t.title, t.status
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.parent_task_id = $1
      ORDER BY t.sequential_id
    `, [id]);

    const { rows: comments } = await this.pool.query(`
      SELECT c.id, c.body, c.created_at, u.initials, u.name, u.avatar_url, u.avatar_color
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `, [id]);

    const { rows: activity } = await this.pool.query(`
      SELECT al.id, al.action, al.created_at, u.initials, u.name, u.avatar_url, u.avatar_color
      FROM activity_log al
      JOIN users u ON u.id = al.user_id
      WHERE al.task_id = $1
      ORDER BY al.created_at DESC
    `, [id]);

    return { ...task, subtasks, comments, activity };
  }
}
