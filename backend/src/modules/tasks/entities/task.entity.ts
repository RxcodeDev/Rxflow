export interface Task {
  id: string;
  sequential_id: number;
  project_id: string;
  epic_id: string | null;
  cycle_id: string | null;
  parent_task_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  due_date: Date | null;
  blocked_reason: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AssigneeRef {
  id: string;
  name: string;
  initials: string;
  avatar_color: string | null;
}

export interface TaskItem {
  id: string;
  sequential_id: number;
  identifier: string;
  project_name: string;
  project_code: string;
  title: string;
  priority: string;
  status: string;
  epic_id: string | null;
  epic_name: string | null;
  /** @deprecated Use `assignees` — kept for backward-compat display */
  assignee_id: string | null;
  /** @deprecated Use `assignees` — kept for backward-compat display */
  assignee_initials: string | null;
  assignees: AssigneeRef[];
  due_date: Date | null;
}
