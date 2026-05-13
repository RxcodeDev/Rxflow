import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import type { TaskItem } from './entities/task.entity';

// ── Include shape reused across all list queries ──────────────────────────────
const TASK_LIST_INCLUDE = {
  project:      { select: { name: true, code: true } },
  epic:         { select: { name: true } },
  assignee:     { select: { initials: true } },
  taskAssignees: {
    include: { user: { select: { id: true, name: true, initials: true, avatar_color: true } } },
    orderBy: { assigned_at: 'asc' as const },
  },
} satisfies Prisma.TaskInclude;

type TaskListRow = Prisma.TaskGetPayload<{ include: typeof TASK_LIST_INCLUDE }>;

const PRIORITY_ORDER: Record<string, number> = { urgente: 1, alta: 2, media: 3, baja: 4 };

function toTaskItem(t: TaskListRow): TaskItem {
  return {
    id:                t.id,
    sequential_id:     t.sequential_id,
    identifier:        `${t.project.code}-${t.sequential_id}`,
    project_name:      t.project.name,
    project_code:      t.project.code,
    title:             t.title,
    priority:          t.priority,
    status:            t.status,
    epic_id:           t.epic_id,
    epic_name:         t.epic?.name ?? null,
    assignee_id:       t.assignee_id,
    assignee_initials: t.assignee?.initials ?? null,
    assignees:         t.taskAssignees.map(a => ({
      id:           a.user.id,
      name:         a.user.name,
      initials:     a.user.initials,
      avatar_color: a.user.avatar_color,
    })),
    due_date: t.due_date,
  };
}

