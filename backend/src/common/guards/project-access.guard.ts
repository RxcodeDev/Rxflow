import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * ProjectAccessGuard
 *
 * Rules:
 *  1. License owner → full access to every project under their license.
 *  2. License member → access only to projects in project_members.
 *
 * Expects:
 *  - JwtAuthGuard to have already run.
 *  - Route param named "code" (project code, e.g. "ENG") OR "projectId" (UUID).
 */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ params: Record<string, string>; user: { id: string } }>();
    const user = request.user;

    // Support both :code (string) and :id/:projectId (UUID)
    const projectCode = request.params['code'];
    const projectId   = request.params['projectId'] ?? request.params['id'];

    if (!projectCode && !projectId) return true;

    const project = await this.prisma.project.findFirst({
      where: projectCode ? { code: projectCode } : { id: projectId },
      select: {
        id: true,
        workspaces: {
          select: { workspace: { select: { license_id: true } } },
          take: 1,
        },
      },
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    // Check if user is a license owner for any workspace that contains this project
    const licenseId = project.workspaces[0]?.workspace?.license_id;
    if (licenseId) {
      const isOwner = await this.prisma.license.count({
        where: { id: licenseId, owner_id: user.id },
      });
      if (isOwner > 0) return true;
    }

    // Explicit project membership
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        project_id_user_id: { project_id: project.id, user_id: user.id },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return true;
  }
}
