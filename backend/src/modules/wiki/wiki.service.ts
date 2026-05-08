import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { WikiTreeNode } from './wiki.types';
import type { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import type { UpdateWikiPageDto } from './dto/update-wiki-page.dto';

// Re-export so the controller can trace the type without a separate import
export type { WikiTreeNode };

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Workspace membership guard ────────────────────────────────────────────────

  private async _requireWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
    });
    if (!member) throw new ForbiddenException('No tienes acceso a este workspace');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 200);
  }

  private async _buildBreadcrumb(
    pageId: string,
    title: string,
    parentId: string | null,
  ): Promise<Array<{ id: string; title: string }>> {
    const crumbs: Array<{ id: string; title: string }> = [{ id: pageId, title }];
    let parentPageId = parentId;
    let depth = 0;

    while (parentPageId && depth < 10) {
      const parent = await this.prisma.wikiPage.findUnique({
        where: { id: parentPageId },
        select: { id: true, title: true, parent_page_id: true },
      });
      if (!parent) break;
      crumbs.unshift({ id: parent.id, title: parent.title });
      parentPageId = parent.parent_page_id;
      depth++;
    }
    return crumbs;
  }

  // ── Read ─────────────────────────────────────────────────────────────────────

  async findAll(workspaceId: string, userId: string) {
    await this._requireWorkspaceMembership(workspaceId, userId);
    return this.prisma.wikiPage.findMany({
      where: { workspace_id: workspaceId, is_archived: false },
      select: {
        id: true,
        title: true,
        slug: true,
        workspace_id: true,
        project_code: true,
        epic_id: true,
        task_id: true,
        parent_page_id: true,
        created_by: true,
        updated_by: true,
        created_at: true,
        updated_at: true,
        is_archived: true,
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  async findTree(workspaceId: string, userId: string): Promise<WikiTreeNode[]> {
    await this._requireWorkspaceMembership(workspaceId, userId);
    const pages = await this.prisma.wikiPage.findMany({
      where: { workspace_id: workspaceId, is_archived: false },
      select: {
        id: true,
        title: true,
        slug: true,
        parent_page_id: true,
        workspace_id: true,
        project_code: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const nodeMap = new Map<string, WikiTreeNode>();
    for (const p of pages) {
      nodeMap.set(p.id, { ...p, children: [] as WikiTreeNode[] });
    }

    const roots: WikiTreeNode[] = [];
    for (const node of nodeMap.values()) {
      if (!node.parent_page_id) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(node.parent_page_id);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }
    return roots;
  }

  async search(workspaceId: string, userId: string, q: string) {
    await this._requireWorkspaceMembership(workspaceId, userId);
    return this.prisma.wikiPage.findMany({
      where: {
        workspace_id: workspaceId,
        is_archived: false,
        title: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        workspace_id: true,
        project_code: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
      take: 20,
    });
  }

  async findById(id: string, userId: string) {
    const page = await this.prisma.wikiPage.findUnique({
      where: { id },
      include: {
        children: {
          where: { is_archived: false },
          select: { id: true, title: true, slug: true },
          orderBy: { created_at: 'asc' },
        },
      },
    });
    if (!page) throw new NotFoundException('Página no encontrada');
    await this._requireWorkspaceMembership(page.workspace_id, userId);

    const breadcrumb = await this._buildBreadcrumb(page.id, page.title, page.parent_page_id);
    return { ...page, breadcrumb };
  }

  // ── Write ─────────────────────────────────────────────────────────────────────

  async create(dto: CreateWikiPageDto, userId: string) {
    await this._requireWorkspaceMembership(dto.workspaceId, userId);

    let slug = dto.slug ?? this.generateSlug(dto.title);
    const existingSlug = await this.prisma.wikiPage.findFirst({
      where: { workspace_id: dto.workspaceId, slug },
    });
    if (existingSlug) slug = `${slug}-${Date.now()}`;

    const defaultContent: Prisma.InputJsonValue = { type: 'doc', content: [] };

    return this.prisma.wikiPage.create({
      data: {
        workspace_id: dto.workspaceId,
        title: dto.title,
        slug,
        content: (dto.content as unknown as Prisma.InputJsonValue) ?? defaultContent,
        project_code: dto.projectCode ?? null,
        epic_id: dto.epicId ?? null,
        task_id: dto.taskId ?? null,
        parent_page_id: dto.parentPageId ?? null,
        created_by: userId,
        updated_by: userId,
      },
    });
  }

  async update(id: string, dto: UpdateWikiPageDto, userId: string) {
    const page = await this.prisma.wikiPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Página no encontrada');
    await this._requireWorkspaceMembership(page.workspace_id, userId);

    let slug: string | undefined;
    if (dto.title && !dto.slug) {
      const generated = this.generateSlug(dto.title);
      const conflict = await this.prisma.wikiPage.findFirst({
        where: { workspace_id: page.workspace_id, slug: generated, NOT: { id } },
      });
      slug = conflict ? `${generated}-${Date.now()}` : generated;
    } else if (dto.slug) {
      slug = dto.slug;
    }

    return this.prisma.wikiPage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(slug !== undefined && { slug }),
        ...(dto.content !== undefined && {
          content: dto.content as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.projectCode !== undefined && { project_code: dto.projectCode }),
        ...(dto.epicId !== undefined && { epic_id: dto.epicId }),
        ...(dto.taskId !== undefined && { task_id: dto.taskId }),
        ...(dto.parentPageId !== undefined && { parent_page_id: dto.parentPageId }),
        updated_by: userId,
      },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const page = await this.prisma.wikiPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Página no encontrada');
    await this._requireWorkspaceMembership(page.workspace_id, userId);
    await this.prisma.wikiPage.delete({ where: { id } });
  }

  async archive(id: string, userId: string) {
    const page = await this.prisma.wikiPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Página no encontrada');
    await this._requireWorkspaceMembership(page.workspace_id, userId);
    return this.prisma.wikiPage.update({
      where: { id },
      data: { is_archived: !page.is_archived, updated_by: userId },
    });
  }

  // ── Filtered views ────────────────────────────────────────────────────────────

  async findByProject(projectCode: string, workspaceId: string, userId: string) {
    await this._requireWorkspaceMembership(workspaceId, userId);
    return this.prisma.wikiPage.findMany({
      where: { workspace_id: workspaceId, project_code: projectCode, is_archived: false },
      select: { id: true, title: true, slug: true, created_at: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    });
  }

  async findByEpic(epicId: string, workspaceId: string, userId: string) {
    await this._requireWorkspaceMembership(workspaceId, userId);
    return this.prisma.wikiPage.findMany({
      where: { workspace_id: workspaceId, epic_id: epicId, is_archived: false },
      select: { id: true, title: true, slug: true, created_at: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    });
  }

  async findByTask(taskId: string, workspaceId: string, userId: string) {
    await this._requireWorkspaceMembership(workspaceId, userId);
    return this.prisma.wikiPage.findMany({
      where: { workspace_id: workspaceId, task_id: taskId, is_archived: false },
      select: { id: true, title: true, slug: true, created_at: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    });
  }
}
