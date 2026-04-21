export const TOKEN_KEY = 'rxflow_token';
export const USER_KEY  = 'rxflow_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  // Also set a cookie so Next.js middleware can read it
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `rxflow_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'rxflow_token=; path=/; max-age=0; SameSite=Strict';
}

export function saveUser(user: object): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function clearAuth(): void {
  removeToken();
  localStorage.removeItem(USER_KEY);
}
