import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CyclesModule } from './modules/cycles/cycles.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SeedModule } from './modules/seed/seed.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { LicensesModule } from './modules/licenses/licenses.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CyclesModule,
    NotificationsModule,
    SeedModule,
    WorkspacesModule,
    LicensesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
