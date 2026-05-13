import { Injectable } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
  ) {}

  findByAssignee(userId: string) {
    return this.repo.findByAssignee(userId);
  }

  findByProject(projectCode: string, userId: string) {
    return this.repo.findByProject(projectCode, userId);
  }

  findAll(filters: { projectCode?: string; status?: string; cycleId?: string }, userId: string) {
    return this.repo.findAllWithFilters(filters, userId);
  }

  findRecentByTeam(limit?: number) {
    return this.repo.findRecentByTeam(limit);
  }

  updateStatus(id: string, status: string) {
    return this.repo.updateStatus(id, status);
  }

  update(id: string, userId: string, dto: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeIds?: string[] | null;
    assigneeId?: string | null;
    epicId?: string | null;
    cycleId?: string | null;
    dueDate?: string | null;
    blockedReason?: string | null;
  }) {
    return this.repo.updateAndLog(id, userId, dto);
  }

  remove(id: string, userId: string) {
    return this.repo.remove(id, userId);
  }

  getById(id: string) {
    return this.repo.findById(id);
  }

  createComment(taskId: string, authorId: string, body: string) {
    return this.repo.createComment(taskId, authorId, body);
  }

  deleteComment(commentId: string, authorId: string) {
    return this.repo.deleteComment(commentId, authorId);
  }

  updateComment(commentId: string, authorId: string, body: string) {
    return this.repo.updateComment(commentId, authorId, body);
  }

  logActivity(taskId: string, userId: string, action: string) {
    return this.repo.logActivity(taskId, userId, action);
  }

  create(dto: {
    projectCode: string;
    title: string;
    description?: string | null;
    priority: string;
    status: string;
    assigneeIds?: string[];
    assigneeId?: string | null;
    epicId?: string | null;
    cycleId?: string | null;
    parentTaskId?: string | null;
    dueDate?: string | null;
    createdBy: string;
  }) {
    return this.repo.create(dto);
  }
}
