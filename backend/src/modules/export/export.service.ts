import { Injectable } from '@nestjs/common';
import { getPool } from '../../config/database.config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  private get pool() {
    return getPool();
  }

  // ── Markdown export (AI-friendly) ─────────────────────────────────────────

  async exportMarkdown(): Promise<string> {
    const [users, projects, tasks, epics, cycles, workspaces, wikiPages] =
      await Promise.all([
        this._exportUsers(),
        this._exportProjects(),
        this._exportTasks(),
        this._exportEpics(),
        this._exportCycles(),
        this._exportWorkspaces(),
        this._exportWikiPages(),
      ]);

    // Build name lookup maps
    const userMap = new Map<string, string>(users.map((u: any) => [u.id, u.name]));
    const projectMap = new Map<string, string>(projects.map((p: any) => [p.code, p.name]));
    const epicMap = new Map<string, string>(epics.map((e: any) => [e.id, e.name]));
    const taskMap = new Map<string, string>(tasks.map((t: any) => [t.id, t.title]));

    const date = new Date().toLocaleDateString('es-MX', { dateStyle: 'long' });
    const lines: string[] = [];

    lines.push(`# Rxflow — Exportación completa`);
    lines.push(`> Generado el ${date}  `);
    lines.push(`> ${users.length} usuarios · ${projects.length} proyectos · ${tasks.length} tareas · ${wikiPages.length} páginas wiki`);
    lines.push('');

    // ── USERS ──────────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('## 👥 Usuarios');
    lines.push('');
    for (const u of users as any[]) {
      lines.push(`### ${u.name}`);
      lines.push(`- **Email:** ${u.email}`);
      lines.push(`- **Rol:** ${u.role}`);
      lines.push(`- **Estado:** ${u.presence_status}`);
      lines.push(`- **Activo:** ${u.is_active ? 'Sí' : 'No'}`);
      lines.push(`- **Miembro desde:** ${new Date(u.created_at).toLocaleDateString('es-MX')}`);
      lines.push('');
    }

    // ── WORKSPACES ────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('## 🗂 Espacios de trabajo (Workspaces)');
    lines.push('');
    for (const ws of workspaces as any[]) {
      lines.push(`### ${ws.name}`);
      if (ws.description) lines.push(`> ${ws.description}`);
      const wsMemberNames = (ws.members as any[]).map((m: any) => m.name).join(', ');
      if (wsMemberNames) lines.push(`- **Miembros:** ${wsMemberNames}`);
      const wsProjectNames = (ws.projects as any[]).map((p: any) => p.name).join(', ');
      if (wsProjectNames) lines.push(`- **Proyectos:** ${wsProjectNames}`);
      lines.push('');
    }

    // ── PROJECTS ──────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('## 📁 Proyectos');
    lines.push('');
    for (const p of projects as any[]) {
      lines.push(`### ${p.name} (\`${p.code}\`)`);
      if (p.description) lines.push(`> ${p.description}`);
      lines.push(`- **Metodología:** ${p.methodology}`);
      lines.push(`- **Estado:** ${p.status}`);
      const teamNames = (p.members as any[]).map((m: any) => `${m.name} (${m.role})`).join(', ');
      if (teamNames) lines.push(`- **Equipo:** ${teamNames}`);
      lines.push('');
    }

    // ── EPICS ─────────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('## ⚡ Épicas');
    lines.push('');
    for (const e of epics as any[]) {
      const projName = projectMap.get(e.project_code) ?? e.project_code ?? '—';
      const parentName = e.parent_epic_id ? epicMap.get(e.parent_epic_id) ?? null : null;
      lines.push(`### ${e.name}`);
      if (e.description) lines.push(`> ${e.description}`);
      lines.push(`- **Proyecto:** ${projName}`);
      lines.push(`- **Estado:** ${e.status}`);
      if (parentName) lines.push(`- **Épica padre:** ${parentName}`);
      lines.push('');
    }

    // ── CYCLES ────────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('## 🔄 Ciclos');
    lines.push('');
    for (const cy of cycles as any[]) {
      const projName = projectMap.get(cy.project_code) ?? cy.project_code ?? '—';
      lines.push(`### ${cy.name}`);
      if (cy.description) lines.push(`> ${cy.description}`);
      lines.push(`- **Proyecto:** ${projName}`);
      lines.push(`- **Estado:** ${cy.status}`);
      if (cy.start_date) lines.push(`- **Inicio:** ${new Date(cy.start_date).toLocaleDateString('es-MX')}`);
      if (cy.end_date)   lines.push(`- **Fin:** ${new Date(cy.end_date).toLocaleDateString('es-MX')}`);
      const cycleTasks = (cy.tasks as any[]).filter((t: any) => t.task_id);
      if (cycleTasks.length) {
        lines.push(`- **Tareas (${cycleTasks.length}):** ${cycleTasks.map((t: any) => `${t.title} [${t.status}]`).join(', ')}`);
      }
      lines.push('');
    }

    // ── TASKS ─────────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('## ✅ Tareas');
    lines.push('');
    const rootTasks = (tasks as any[]).filter((t: any) => !t.parent_task_id);
    const subTasks  = (tasks as any[]).filter((t: any) =>  t.parent_task_id);
    const subByParent = new Map<string, any[]>();
    for (const st of subTasks) {
      const arr = subByParent.get(st.parent_task_id) ?? [];
      arr.push(st);
      subByParent.set(st.parent_task_id, arr);
    }

    for (const t of rootTasks) {
      const projName    = projectMap.get(t.project_code) ?? t.project_code ?? '—';
      const epicName    = t.epic_id ? epicMap.get(t.epic_id) ?? '—' : null;
      const assignees   = (t.assignees as any[]).map((a: any) => a.name).join(', ') || 'Sin asignar';
      const comments    = (t.comments as any[]) as any[];
      lines.push(`### ${t.title}`);
      if (t.description) lines.push(`> ${t.description}`);
      lines.push(`- **Proyecto:** ${projName}`);
      lines.push(`- **Estado:** ${t.status} · **Prioridad:** ${t.priority}`);
      lines.push(`- **Asignados:** ${assignees}`);
      if (epicName) lines.push(`- **Épica:** ${epicName}`);
      if (t.due_date) lines.push(`- **Fecha límite:** ${new Date(t.due_date).toLocaleDateString('es-MX')}`);
      if (comments.length) {
        lines.push(`- **Comentarios:**`);
        for (const c of comments) {
          const author = userMap.get(c.author_id) ?? 'Desconocido';
          lines.push(`  - *${author}:* ${c.content}`);
        }
      }
      const children = subByParent.get(t.id) ?? [];
      if (children.length) {
        lines.push(`- **Subtareas:**`);
        for (const sub of children) {
          const subAssignees = (sub.assignees as any[]).map((a: any) => a.name).join(', ') || 'Sin asignar';
          lines.push(`  - **${sub.title}** [${sub.status}] — ${subAssignees}`);
        }
      }
      lines.push('');
    }

    // ── WIKI ──────────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('## 📖 Wiki — Procesos y documentación');
    lines.push('');
    const rootPages = (wikiPages as any[]).filter((p: any) => !p.parent_page_id);
    const childPages = (wikiPages as any[]).filter((p: any) => p.parent_page_id);
    const childByParent = new Map<string, any[]>();
    for (const cp of childPages) {
      const arr = childByParent.get(cp.parent_page_id) ?? [];
      arr.push(cp);
      childByParent.set(cp.parent_page_id, arr);
    }

    const renderWikiPage = (page: any, depth: number) => {
      const heading = '#'.repeat(Math.min(depth + 3, 6));
      const icon = page.icon ? `${page.icon} ` : '';
      lines.push(`${heading} ${icon}${page.title}`);
      if (page.project_code) lines.push(`- **Proyecto:** ${projectMap.get(page.project_code) ?? page.project_code}`);
      if (page.epic_id)      lines.push(`- **Épica:** ${epicMap.get(page.epic_id) ?? '—'}`);
      if (page.task_id)      lines.push(`- **Tarea:** ${taskMap.get(page.task_id) ?? '—'}`);
      if (page.is_archived)  lines.push(`- **Estado:** Archivada`);

      // Render content (Tiptap JSON → plain text extraction)
      const text = extractTextFromTiptap(page.content);
      if (text.trim()) {
        lines.push('');
        lines.push(text.trim());
      }
      lines.push('');

      for (const child of childByParent.get(page.id) ?? []) {
        renderWikiPage(child, depth + 1);
      }
    };

    for (const page of rootPages) {
      renderWikiPage(page, 0);
    }

    return lines.join('\n');
  }

  async exportAll() {
    const [users, projects, tasks, epics, cycles, workspaces, wikiPages, licenses] =
      await Promise.all([
        this._exportUsers(),
        this._exportProjects(),
        this._exportTasks(),
        this._exportEpics(),
        this._exportCycles(),
        this._exportWorkspaces(),
        this._exportWikiPages(),
        this._exportLicenses(),
      ]);

    return {
      _meta: {
        exported_at: new Date().toISOString(),
        source: 'Rxflow',
        format_version: '1.0',
        description:
          'Exportación completa de la base de datos de Rxflow para análisis con IA. ' +
          'Incluye usuarios, proyectos, tareas, épicas, ciclos, espacios de trabajo, wiki y licencias.',
        counts: {
          users: users.length,
          projects: projects.length,
          tasks: tasks.length,
          epics: epics.length,
          cycles: cycles.length,
          workspaces: workspaces.length,
          wiki_pages: wikiPages.length,
          licenses: licenses.length,
        },
      },
      users,
      workspaces,
      licenses,
      projects,
      epics,
      cycles,
      tasks,
      wiki_pages: wikiPages,
    };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  private async _exportUsers() {
    const { rows } = await this.pool.query(`
      SELECT
        id, name, email, role, initials,
        avatar_color, presence_status, last_seen_at,
        is_active, created_at, updated_at
      FROM users
      ORDER BY created_at ASC
    `);
    return rows;
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  private async _exportProjects() {
    const { rows } = await this.pool.query(`
      SELECT
        p.id, p.code, p.name, p.description, p.methodology,
        p.status, p.extra_views, p.created_at, p.updated_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'user_id', pm.user_id,
            'name',    u.name,
            'role',    pm.role
          )) FILTER (WHERE pm.user_id IS NOT NULL),
          '[]'
        ) AS members
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN users u ON u.id = pm.user_id
      GROUP BY p.id
      ORDER BY p.created_at ASC
    `);
    return rows;
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  private async _exportTasks() {
    const { rows } = await this.pool.query(`
      SELECT
        t.id, t.title, t.description, t.status, t.priority,
        t.project_id,
        p.code  AS project_code,
        t.parent_task_id,
        t.assignee_id,
        t.created_by,
        t.epic_id,
        t.cycle_id,
        t.due_date,
        t.created_at, t.updated_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'user_id', ta.user_id,
            'name',    u.name
          )) FILTER (WHERE ta.user_id IS NOT NULL),
          '[]'
        ) AS assignees,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id',         c.id,
            'content',    c.body,
            'author_id',  c.author_id,
            'created_at', c.created_at
          )) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS comments
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN task_assignees ta ON ta.task_id = t.id
      LEFT JOIN users u ON u.id = ta.user_id
      LEFT JOIN comments c ON c.task_id = t.id
      GROUP BY t.id, p.code
      ORDER BY t.created_at ASC
    `);
    return rows;
  }

  // ── Epics ──────────────────────────────────────────────────────────────────

  private async _exportEpics() {
    const { rows } = await this.pool.query(`
      SELECT
        e.id, e.name, e.description, e.status,
        e.project_id,
        p.code AS project_code,
        e.parent_epic_id,
        e.created_at, e.updated_at
      FROM epics e
      LEFT JOIN projects p ON p.id = e.project_id
      ORDER BY e.created_at ASC
    `);
    return rows;
  }

  // ── Cycles ─────────────────────────────────────────────────────────────────

  private async _exportCycles() {
    const { rows } = await this.pool.query(`
      SELECT
        cy.id, cy.name, cy.status,
        cy.start_date, cy.end_date,
        cy.project_id,
        p.code AS project_code,
        cy.created_at, cy.updated_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'task_id', t.id,
            'title',   t.title,
            'status',  t.status
          )) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tasks
      FROM cycles cy
      LEFT JOIN projects p ON p.id = cy.project_id
      LEFT JOIN tasks t ON t.cycle_id = cy.id
      GROUP BY cy.id, p.code
      ORDER BY cy.created_at ASC
    `);
    return rows;
  }

  // ── Workspaces ─────────────────────────────────────────────────────────────

  private async _exportWorkspaces() {
    const { rows } = await this.pool.query(`
      SELECT
        ws.id, ws.name, ws.description, ws.color, ws.icon,
        ws.license_id, ws.created_by, ws.created_at, ws.updated_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'user_id', wm.user_id,
            'name',    u.name,
            'role',    u.role
          )) FILTER (WHERE wm.user_id IS NOT NULL),
          '[]'
        ) AS members,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'project_id', wp.project_id,
            'code',       p.code,
            'name',       p.name
          )) FILTER (WHERE wp.project_id IS NOT NULL),
          '[]'
        ) AS projects
      FROM workspaces ws
      LEFT JOIN workspace_members wm ON wm.workspace_id = ws.id
      LEFT JOIN users u ON u.id = wm.user_id
      LEFT JOIN workspace_projects wp ON wp.workspace_id = ws.id
      LEFT JOIN projects p ON p.id = wp.project_id
      GROUP BY ws.id
      ORDER BY ws.created_at ASC
    `);
    return rows;
  }

  // ── Wiki pages ─────────────────────────────────────────────────────────────

  private async _exportWikiPages() {
    return this.prisma.wikiPage.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        icon: true,
        content: true,
        workspace_id: true,
        project_code: true,
        epic_id: true,
        task_id: true,
        parent_page_id: true,
        is_archived: true,
        created_by: true,
        updated_by: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  // ── Licenses ───────────────────────────────────────────────────────────────

  private async _exportLicenses() {
    return this.prisma.license.findMany({
      include: {
        members: {
          select: {
            user_id: true,
            role: true,
            joined_at: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }
}

// ── Tiptap JSON → plain text ─────────────────────────────────────────────────

function extractTextFromTiptap(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const node = content as any;
  const lines: string[] = [];

  const walk = (n: any, listDepth = 0): string => {
    if (!n) return '';
    if (n.type === 'text') return n.text ?? '';

    const childText = (n.content ?? []).map((c: any) => walk(c, listDepth)).join('');

    switch (n.type) {
      case 'heading': {
        const level = n.attrs?.level ?? 1;
        return `${'#'.repeat(level)} ${childText}\n`;
      }
      case 'paragraph':
        return childText ? `${childText}\n` : '';
      case 'bulletList':
      case 'orderedList':
        return (n.content ?? []).map((item: any) => walk(item, listDepth + 1)).join('');
      case 'listItem':
        return `${'  '.repeat(listDepth - 1)}- ${childText}`;
      case 'blockquote':
        return childText.split('\n').map((l: string) => `> ${l}`).join('\n') + '\n';
      case 'codeBlock':
        return `\`\`\`\n${childText}\n\`\`\`\n`;
      case 'horizontalRule':
        return '---\n';
      case 'hardBreak':
        return '\n';
      default:
        return childText;
    }
  };

  for (const child of node.content ?? []) {
    lines.push(walk(child));
  }
  return lines.join('');
}
