export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

/** Shape returned by the NestJS TransformInterceptor */
export interface ApiWrapped<T> {
  ok: boolean;
  data: T;
}

/* ── Domain types for API responses ────────────────── */

export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  methodology: string;
  status: string;
  extra_views: string[];
  tasks_total: number;
  tasks_done: number;
  progress_pct: number;
  team: {
    id?: string;
    initials: string;
    name: string;
    avatar_url?: string | null;
    avatar_color?: string | null;
    presence_status?: 'online' | 'away' | 'offline';
  }[];
  active_cycle: string | null;
}

export interface TaskAssignee {
  id: string;
  name: string;
  initials: string;
  avatar_color: string | null;
  avatar_url?: string | null;
}

export interface TaskItem {
  id: string;
  sequential_id: number;
  identifier: string;       // e.g. "ENG-12"
  project_name: string;
  project_code: string;
  title: string;
  priority: string;
  status: string;
  epic_id: string | null;
  epic_name: string | null;
  /** @deprecated use `assignees[0]` — kept for backward-compat display */
  assignee_id: string | null;
  /** @deprecated use `assignees[0]` — kept for backward-compat display */
  assignee_initials: string | null;
  assignees: TaskAssignee[];
  due_date: string | null;
}

export interface CycleSummary {
  id: string;
  name: string;
  number: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  scope_pct: number;
  project_code: string;
  project_name: string;
  tasks_total: number;
  tasks_done: number;
  days_left: number | null;
}

export interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  user_type?: string;
  role_type?: string | null;
  effective_role: string;
  initials: string;
  avatar_url: string | null;
  avatar_color: string | null;
  presence_status: string;
  last_seen_at: string | null;
  projects: string[];
  tasks_open: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  sender: { initials: string; name: string };
  task: { id: string; identifier: string; title: string } | null;
  project: { name: string } | null;
}

export interface EpicItem {
  id: string;
  name: string;
  description: string | null;
  status: string; // 'activa' | 'completada' | 'archivada'
  parent_epic_id: string | null;
  parent_epic_name: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  initials: string;
  avatar_url?: string | null;
  avatar_color?: string | null;
  presence_status?: 'online' | 'away' | 'offline';
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  members: WorkspaceMember[];
  projects: ProjectSummary[];
}

export interface License {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WikiPageSummary {
  id: string;
  title: string;
  slug: string;
  workspace_id: string;
  project_code: string | null;
  epic_id: string | null;
  task_id: string | null;
  parent_page_id: string | null;
  icon: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface WikiPageDetail extends WikiPageSummary {
  /** Tiptap ProseMirror JSON document */
  content: Record<string, unknown>;
  children: Pick<WikiPageSummary, 'id' | 'title' | 'slug'>[];
  breadcrumb: Array<{ id: string; title: string }>;
}

export interface LicenseMemberAccessWorkspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  has_access: boolean;
}

export interface LicenseMemberAccessProject {
  id: string;
  code: string;
  name: string;
  has_access: boolean;
}

export interface LicenseMemberAccess {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatar_url: string | null;
  avatar_color: string | null;
  presence_status: string;
  last_seen_at: string | null;
  role_type: string | null;
  /** Role within the license: owner | admin | member */
  license_role: string;
  workspaces: LicenseMemberAccessWorkspace[];
  projects: LicenseMemberAccessProject[];
}

export interface WikiTreeNode {
  id: string;
  title: string;
  slug: string;
  parent_page_id: string | null;
  icon: string | null;
  workspace_id: string;
  project_code: string | null;
  children: WikiTreeNode[];
}

