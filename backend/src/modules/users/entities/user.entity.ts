export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  initials: string;
  avatar_url: string | null;
  avatar_color: string | null;
  presence_status: 'online' | 'away' | 'offline';
  last_seen_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/** User sin password_hash — seguro para enviar al cliente */
export type SafeUser = Omit<User, 'password_hash'>;
