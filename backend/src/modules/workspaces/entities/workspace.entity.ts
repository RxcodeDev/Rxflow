import type { ProjectSummary } from '../../projects/entities/project.entity';

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  initials: string;
  avatar_url?: string | null;
  avatar_color?: string | null;
  presence_status?: 'online' | 'away' | 'offline';
}

export interface WorkspaceSummary extends Workspace {
  members: WorkspaceMember[];
  projects: ProjectSummary[];
}
