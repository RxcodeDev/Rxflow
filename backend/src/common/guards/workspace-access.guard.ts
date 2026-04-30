import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * WorkspaceAccessGuard
 *
 * Rules:
 *  1. License owner → full access to every workspace under their license.
 *  2. License member → access only to workspaces in workspace_members.
 *
 * Expects:
 *  - JwtAuthGuard to have already run (request.user is populated).
 *  - Route param named "id" that contains the workspace UUID.
 */
@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ params: Record<string, string>; user: { id: string } }>();
    const user = request.user;
    const workspaceId = request.params['id'];

    if (!workspaceId) return true;

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, license_id: true },
    });

    if (!workspace) throw new NotFoundException(`Workspace '${workspaceId}' no encontrado`);

    // License owner has unconditional access
    if (workspace.license_id) {
      const isOwner = await this.prisma.license.count({
        where: { id: workspace.license_id, owner_id: user.id },
      });
      if (isOwner > 0) return true;
    }

    // Explicit workspace membership
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: { workspace_id: workspaceId, user_id: user.id },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No tienes acceso a este espacio de trabajo');
    }

    return true;
  }
}
