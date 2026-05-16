import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LicensesService } from './licenses.service';
import { AddMemberDto, AssignProjectDto, AssignWorkspaceDto, CreateLicenseDto, UpdateMemberRoleDto, CreatePositionDto, CreateInviteDto } from './dto/licenses.dto';
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

  @Get(':id/members')
  getMembersWithAccess(@Param('id') id: string) {
    return this.svc.getMembersWithAccess(id);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id') licenseId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() caller: SafeUser,
  ) {
    return this.svc.updateMemberRole(licenseId, userId, dto.role, caller.id);
  }

  @Delete(':id/members/:userId/projects/:projectId')
  @HttpCode(204)
  async removeMemberProjectAccess(
    @Param('id') licenseId: string,
    @Param('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    await this.svc.removeMemberProjectAccess(licenseId, userId, projectId);
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

  // ── Positions ─────────────────────────────────────────────────────────────────

  @Get(':id/positions')
  getPositions(@Param('id') id: string) {
    return this.svc.getPositions(id);
  }

  @Post(':id/positions')
  createPosition(@Param('id') id: string, @Body() dto: CreatePositionDto) {
    return this.svc.createPosition(id, dto.name);
  }

  @Delete(':id/positions/:posId')
  @HttpCode(204)
  async deletePosition(@Param('id') licenseId: string, @Param('posId') posId: string) {
    await this.svc.deletePosition(licenseId, posId);
  }

  // ── Invites ───────────────────────────────────────────────────────────────────

  @Post(':id/invites')
  createInvite(
    @Param('id') licenseId: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser() caller: SafeUser,
  ) {
    return this.svc.createInvite(licenseId, caller.id, dto.role, dto.roleType);
  }

  // ── Scoped queries ────────────────────────────────────────────────────────────

  @Get(':id/my-workspaces')
  myWorkspaces(@CurrentUser() user: SafeUser) {
    return this.svc.findWorkspacesForUser(user.id);
  }
}
