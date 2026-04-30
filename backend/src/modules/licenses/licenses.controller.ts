import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LicensesService } from './licenses.service';
import { AddMemberDto, AssignProjectDto, AssignWorkspaceDto, CreateLicenseDto } from './dto/licenses.dto';
import type { SafeUser } from '../users/entities/user.entity';

@Controller('licenses')
@UseGuards(JwtAuthGuard)
export class LicensesController {
  constructor(private readonly svc: LicensesService) {}

  // ── License CRUD ─────────────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateLicenseDto, @CurrentUser() user: SafeUser) {
    return this.svc.createLicense(dto.name, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: SafeUser) {
    return this.svc.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  // ── Members ───────────────────────────────────────────────────────────────────

  @Post(':id/members')
  addMember(
    @Param('id') licenseId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.svc.addMember(licenseId, dto.userId, dto.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  async removeMember(
    @Param('id') licenseId: string,
    @Param('userId') userId: string,
    @CurrentUser() caller: SafeUser,
  ) {
    await this.svc.removeMember(licenseId, userId, caller.id);
  }

  // ── Workspace assignments ─────────────────────────────────────────────────────

  @Post(':id/assign-workspace')
  assignWorkspace(@Body() dto: AssignWorkspaceDto) {
    return this.svc.assignMemberToWorkspace(dto.workspaceId, dto.userId);
  }

  @Delete(':id/assign-workspace')
  @HttpCode(204)
  async unassignWorkspace(@Body() dto: AssignWorkspaceDto) {
    await this.svc.removeMemberFromWorkspace(dto.workspaceId, dto.userId);
  }

  // ── Project assignments ───────────────────────────────────────────────────────

  @Post(':id/assign-project')
  assignProject(@Body() dto: AssignProjectDto) {
    return this.svc.assignMemberToProject(dto.projectId, dto.userId);
  }

  @Delete(':id/assign-project')
  @HttpCode(204)
  async unassignProject(@Body() dto: AssignProjectDto) {
    await this.svc.removeMemberFromProject(dto.projectId, dto.userId);
  }

  // ── Scoped queries ────────────────────────────────────────────────────────────

  @Get(':id/my-workspaces')
  myWorkspaces(@CurrentUser() user: SafeUser) {
    return this.svc.findWorkspacesForUser(user.id);
  }
}
