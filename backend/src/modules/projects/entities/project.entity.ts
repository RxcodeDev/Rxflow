export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  methodology: string;
  status: string;
  extra_views: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectSummary extends Project {
  tasks_total: number;
  tasks_done: number;
  progress_pct: number;
  team: { initials: string; name: string }[];
  active_cycle: string | null;
}