@Injectable()
export class TasksRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsRepo: NotificationsRepository,
  ) {}

  async findByAssignee(userId: string): Promise<TaskItem[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        parent_task_id: null,
        taskAssignees:  { some: { user_id: userId } },
      },
      include: TASK_LIST_INCLUDE,
    });
    return tasks
      .sort((a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5) ||
        b.created_at.getTime() - a.created_at.getTime(),
      )
      .map(toTaskItem);
  }

  async findByProject(projectCode: string, userId: string): Promise<TaskItem[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        parent_task_id: null,
        project: {
          code: { equals: projectCode, mode: 'insensitive' },
          OR: [
            { created_by: userId },
            { members: { some: { user_id: userId } } },
            {
              workspaces: {
                some: {
                  workspace: {
                    OR: [
                      { license: { owner_id: userId } },
                      { license: { members: { some: { user_id: userId } } } },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      include:  TASK_LIST_INCLUDE,
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { sequential_id: 'asc' }],
    });
    return tasks.map(toTaskItem);
  }

  async findAllWithFilters(filters: {
    projectCode?: string;
    status?:      string;
    cycleId?:     string;
  }, userId: string): Promise<TaskItem[]> {
    const where: Prisma.TaskWhereInput = {
      parent_task_id: null,
      project: {
        OR: [
          { created_by: userId },
          { members: { some: { user_id: userId } } },
          {
            workspaces: {
              some: {
                workspace: {
                  OR: [
                    { license: { owner_id: userId } },
                    { license: { members: { some: { user_id: userId } } } },
                  ],
                },
              },
            },
          },
        ],
      },
    };
    if (filters.projectCode) {
      where.project = {
        ...(where.project as Prisma.ProjectWhereInput),
        code: { equals: filters.projectCode, mode: 'insensitive' },
      };
    }
    if (filters.status)      where.status   = filters.status;
    if (filters.cycleId)     where.cycle_id = filters.cycleId;

    const tasks = await this.prisma.task.findMany({ where, include: TASK_LIST_INCLUDE });
    return tasks
      .sort((a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5) ||
        a.sequential_id - b.sequential_id,
      )
      .map(toTaskItem);
  }

  async findRecentByTeam(limit = 20): Promise<TaskItem[]> {
    const tasks = await this.prisma.task.findMany({
      where:   { parent_task_id: null },
      include: TASK_LIST_INCLUDE,
      orderBy: { updated_at: 'desc' },
      take:    limit,
    });
    return tasks.map(toTaskItem);
  }

  async create(dto: {
    projectCode:   string;
    title:         string;
    description?:  string | null;
    priority:      string;
    status:        string;
    assigneeIds?:  string[];
    /** @deprecated pass assigneeIds instead */
    assigneeId?:   string | null;
    epicId?:       string | null;
    cycleId?:      string | null;
    parentTaskId?: string | null;
    dueDate?:      string | null;
    createdBy:     string;
  }): Promise<TaskItem> {
    const ids = dto.assigneeIds?.length
      ? dto.assigneeIds
      : dto.assigneeId ? [dto.assigneeId] : [];
    const primaryId = ids[0] ?? null;

    const project = await this.prisma.project.findFirst({
      where:  { code: { equals: dto.projectCode, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!project) throw new Error('Proyecto no encontrado');

    const taskId = await this.prisma.$transaction(async (tx) => {
      const [{ next_id }] = await tx.$queryRaw<[{ next_id: bigint }]>`
        SELECT COALESCE(MAX(sequential_id), 0) + 1 AS next_id
        FROM tasks WHERE project_id = ${project.id}::uuid
      `;
      const task = await tx.task.create({
        data: {
          project_id:     project.id,
          sequential_id:  Number(next_id),
          title:          dto.title,
          description:    dto.description ?? null,
          priority:       dto.priority.toLowerCase(),
          status:         dto.status,
          assignee_id:    primaryId,
          epic_id:        dto.epicId    || null,
          cycle_id:       dto.cycleId   || null,
          parent_task_id: dto.parentTaskId || null,
          due_date:       dto.dueDate ? new Date(dto.dueDate) : null,
          created_by:     dto.createdBy,
          ...(ids.length && {
            taskAssignees: { createMany: { data: ids.map(user_id => ({ user_id })) } },
          }),
        },
        select: { id: true },
      });
      return task.id;
    });

    return toTaskItem(
      await this.prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: TASK_LIST_INCLUDE }),
    );
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.prisma.task.update({ where: { id }, data: { status, updated_at: new Date() } });
  }

  async update(id: string, dto: {
    title?:        string;
    description?:  string;
    status?:       string;
    priority?:     string;
    assigneeIds?:  string[] | null;
    /** @deprecated pass assigneeIds instead */
    assigneeId?:   string | null;
    epicId?:       string | null;
    cycleId?:      string | null;
    dueDate?:      string | null;
    blockedReason?: string | null;
  }): Promise<void> {
    const ids: string[] | null =
      dto.assigneeIds !== undefined
        ? (dto.assigneeIds ?? [])
        : 'assigneeId' in dto
          ? dto.assigneeId ? [dto.assigneeId] : []
          : null;

    const primaryId = ids !== null ? (ids[0] ?? null) : undefined;

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (dto.title        !== undefined) data.title          = dto.title;
    if (dto.description  !== undefined) data.description    = dto.description || null;
    if (dto.status       !== undefined) data.status         = dto.status;
    if (dto.priority     !== undefined) data.priority       = dto.priority;
    if (primaryId        !== undefined) data.assignee_id    = primaryId;
    if ('epicId'         in dto)        data.epic_id        = dto.epicId       ?? null;
    if ('cycleId'        in dto)        data.cycle_id       = dto.cycleId      ?? null;
    if ('dueDate'        in dto)        data.due_date       = dto.dueDate ? new Date(dto.dueDate) : null;
    if ('blockedReason'  in dto)        data.blocked_reason = dto.blockedReason || null;

    if (ids !== null) {
      data.taskAssignees = {
        deleteMany: {},
        createMany: { data: ids.map(user_id => ({ user_id })) },
      };
    }

    if (Object.keys(data).length > 0) {
      data.updated_at = new Date();
      await this.prisma.task.update({ where: { id }, data });
    }
  }

  async updateAndLog(id: string, userId: string, dto: {
    title?:        string;
    description?:  string;
    status?:       string;
    priority?:     string;
    assigneeIds?:  string[] | null;
    /** @deprecated pass assigneeIds instead */
    assigneeId?:   string | null;
    epicId?:       string | null;
    cycleId?:      string | null;
    dueDate?:      string | null;
    blockedReason?: string | null;
  }): Promise<void> {
    await this.update(id, dto);

    const actions: string[] = [];
    if (dto.title        !== undefined) actions.push('cambió el título');
    if (dto.description  !== undefined) actions.push('actualizó la descripción');
    if (dto.status       !== undefined) actions.push(`cambió el estado a "${dto.status}"`);
    if (dto.priority     !== undefined) actions.push(`cambió la prioridad a "${dto.priority}"`);
    if (dto.assigneeIds  !== undefined || 'assigneeId' in dto) {
      const has = (dto.assigneeIds?.length ?? 0) > 0 || !!dto.assigneeId;
      actions.push(has ? 'actualizó los asignados' : 'removió los asignados');
    }
    if ('epicId'        in dto) actions.push(dto.epicId    ? 'asignó una épica'          : 'removió la épica');
    if ('cycleId'       in dto) actions.push(dto.cycleId   ? 'asignó un ciclo'           : 'removió el ciclo');
    if ('dueDate'       in dto) actions.push(dto.dueDate   ? 'cambió la fecha de entrega' : 'removió la fecha de entrega');

    if (actions.length > 0) {
      await this.prisma.activityLog.createMany({
        data: actions.map(action => ({ task_id: id, user_id: userId, action })),
      });
    }
  }

  async remove(id: string, _userId: string): Promise<{ id: string; deleted: true }> {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Tarea no encontrada');
    }

    await this.prisma.task.delete({ where: { id } });

    return { id, deleted: true };
  }

  async createComment(taskId: string, authorId: string, body: string) {
    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data:   { task_id: taskId, author_id: authorId, body },
        select: { id: true, body: true, created_at: true },
      }),
      this.prisma.activityLog.create({
        data: { task_id: taskId, user_id: authorId, action: 'comentó en la tarea' },
      }),
    ]);

    // Mention notifications
    const allUsers = await this.prisma.user.findMany({
      where:  { id: { not: authorId }, is_active: true },
      select: { id: true, name: true },
    });
    const sorted   = [...allUsers].sort((a, b) => b.name.length - a.name.length);
    const notified = new Set<string>();
    for (const u of sorted) {
      if (notified.has(u.id)) continue;
      const escaped = u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`@${escaped}(?:\\s|@|$)`, 'i').test(body)) {
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
    await this.prisma.activityLog.create({ data: { task_id: taskId, user_id: userId, action } });
  }

  async deleteComment(commentId: string, authorId: string) {
    await this.prisma.comment.deleteMany({ where: { id: commentId, author_id: authorId } });
  }

  async updateComment(commentId: string, authorId: string, body: string) {
    return this.prisma.comment.updateMany({
      where: { id: commentId, author_id: authorId },
      data:  { body },
    });
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where:   { id },
      include: {
        project:  { select: { code: true, name: true } },
        epic:     { select: { name: true } },
        assignee: { select: { initials: true, name: true, avatar_url: true, avatar_color: true } },
        creator:  { select: { initials: true, name: true, avatar_url: true, avatar_color: true } },
        taskAssignees: {
          include: { user: { select: { id: true, name: true, initials: true, avatar_color: true, avatar_url: true } } },
          orderBy: { assigned_at: 'asc' },
        },
        subtasks: {
          include: { project: { select: { code: true } } },
          orderBy: { sequential_id: 'asc' },
        },
        comments: {
          include: { author: { select: { initials: true, name: true, avatar_url: true, avatar_color: true } } },
          orderBy: { created_at: 'asc' },
        },
        activityLogs: {
          include: { user: { select: { initials: true, name: true, avatar_url: true, avatar_color: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });
    if (!task) return null;

    return {
      ...task,
      identifier:           `${task.project.code}-${task.sequential_id}`,
      project_code:         task.project.code,
      project_name:         task.project.name,
      epic_name:            task.epic?.name              ?? null,
      assignee_initials:    task.assignee?.initials       ?? null,
      assignee_name:        task.assignee?.name           ?? null,
      assignee_avatar_url:  task.assignee?.avatar_url     ?? null,
      assignee_avatar_color: task.assignee?.avatar_color  ?? null,
      creator_initials:     task.creator?.initials        ?? null,
      creator_name:         task.creator?.name            ?? null,
      creator_avatar_url:   task.creator?.avatar_url      ?? null,
      creator_avatar_color: task.creator?.avatar_color    ?? null,
      assignees: task.taskAssignees.map(a => ({
        id:           a.user.id,
        name:         a.user.name,
        initials:     a.user.initials,
        avatar_color: a.user.avatar_color,
        avatar_url:   a.user.avatar_url,
      })),
      subtasks: task.subtasks.map(s => ({
        id:            s.id,
        sequential_id: s.sequential_id,
        identifier:    `${s.project.code}-${s.sequential_id}`,
        title:         s.title,
        status:        s.status,
      })),
      comments: task.comments.map(c => ({
        id:           c.id,
        body:         c.body,
        created_at:   c.created_at,
        author_id:    c.author_id,
        initials:     c.author.initials,
        name:         c.author.name,
        avatar_url:   c.author.avatar_url,
        avatar_color: c.author.avatar_color,
      })),
      activity: task.activityLogs.map(a => ({
        id:           a.id,
        action:       a.action,
        created_at:   a.created_at,
        initials:     a.user.initials,
        name:         a.user.name,
        avatar_url:   a.user.avatar_url,
        avatar_color: a.user.avatar_color,
      })),
    };
  }
}

