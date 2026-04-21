'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeCtxValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeCtx = createContext<ThemeCtxValue>({
  theme: 'system',
  setTheme: () => {},
});

function applyTheme(t: Theme) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const resolved =
    t === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : t;
  root.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  /* Hydrate from localStorage once */
  useEffect(() => {
    const stored = localStorage.getItem('rxflow_theme') as Theme | null;
    const initial: Theme =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  /* React to changes and persist */
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('rxflow_theme', theme);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
