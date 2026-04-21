'use client';

import { useRouter } from 'next/navigation';
import { useAuthState, useAuthDispatch } from '@/store/AuthContext';
import { apiPost, apiPatch } from '@/lib/api';
import { setToken, saveUser, clearAuth } from '@/lib/auth';
import type { LoginCredentials, RegisterCredentials, AuthApiResponse, AuthUser } from '@/types/auth.types';
import type { ApiWrapped } from '@/types/api.types';

export function useAuth() {
  const state = useAuthState();
  const dispatch = useAuthDispatch();
  const router = useRouter();

  async function login(credentials: LoginCredentials) {
    const res = await apiPost<AuthApiResponse>('/auth/login', credentials);
    setToken(res.data.access_token);
    saveUser(res.data.user);
    dispatch({ type: 'auth/login', payload: { user: res.data.user, token: res.data.access_token } });
    router.push('/inicio');
  }

  async function register(credentials: RegisterCredentials) {
    const res = await apiPost<AuthApiResponse>('/auth/register', credentials);
    setToken(res.data.access_token);
    saveUser(res.data.user);
    dispatch({ type: 'auth/login', payload: { user: res.data.user, token: res.data.access_token } });
    router.push('/inicio');
  }

  function logout() {
    clearAuth();
    dispatch({ type: 'auth/logout' });
    router.push('/login');
  }

  async function updateProfile(dto: { name: string; email: string; avatar_url?: string | null; avatar_color?: string | null }) {
    if (!state.user) throw new Error('No hay usuario autenticado');
    const res = await apiPatch<ApiWrapped<AuthUser>>(`/users/${state.user.id}`, dto);
    const updated: AuthUser = { ...state.user, ...res.data };
    saveUser(updated);
    dispatch({ type: 'auth/update', payload: updated });
    return updated;
  }

  async function changePassword(dto: { currentPassword: string; newPassword: string }) {
    if (!state.user) throw new Error('No hay usuario autenticado');
    await apiPost(`/users/${state.user.id}/change-password`, dto);
  }

  return {
    user: state.user,
    token: state.token,
    initialized: state.initialized,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };
}
