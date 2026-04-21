export interface Cycle {
  id: string;
  project_id: string;
  name: string;
  number: number;
  status: string;
  start_date: Date | null;
  end_date: Date | null;
  scope_pct: number;
  created_at: Date;
  updated_at: Date;
}

export interface CycleSummary extends Cycle {
  project_code: string;
  project_name: string;
  tasks_total: number;
  tasks_done: number;
  days_left: number | null;
}
