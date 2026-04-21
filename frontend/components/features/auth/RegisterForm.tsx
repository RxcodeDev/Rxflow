'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const BrandIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

const UserIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export interface RegisterFormProps {
  onSubmit?: (name: string, email: string, password: string) => Promise<void>;
  error?: string;
}

export default function RegisterForm({ onSubmit, error }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (!name) errs.name = 'El nombre es requerido';
    if (!email) errs.email = 'El correo es requerido';
    if (!password || password.length < 8) errs.password = 'Mínimo 8 caracteres';
    if (password !== confirm) errs.confirm = 'Las contraseñas no coinciden';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await onSubmit?.(name, email, password);
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
          Crear cuenta
        </h1>
        <p className="text-[0.8125rem] text-[var(--c-muted)] text-center mb-[1.75rem]">
          Completa los datos para comenzar
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
            id="name"
            type="text"
            label="Nombre completo"
            placeholder="Carlos García"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<UserIcon />}
            error={fieldErrors.name}
          />

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
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<LockIcon />}
            error={fieldErrors.password}
          />

          <Input
            id="confirm"
            type="password"
            label="Confirmar contraseña"
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            icon={<LockIcon />}
            error={fieldErrors.confirm}
          />

          <Button type="submit" loading={loading} className="mt-1">
            Crear cuenta
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-[0.8125rem] text-[var(--c-muted)] mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/auth/login"
            className="text-[var(--c-text-sub)] font-semibold no-underline hover:text-[var(--c-text)] transition-colors"
          >
            Inicia sesión
          </Link>
        </p>

      </div>
    </main>
  );
}
