import { Module } from '@nestjs/common';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';

@Module({
  providers: [WorkspacesRepository, WorkspacesService],
  controllers: [WorkspacesController],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
