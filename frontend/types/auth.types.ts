export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  initials: string;
  avatar_url: string | null;
  avatar_color: string | null;
  presence_status: 'online' | 'away' | 'offline';
}

export interface AuthApiResponse {
  ok: boolean;
  data: {
    user: AuthUser;
    access_token: string;
  };
}
