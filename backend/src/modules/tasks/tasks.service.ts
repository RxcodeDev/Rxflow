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

  findByProject(projectCode: string) {
    return this.repo.findByProject(projectCode);
  }

  findAll(filters: { projectCode?: string; status?: string; cycleId?: string }) {
    return this.repo.findAllWithFilters(filters);
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
    assigneeId?: string | null;
    epicId?: string | null;
    cycleId?: string | null;
    dueDate?: string | null;
    blockedReason?: string | null;
  }) {
    return this.repo.updateAndLog(id, userId, dto);
  }

  getById(id: string) {
    return this.repo.findById(id);
  }

  createComment(taskId: string, authorId: string, body: string) {
    return this.repo.createComment(taskId, authorId, body);
  }

  logActivity(taskId: string, userId: string, action: string) {
    return this.repo.logActivity(taskId, userId, action);
  }

  create(dto: {
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
  }) {
    return this.repo.create(dto);
  }
}
