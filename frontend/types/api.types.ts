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
  team: { initials: string; name: string }[];
  active_cycle: string | null;
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
  assignee_id: string | null;
  assignee_initials: string | null;
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
  initials: string;
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

