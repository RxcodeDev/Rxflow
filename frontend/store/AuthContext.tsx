'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type Dispatch,
  type ReactNode,
} from 'react';
import authReducer, { initialAuthState } from './slices/authSlice';
import type { AuthState, AuthAction } from './slices/authSlice';
import { getToken, getStoredUser } from '@/lib/auth';
import type { AuthUser } from '@/types/auth.types';

const AuthStateCtx    = createContext<AuthState>(initialAuthState);
const AuthDispatchCtx = createContext<Dispatch<AuthAction>>(() => {});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  /** Hydrate from localStorage on first render */
  useEffect(() => {
    const token = getToken();
    const user  = getStoredUser<AuthUser>();
    dispatch({
      type: 'auth/init',
      payload: token && user ? { user, token } : null,
    });
  }, []);

  return (
    <AuthStateCtx.Provider value={state}>
      <AuthDispatchCtx.Provider value={dispatch}>
        {children}
      </AuthDispatchCtx.Provider>
    </AuthStateCtx.Provider>
  );
}

export const useAuthState    = () => useContext(AuthStateCtx);
export const useAuthDispatch = () => useContext(AuthDispatchCtx);
