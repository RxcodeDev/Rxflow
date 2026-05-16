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
