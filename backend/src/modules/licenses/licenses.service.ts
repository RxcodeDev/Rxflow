import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LicensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Create a new license.  The owner is automatically added as a member with
   * role 'owner'.
   */
  async createLicense(name: string, ownerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const license = await tx.license.create({
        data: {
          name,
          owner_id: ownerId,
          members: {
            create: { user_id: ownerId, role: 'owner' },
          },
        },
        include: { members: true },
      });
      return license;
    });
  }

  // ── Read ─────────────────────────────────────────────────────────────────────

  async findById(licenseId: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: {
        owner: { select: { id: true, name: true, email: true, initials: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, initials: true, role: true } },
          },
        },
        workspaces: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });
    if (!license) throw new NotFoundException(`Licencia '${licenseId}' no encontrada`);
    return license;
  }

  async findAllForUser(userId: string) {
    return this.prisma.license.findMany({
      where: {
        OR: [
          { owner_id: userId },
          { members: { some: { user_id: userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, workspaces: true } },
      },
    });
  }

  // ── Members ───────────────────────────────────────────────────────────────────

  /**
   * Add a user to a license.  License owner can always add members.
   */
  async addMember(licenseId: string, userId: string, role = 'member') {
    await this._requireLicenseExists(licenseId);

    const existing = await this.prisma.licenseMember.findUnique({
      where: { license_id_user_id: { license_id: licenseId, user_id: userId } },
    });
    if (existing) throw new ConflictException('El usuario ya es miembro de esta licencia');

    return this.prisma.licenseMember.create({
      data: { license_id: licenseId, user_id: userId, role },
    });
  }

  async removeMember(licenseId: string, userId: string, callerId: string) {
    const license = await this._requireLicenseExists(licenseId);
    if (license.owner_id === userId) {
      throw new ForbiddenException('No se puede eliminar al dueño de la licencia');
    }
    if (callerId !== license.owner_id) {
      throw new ForbiddenException('Solo el dueño de la licencia puede eliminar miembros');
    }
    await this.prisma.licenseMember.delete({
      where: { license_id_user_id: { license_id: licenseId, user_id: userId } },
    });
  }

  // ── Workspace assignment ─────────────────────────────────────────────────────

  /**
   * Assign a license member to a workspace (so they can see it).
   */
  async assignMemberToWorkspace(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.upsert({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
      create: { workspace_id: workspaceId, user_id: userId },
      update: {},
    });
  }

  async removeMemberFromWorkspace(workspaceId: string, userId: string) {
    await this.prisma.workspaceMember.delete({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
    });
  }

  // ── Project assignment ───────────────────────────────────────────────────────

  /**
   * Assign a license member to a project (so they can see it).
   */
  async assignMemberToProject(projectId: string, userId: string, role = 'member') {
    return this.prisma.projectMember.upsert({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
      create: { project_id: projectId, user_id: userId, role },
      update: { role },
    });
  }

  async removeMemberFromProject(projectId: string, userId: string) {
    await this.prisma.projectMember.delete({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
    });
  }

  // ── Scoped queries ───────────────────────────────────────────────────────────

  /**
   * Returns only the workspaces visible to a user:
   * - License owner sees all workspaces in their license(s).
   * - Members see only workspaces they have been explicitly assigned to.
   */
  async findWorkspacesForUser(userId: string) {
    const ownedLicenseIds = await this.prisma.license
      .findMany({ where: { owner_id: userId }, select: { id: true } })
      .then((ls) => ls.map((l) => l.id));

    return this.prisma.workspace.findMany({
      where: {
        OR: [
          ...(ownedLicenseIds.length > 0
            ? [{ license_id: { in: ownedLicenseIds } }]
            : []),
          { members: { some: { user_id: userId } } },
        ],
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Returns only the projects visible to a user within a given workspace:
   * - License owner: all projects in the workspace.
   * - Members: only projects they've been explicitly assigned to.
   */
  async findProjectsForUser(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { license_id: true },
    });

    const isOwner = workspace?.license_id
      ? await this.prisma.license
          .count({ where: { id: workspace.license_id, owner_id: userId } })
          .then((n) => n > 0)
      : false;

    return this.prisma.project.findMany({
      where: {
        workspaces: { some: { workspace_id: workspaceId } },
        ...(isOwner
          ? {}
          : { members: { some: { user_id: userId } } }),
      },
      orderBy: { created_at: 'asc' },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  async isLicenseOwner(licenseId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.license.count({
      where: { id: licenseId, owner_id: userId },
    });
    return count > 0;
  }

  async getMemberLicenseIds(userId: string): Promise<string[]> {
    const members = await this.prisma.licenseMember.findMany({
      where: { user_id: userId },
      select: { license_id: true },
    });
    return members.map((m) => m.license_id);
  }

  private async _requireLicenseExists(licenseId: string) {
    const license = await this.prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) throw new NotFoundException(`Licencia '${licenseId}' no encontrada`);
    return license;
  }
}
