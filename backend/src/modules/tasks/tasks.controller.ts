import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import type { SafeUser } from '../users/entities/user.entity';

interface CreateTaskDto {
  projectCode: string;
  title: string;
  priority?: string;
  status?: string;
  assigneeIds?: string[];
  /** @deprecated use assigneeIds */
  assigneeId?: string;
  epicId?: string;
  cycleId?: string;
  parentTaskId?: string;
  dueDate?: string;
}

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  @Get('mine')
  mine(@CurrentUser() user: SafeUser) {
    return this.svc.findByAssignee(user.id);
  }

  @Get()
  findAll(
    @Query('projectCode') projectCode?: string,
    @Query('status')      status?: string,
    @Query('cycleId')     cycleId?: string,
  ) {
    return this.svc.findAll({ projectCode, status, cycleId });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeIds?: string[] | null;
      /** @deprecated use assigneeIds */
      assigneeId?: string | null;
      epicId?: string | null;
      cycleId?: string | null;
      dueDate?: string | null;
      blockedReason?: string | null;
    },
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.update(id, user.id, dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body('body') body: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.createComment(id, user.id, body);
  }

  @Post(':id/activity')
  addActivity(
    @Param('id') id: string,
    @Body('action') action: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.svc.logActivity(id, user.id, action);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: SafeUser) {
    return this.svc.create({
      projectCode: dto.projectCode,
      title: dto.title,
      priority: dto.priority ?? 'media',
      status: dto.status ?? 'backlog',
      assigneeIds: dto.assigneeIds?.length ? dto.assigneeIds : dto.assigneeId ? [dto.assigneeId] : [],
      epicId: dto.epicId ?? null,
      cycleId: dto.cycleId ?? null,
      parentTaskId: dto.parentTaskId ?? null,
      dueDate: dto.dueDate ?? null,
      createdBy: user.id,
    });
  }
}
