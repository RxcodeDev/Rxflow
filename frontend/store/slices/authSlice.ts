import type { AuthUser } from '@/types/auth.types';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  initialized: boolean;
}

export const initialAuthState: AuthState = {
  user: null,
  token: null,
  initialized: false,
};

export type AuthAction =
  | { type: 'auth/login'; payload: { user: AuthUser; token: string } }
  | { type: 'auth/logout' }
  | { type: 'auth/init'; payload: { user: AuthUser; token: string } | null }
  | { type: 'auth/update'; payload: AuthUser };

export default function authReducer(
  state: AuthState,
  action: AuthAction,
): AuthState {
  switch (action.type) {
    case 'auth/login':
      return { user: action.payload.user, token: action.payload.token, initialized: true };
    case 'auth/logout':
      return { user: null, token: null, initialized: true };
    case 'auth/init':
      if (!action.payload) return { ...state, initialized: true };
      return { user: action.payload.user, token: action.payload.token, initialized: true };
    case 'auth/update':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}
