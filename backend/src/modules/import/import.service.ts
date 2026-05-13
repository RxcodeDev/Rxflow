import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../../config/database.config';

export interface ImportSubtaskDto {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assignee_ids?: string[];
}

export interface ImportTaskDto {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assignee_ids?: string[];
  epic_id?: string | null;
  epic_ref?: number | null;
  cycle_id?: string | null;
  due_date?: string | null;
  subtasks?: ImportSubtaskDto[];
}

export interface ImportEpicDto {
  name: string;
  description?: string | null;
  status?: string;
  parent_epic_id?: string | null;
  parent_epic_ref?: number | null;
}

export interface ImportProjectPayload {
  epics?: ImportEpicDto[];
  tasks?: ImportTaskDto[];
}

interface PlannedEpic {
  index: number;
  name: string;
  description: string | null;
  status: string;
  parent_epic_id: string | null;
  parent_epic_ref: number | null;
}

interface PlannedSubtask {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_ids: string[];
}

interface PlannedTask {
  index: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_ids: string[];
  epic_id: string | null;
  epic_ref: number | null;
  cycle_id: string | null;
  due_date: string | null;
  subtasks: PlannedSubtask[];
}

interface ImportPlan {
  project_id: string;
  project_code: string;
  errors: string[];
  epics: PlannedEpic[];
  tasks: PlannedTask[];
}

const TASK_STATUS_ALIASES: Record<string, string> = {
  backlog: 'backlog',
  todo: 'backlog',
  en_progreso: 'en_progreso',
  in_progress: 'en_progreso',
  en_revision: 'en_revision',
  in_review: 'en_revision',
  bloqueado: 'bloqueado',
  cancelado: 'bloqueado',
  completada: 'completada',
  done: 'completada',
};

const VALID_TASK_STATUSES = new Set(Object.keys(TASK_STATUS_ALIASES));
const VALID_PRIORITIES = new Set(['baja', 'media', 'alta', 'urgente']);
const VALID_EPIC_STATUSES = new Set(['activa', 'completada', 'backlog']);
const UUID_V4ISH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeTaskStatus(status?: string | null): string {
  return TASK_STATUS_ALIASES[(status ?? 'backlog').toLowerCase()] ?? 'backlog';
}

