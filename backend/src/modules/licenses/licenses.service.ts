import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
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

  async getUserLicenseRole(userId: string): Promise<string> {
    const member = await this.prisma.licenseMember.findFirst({
      where: { user_id: userId },
      select: { role: true },
    });
    return member?.role ?? 'member';
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
    const callerIsOwnerOrAdmin =
      license.owner_id === callerId ||
      (await this.prisma.licenseMember.count({
        where: { license_id: licenseId, user_id: callerId, role: { in: ['owner', 'admin'] } },
      })) > 0;
    if (!callerIsOwnerOrAdmin) {
      throw new ForbiddenException('Solo owners y admins pueden eliminar miembros');
    }
    await this.prisma.licenseMember.delete({
      where: { license_id_user_id: { license_id: licenseId, user_id: userId } },
    });
  }

  // ── Members with access detail ───────────────────────────────────────────────

  /**
   * Returns every license member enriched with which workspaces and projects
   * they can currently access (used by the Miembros management page).
   */
  async getMembersWithAccess(licenseId: string) {
    await this._requireLicenseExists(licenseId);

    const [workspaces, licenseMembers] = await Promise.all([
      this.prisma.workspace.findMany({
        where: { license_id: licenseId },
        select: { id: true, name: true, color: true, icon: true },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.licenseMember.findMany({
        where: { license_id: licenseId },
        include: {
          user: {
            select: {
              id: true, name: true, email: true, initials: true,
              avatar_url: true, avatar_color: true, presence_status: true,
              last_seen_at: true, role_type: true, is_active: true,
            },
          },
        },
        orderBy: { joined_at: 'asc' },
      }),
    ]);

    const workspaceIds = workspaces.map((w) => w.id);
    const memberIds = licenseMembers.map((m) => m.user_id);

    const workspaceProjects = workspaceIds.length > 0
      ? await this.prisma.workspaceProject.findMany({
          where: { workspace_id: { in: workspaceIds } },
          include: { project: { select: { id: true, code: true, name: true } } },
        })
      : [];

    const projectMap = new Map<string, { id: string; code: string; name: string }>();
    for (const wp of workspaceProjects) {
      if (!projectMap.has(wp.project_id)) {
        projectMap.set(wp.project_id, { id: wp.project_id, code: wp.project.code, name: wp.project.name });
      }
    }
    const projects = Array.from(projectMap.values());
    const projectIds = projects.map((p) => p.id);

    const wsMemberships = workspaceIds.length > 0 && memberIds.length > 0
      ? await this.prisma.workspaceMember.findMany({
          where: { workspace_id: { in: workspaceIds }, user_id: { in: memberIds } },
        })
      : [];

    const projMemberships = projectIds.length > 0 && memberIds.length > 0
      ? await this.prisma.projectMember.findMany({
          where: { project_id: { in: projectIds }, user_id: { in: memberIds } },
        })
      : [];

    return licenseMembers
      .filter((m) => m.user.is_active)
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        initials: m.user.initials,
        avatar_url: m.user.avatar_url,
        avatar_color: m.user.avatar_color,
        presence_status: m.user.presence_status,
        last_seen_at: m.user.last_seen_at,
        role_type: m.user.role_type,
        license_role: m.role,
        workspaces: workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          color: w.color,
          icon: w.icon,
          has_access: wsMemberships.some((wm) => wm.workspace_id === w.id && wm.user_id === m.user_id),
        })),
        projects: projects.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          has_access: projMemberships.some((pm) => pm.project_id === p.id && pm.user_id === m.user_id),
        })),
      }));
  }

  /**
   * Update the license_members.role for a given user.
   * Only the license owner can change roles; the primary owner's role is locked.
   */
  async updateMemberRole(licenseId: string, userId: string, role: string, callerId: string) {
    const license = await this._requireLicenseExists(licenseId);

    const callerIsOwner =
      license.owner_id === callerId ||
      (await this.prisma.licenseMember.count({
        where: { license_id: licenseId, user_id: callerId, role: 'owner' },
      })) > 0;

    if (!callerIsOwner) {
      throw new ForbiddenException('Solo el dueño de la cuenta puede cambiar roles');
    }
    if (userId === license.owner_id) {
      throw new ForbiddenException('No se puede cambiar el rol del propietario principal de la cuenta');
    }

    await this.prisma.licenseMember.update({
      where: { license_id_user_id: { license_id: licenseId, user_id: userId } },
      data: { role },
    });
  }

  /**
   * Remove a user's access to a specific project within the license.
   */
  async removeMemberProjectAccess(licenseId: string, userId: string, projectId: string) {
    await this._requireLicenseExists(licenseId);
    await this.prisma.projectMember.deleteMany({
      where: { project_id: projectId, user_id: userId },
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
      .findMany({
        where: {
          OR: [
            { owner_id: userId },
            { members: { some: { user_id: userId, role: 'owner' } } },
          ],
        },
        select: { id: true },
      })
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
          .count({
            where: {
              id: workspace.license_id,
              OR: [
                { owner_id: userId },
                { members: { some: { user_id: userId, role: 'owner' } } },
              ],
            },
          })
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

  // ── Positions ────────────────────────────────────────────────────────────────

  async getPositions(licenseId: string) {
    await this._requireLicenseExists(licenseId);
    return this.prisma.position.findMany({
      where: { license_id: licenseId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async createPosition(licenseId: string, name: string) {
    await this._requireLicenseExists(licenseId);
    const existing = await this.prisma.position.findUnique({
      where: { license_id_name: { license_id: licenseId, name: name.trim() } },
    });
    if (existing) throw new ConflictException('Ya existe un cargo con ese nombre');
    return this.prisma.position.create({
      data: { license_id: licenseId, name: name.trim() },
      select: { id: true, name: true },
    });
  }

  async createDefaultPositions(licenseId: string) {
    const defaults = [
      'Tech Lead', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
      'DevOps Engineer', 'QA Engineer', 'Data Engineer', 'Data Scientist',
      'Scrum Master', 'Engineering Manager',
      'UI/UX Designer', 'Product Designer', 'Graphic Designer', 'Creative Director',
      'Motion Designer', 'Content Writer',
      'Product Manager', 'Product Owner', 'Project Manager', 'Business Analyst', 'Operations Manager',
      'CEO', 'CTO', 'COO', 'CFO', 'CMO',
      'Marketing Manager', 'Social Media Manager', 'Sales Manager', 'Account Manager', 'SEO Specialist',
      'HR Manager', 'Recruiter', 'Customer Support', 'IT Support',
    ];
    await this.prisma.position.createMany({
      data: defaults.map((name) => ({ license_id: licenseId, name })),
      skipDuplicates: true,
    });
  }

  async deletePosition(licenseId: string, positionId: string) {
    await this.prisma.position.deleteMany({
      where: { id: positionId, license_id: licenseId },
    });
  }

  // ── Invites ──────────────────────────────────────────────────────────────────

  async createInvite(licenseId: string, createdBy: string, role: string, roleType?: string) {
    await this._requireLicenseExists(licenseId);

    const canInvite = await this.prisma.licenseMember.count({
      where: {
        license_id: licenseId,
        user_id: createdBy,
        role: { in: ['owner', 'admin'] },
      },
    });
    if (!canInvite) throw new ForbiddenException('Solo owners y admins pueden generar invitaciones');

    const token = randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const invite = await this.prisma.licenseInvite.create({
      data: { license_id: licenseId, token, role, role_type: roleType ?? null, created_by: createdBy, expires_at },
    });
    return invite;
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.licenseInvite.findUnique({
      where: { token },
      include: { license: { select: { id: true, name: true } } },
    });
    if (!invite) throw new NotFoundException('Invitación no encontrada');
    if (invite.used_at) throw new BadRequestException('Esta invitación ya fue utilizada');
    if (invite.expires_at < new Date()) throw new BadRequestException('Esta invitación ha expirado');
    return {
      licenseId: invite.license_id,
      licenseName: invite.license.name,
      role: invite.role,
      roleType: invite.role_type,
      expiresAt: invite.expires_at,
    };
  }

  async acceptInvite(token: string, name: string, email: string, password: string) {
    const invite = await this.prisma.licenseInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new NotFoundException('Invitación no encontrada');
    if (invite.used_at) throw new BadRequestException('Esta invitación ya fue utilizada');
    if (invite.expires_at < new Date()) throw new BadRequestException('Esta invitación ha expirado');

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('El correo ya está en uso. Si ya tienes cuenta, pide al administrador que te añada manualmente.');

    const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const trimmedName = name.trim();
    const initials = trimmedName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
    const password_hash = await bcrypt.hash(password, 10);
    const role_type = invite.role_type ?? null;

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: trimmedName,
          email: email.trim().toLowerCase(),
          password_hash,
          initials,
          avatar_color,
          role_type,
        },
      });
      await tx.licenseMember.create({
        data: { license_id: invite.license_id, user_id: newUser.id, role: invite.role },
      });
      await tx.licenseInvite.update({
        where: { token },
        data: { used_at: new Date(), used_by: newUser.id },
      });
      return newUser;
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      role: user.role,
      role_type: user.role_type,
      avatar_url: user.avatar_url,
      avatar_color: user.avatar_color,
      presence_status: user.presence_status ?? 'online',
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  async isLicenseOwner(licenseId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.license.count({
      where: {
        id: licenseId,
        OR: [
          { owner_id: userId },
          { members: { some: { user_id: userId, role: 'owner' } } },
        ],
      },
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
