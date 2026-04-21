'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

/* ── Gantt-chart brand icon (from Figma) ────────────── */
const BrandIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <line x1="3" y1="3" x2="3" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="5" y="5" width="9" height="3" rx="1.5" fill="currentColor" />
    <rect x="8" y="10" width="11" height="3" rx="1.5" fill="currentColor" />
    <rect x="5" y="15" width="7" height="3" rx="1.5" fill="currentColor" />
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>;
  error?: string;
}

export default function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: { email?: string; password?: string } = {};
    if (!email) errs.email = 'El correo es requerido';
    if (!password) errs.password = 'La contraseña es requerida';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await onSubmit?.(email, password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[var(--c-bg)] px-6 py-6">
      <div className="w-full max-w-[22rem] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-[1.25rem] px-[1.75rem] pt-8 pb-[1.75rem]">

        {/* Brand */}
        <div className="flex justify-center mb-[1.75rem]">
          <div className="flex items-center gap-[0.375rem]">
            <span className="text-[var(--c-text)]">
              <BrandIcon />
            </span>
            <span className="text-[1.375rem] font-[800] tracking-[-0.03em] text-[var(--c-text)]">
              Rxflow
            </span>
          </div>
        </div>

        {/* Header */}
        <h1 className="text-[1.125rem] font-bold text-[var(--c-text)] text-center mb-1">
          Bienvenido de nuevo
        </h1>
        <p className="text-[0.8125rem] text-[var(--c-muted)] text-center mb-[1.75rem]">
          Ingresa tus credenciales para continuar
        </p>

        {/* Global error */}
        {error && (
          <p className="text-[0.8125rem] text-[var(--c-danger)] text-center mb-4 px-2">
            {error}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            id="email"
            type="email"
            label="Correo electrónico"
            placeholder="carlos@empresa.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<EmailIcon />}
            error={fieldErrors.email}
          />

          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<LockIcon />}
            error={fieldErrors.password}
          />

          <div className="flex justify-end -mt-1">
            <Link
              href="/auth/forgot-password"
              className="text-[0.75rem] text-[var(--c-muted)] no-underline hover:text-[var(--c-text-sub)] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="mt-1">
            Iniciar sesión
          </Button>
        </form>

        {/* Divider */}
        <div
          className="flex items-center gap-3 my-1"
          aria-hidden="true"
        >
          <span className="flex-1 h-px bg-[var(--c-line)]" />
          <span className="text-[0.6875rem] text-[var(--c-muted)] whitespace-nowrap">o</span>
          <span className="flex-1 h-px bg-[var(--c-line)]" />
        </div>

        {/* Footer */}
        <p className="text-center text-[0.8125rem] text-[var(--c-muted)] mt-5">
          ¿No tienes cuenta?{' '}
          <Link
            href="/auth/register"
            className="text-[var(--c-text-sub)] font-semibold no-underline hover:text-[var(--c-text)] transition-colors"
          >
            Regístrate
          </Link>
        </p>

      </div>
    </main>
  );
}