function normalizeIds(rawIds?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of rawIds ?? []) {
    const normalized = id?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

@Injectable()
export class ImportService {
  private get pool() {
    return getPool();
  }

  private async buildImportPlan(projectCode: string, payload: ImportProjectPayload): Promise<ImportPlan> {
    const { rows: projectRows } = await this.pool.query(
      'SELECT id, code FROM projects WHERE UPPER(code) = UPPER($1)',
      [projectCode],
    );

    if (!projectRows[0]) {
      throw new NotFoundException(`Proyecto "${projectCode}" no encontrado`);
    }

    if (payload == null || typeof payload !== 'object') {
      throw new BadRequestException({ errors: ['Body invalido: se esperaba un objeto JSON'] });
    }

    const projectId: string = projectRows[0].id;
    const projectCodeDb: string = projectRows[0].code;
    const errors: string[] = [];

    const rawEpics = payload.epics ?? [];
    const rawTasks = payload.tasks ?? [];

    if (!Array.isArray(rawEpics)) {
      errors.push('epics debe ser un array');
    }
    if (!Array.isArray(rawTasks)) {
      errors.push('tasks debe ser un array');
    }

    const epicsInput: ImportEpicDto[] = Array.isArray(rawEpics) ? rawEpics : [];
    const tasksInput: ImportTaskDto[] = Array.isArray(rawTasks) ? rawTasks : [];

    const { rows: epicRows } = await this.pool.query<{ id: string }>(
      'SELECT id FROM epics WHERE project_id = $1',
      [projectId],
    );
    const existingEpicIds = new Set(epicRows.map(r => r.id));

    const { rows: cycleRows } = await this.pool.query<{ id: string }>(
      'SELECT id FROM cycles WHERE project_id = $1',
      [projectId],
    );
    const existingCycleIds = new Set(cycleRows.map(r => r.id));

    const requestedAssigneeIds = normalizeIds(
      tasksInput.flatMap((task) => [
        ...(task.assignee_ids ?? []),
        ...((task.subtasks ?? []).flatMap(st => st.assignee_ids ?? [])),
      ]),
    );

    const requestedAssigneeUuidIds = requestedAssigneeIds.filter(id => UUID_V4ISH_REGEX.test(id));
    const { rows: userRows } = requestedAssigneeUuidIds.length
      ? await this.pool.query<{ id: string }>(
        'SELECT id FROM users WHERE id = ANY($1::uuid[])',
        [requestedAssigneeUuidIds],
      )
      : { rows: [] as { id: string }[] };
    const existingUserIds = new Set(userRows.map(r => r.id));

    const plannedEpics: PlannedEpic[] = [];

    for (let i = 0; i < epicsInput.length; i++) {
      const epic = epicsInput[i];

      if (!epic.name?.trim()) {
        errors.push(`epics[${i}]: name es requerido`);
      }

      const status = (epic.status ?? 'backlog').toLowerCase();
      if (!VALID_EPIC_STATUSES.has(status)) {
        errors.push(`epics[${i}]: status invalido (${epic.status ?? 'undefined'})`);
      }

      if (epic.parent_epic_id && epic.parent_epic_ref != null) {
        errors.push(`epics[${i}]: usa parent_epic_id o parent_epic_ref, no ambos`);
      }

      if (epic.parent_epic_id && !existingEpicIds.has(epic.parent_epic_id)) {
        errors.push(`epics[${i}]: parent_epic_id (${epic.parent_epic_id}) no existe en el proyecto`);
      }

      if (epic.parent_epic_ref != null) {
        if (!Number.isInteger(epic.parent_epic_ref)) {
          errors.push(`epics[${i}]: parent_epic_ref debe ser entero`);
        } else if (epic.parent_epic_ref < 0 || epic.parent_epic_ref >= epicsInput.length) {
          errors.push(`epics[${i}]: parent_epic_ref (${epic.parent_epic_ref}) fuera de rango`);
        } else if (epic.parent_epic_ref >= i) {
          errors.push(`epics[${i}]: parent_epic_ref (${epic.parent_epic_ref}) debe apuntar a una epica anterior`);
        }
      }

      plannedEpics.push({
        index: i,
        name: epic.name?.trim() ?? '',
        description: epic.description ?? null,
        status,
        parent_epic_id: epic.parent_epic_id ?? null,
        parent_epic_ref: epic.parent_epic_ref ?? null,
      });
    }

    const plannedTasks: PlannedTask[] = [];

    for (let i = 0; i < tasksInput.length; i++) {
      const task = tasksInput[i];

      if (!task.title?.trim()) {
        errors.push(`tasks[${i}]: title es requerido`);
      }

      const rawStatus = (task.status ?? 'backlog').toLowerCase();
      if (!VALID_TASK_STATUSES.has(rawStatus)) {
        errors.push(`tasks[${i}]: status invalido (${task.status ?? 'undefined'})`);
      }
      const status = normalizeTaskStatus(rawStatus);

      const priority = (task.priority ?? 'media').toLowerCase();
      if (!VALID_PRIORITIES.has(priority)) {
        errors.push(`tasks[${i}]: priority invalido (${task.priority ?? 'undefined'})`);
      }

      if (task.epic_id && task.epic_ref != null) {
        errors.push(`tasks[${i}]: usa epic_id o epic_ref, no ambos`);
      }

      if (task.epic_id && !existingEpicIds.has(task.epic_id)) {
        errors.push(`tasks[${i}]: epic_id (${task.epic_id}) no existe en el proyecto`);
      }

      if (task.epic_ref != null) {
        if (!Number.isInteger(task.epic_ref)) {
          errors.push(`tasks[${i}]: epic_ref debe ser entero`);
        } else if (task.epic_ref < 0 || task.epic_ref >= epicsInput.length) {
          errors.push(`tasks[${i}]: epic_ref (${task.epic_ref}) fuera de rango`);
        }
      }

      if (task.cycle_id && !existingCycleIds.has(task.cycle_id)) {
        errors.push(`tasks[${i}]: cycle_id (${task.cycle_id}) no existe en el proyecto`);
      }

      const dueDate = task.due_date ?? null;
      if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        errors.push(`tasks[${i}]: due_date debe tener formato YYYY-MM-DD`);
      }

      const assigneeIds = normalizeIds(task.assignee_ids);
      for (const assigneeId of assigneeIds) {
        if (!UUID_V4ISH_REGEX.test(assigneeId)) {
          errors.push(`tasks[${i}]: assignee_id invalido (${assigneeId})`);
          continue;
        }
        if (!existingUserIds.has(assigneeId)) {
          errors.push(`tasks[${i}]: assignee_id no existe (${assigneeId})`);
        }
      }

      if (task.subtasks != null && !Array.isArray(task.subtasks)) {
        errors.push(`tasks[${i}]: subtasks debe ser un array`);
      }

      const subtasksInput = Array.isArray(task.subtasks) ? task.subtasks : [];
      const plannedSubtasks: PlannedSubtask[] = [];

      for (let j = 0; j < subtasksInput.length; j++) {
        const subtask = subtasksInput[j];

        if (!subtask.title?.trim()) {
          errors.push(`tasks[${i}].subtasks[${j}]: title es requerido`);
        }

        const rawSubStatus = (subtask.status ?? 'backlog').toLowerCase();
        if (!VALID_TASK_STATUSES.has(rawSubStatus)) {
          errors.push(`tasks[${i}].subtasks[${j}]: status invalido (${subtask.status ?? 'undefined'})`);
        }
        const subStatus = normalizeTaskStatus(rawSubStatus);

        const subPriority = (subtask.priority ?? 'media').toLowerCase();
        if (!VALID_PRIORITIES.has(subPriority)) {
          errors.push(`tasks[${i}].subtasks[${j}]: priority invalido (${subtask.priority ?? 'undefined'})`);
        }

        const subAssigneeIds = normalizeIds(subtask.assignee_ids);
        for (const assigneeId of subAssigneeIds) {
          if (!UUID_V4ISH_REGEX.test(assigneeId)) {
            errors.push(`tasks[${i}].subtasks[${j}]: assignee_id invalido (${assigneeId})`);
            continue;
          }
          if (!existingUserIds.has(assigneeId)) {
            errors.push(`tasks[${i}].subtasks[${j}]: assignee_id no existe (${assigneeId})`);
          }
        }

        plannedSubtasks.push({
          title: subtask.title?.trim() ?? '',
          description: subtask.description ?? null,
          status: subStatus,
          priority: subPriority,
          assignee_ids: subAssigneeIds,
        });
      }

      plannedTasks.push({
        index: i,
        title: task.title?.trim() ?? '',
        description: task.description ?? null,
        status,
        priority,
        assignee_ids: assigneeIds,
        epic_id: task.epic_id ?? null,
        epic_ref: task.epic_ref ?? null,
        cycle_id: task.cycle_id ?? null,
        due_date: dueDate,
        subtasks: plannedSubtasks,
      });
    }

    return {
      project_id: projectId,
      project_code: projectCodeDb,
      errors,
      epics: plannedEpics,
      tasks: plannedTasks,
    };
  }

  async previewProjectImport(projectCode: string, payload: ImportProjectPayload) {
    const plan = await this.buildImportPlan(projectCode, payload);

    return {
      project_code: plan.project_code,
      can_import: plan.errors.length === 0,
      errors: plan.errors,
      summary: {
        epics: plan.epics.length,
        tasks: plan.tasks.length,
        subtasks: plan.tasks.reduce((acc, t) => acc + t.subtasks.length, 0),
      },
      normalized_payload: {
        epics: plan.epics.map(epic => ({
          name: epic.name,
          description: epic.description,
          status: epic.status,
          parent_epic_id: epic.parent_epic_id,
          parent_epic_ref: epic.parent_epic_ref,
        })),
        tasks: plan.tasks.map(task => ({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignee_ids: task.assignee_ids,
          epic_id: task.epic_id,
          epic_ref: task.epic_ref,
          cycle_id: task.cycle_id,
          due_date: task.due_date,
          subtasks: task.subtasks,
        })),
      },
    };
  }

  async importProject(projectCode: string, userId: string, payload: ImportProjectPayload) {
    const plan = await this.buildImportPlan(projectCode, payload);
    if (plan.errors.length > 0) {
      throw new BadRequestException({
        message: 'Importacion cancelada por errores de validacion. Ejecuta preview primero.',
        errors: plan.errors,
      });
    }

    const projectId = plan.project_id;
    let createdEpics = 0;
    let createdTasks = 0;

    const epicRefToId = new Map<number, string>();

    for (const epic of plan.epics) {
      const parentEpicId = epic.parent_epic_ref != null
        ? epicRefToId.get(epic.parent_epic_ref) ?? null
        : epic.parent_epic_id;

      const { rows } = await this.pool.query(
        `INSERT INTO epics (id, name, description, status, project_id, parent_epic_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [epic.name, epic.description, epic.status, projectId, parentEpicId],
      );
      epicRefToId.set(epic.index, rows[0].id);
      createdEpics++;
    }

    for (const task of plan.tasks) {
      const epicId = task.epic_ref != null
        ? epicRefToId.get(task.epic_ref) ?? null
        : task.epic_id;
      const taskAssigneeIds = task.assignee_ids;
      const primaryAssigneeId = taskAssigneeIds[0] ?? null;

      const { rows: seqRows } = await this.pool.query(
        'SELECT COALESCE(MAX(sequential_id), 0) + 1 AS next_id FROM tasks WHERE project_id = $1',
        [projectId],
      );

      const { rows } = await this.pool.query(
        `INSERT INTO tasks
           (id, sequential_id, title, description, status, priority,
            project_id, epic_id, cycle_id, parent_task_id, due_date, assignee_id, created_by, created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, NOW(), NOW())
         RETURNING id`,
        [
          seqRows[0].next_id,
          task.title,
          task.description,
          task.status,
          task.priority,
          projectId,
          epicId,
          task.cycle_id,
          task.due_date,
          primaryAssigneeId,
          userId,
        ],
      );

      const parentTaskId: string = rows[0].id;
      createdTasks++;

      for (const assigneeId of taskAssigneeIds) {
        await this.pool.query(
          `INSERT INTO task_assignees (task_id, user_id, assigned_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [parentTaskId, assigneeId],
        ).catch(() => undefined);
      }

      for (const subtask of task.subtasks) {
        const subtaskAssigneeIds = subtask.assignee_ids;
        const subtaskPrimaryAssigneeId = subtaskAssigneeIds[0] ?? null;

        const { rows: subSeqRows } = await this.pool.query(
          'SELECT COALESCE(MAX(sequential_id), 0) + 1 AS next_id FROM tasks WHERE project_id = $1',
          [projectId],
        );

        const { rows: subRows } = await this.pool.query(
          `INSERT INTO tasks
             (id, sequential_id, title, description, status, priority,
              project_id, epic_id, parent_task_id, assignee_id, created_by, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
           RETURNING id`,
          [
            subSeqRows[0].next_id,
            subtask.title,
            subtask.description,
            subtask.status,
            subtask.priority,
            projectId,
            epicId,
            parentTaskId,
            subtaskPrimaryAssigneeId,
            userId,
          ],
        );

        createdTasks++;

        for (const assigneeId of subtaskAssigneeIds) {
          await this.pool.query(
            `INSERT INTO task_assignees (task_id, user_id, assigned_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT DO NOTHING`,
            [subRows[0].id, assigneeId],
          ).catch(() => undefined);
        }
      }
    }

    return {
      created_epics: createdEpics,
      created_tasks: createdTasks,
      errors: [],
    };
  }
}
