import { Module } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectTasksController } from './project-tasks.controller';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TasksModule],
  providers: [ProjectsRepository, ProjectsService],
  controllers: [ProjectsController, ProjectTasksController],
  exports: [ProjectsRepository, ProjectsService],
})
export class ProjectsModule {}
