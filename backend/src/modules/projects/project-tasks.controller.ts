import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectTasksController {
  constructor(
    private readonly projectsSvc: ProjectsService,
    private readonly tasksSvc: TasksService,
  ) {}

  @Get(':code/tasks')
  tasks(@Param('code') code: string) {
    return this.tasksSvc.findByProject(code);
  }
}
