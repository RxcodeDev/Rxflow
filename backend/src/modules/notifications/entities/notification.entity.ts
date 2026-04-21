export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: string;
  message: string;
  task_id: string | null;
  project_id: string | null;
  read: boolean;
  created_at: Date;
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: Date;
  sender: { initials: string; name: string };
  task: { id: string; identifier: string; title: string } | null;
  project: { name: string } | null;
}
