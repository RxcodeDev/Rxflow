import { Module } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [TasksRepository, TasksService],
  controllers: [TasksController],
  exports: [TasksRepository, TasksService],
})
export class TasksModule {}
