import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from './workspaces.service';

interface AuthUser { id: string }

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly svc: WorkspacesService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get('unassigned-projects')
  findUnassignedProjects() {
    return this.svc.findUnassignedProjects();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteOne(@Param('id') id: string) {
    await this.svc.deleteById(id);
  }

  /* ── Projects ── */
  @Post(':id/projects')
  addProject(@Param('id') id: string, @Body('projectId') projectId: string) {
    return this.svc.addProject(id, projectId);
  }

  @Delete(':id/projects/:projectId')
  @HttpCode(204)
  async removeProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    await this.svc.removeProject(id, projectId);
  }

  /* ── Members ── */
  @Post(':id/members')
  async addMember(@Param('id') id: string, @Body('userId') userId: string) {
    await this.svc.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    await this.svc.removeMember(id, userId);
  }
}
