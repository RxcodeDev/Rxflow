'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getToken, clearAuth, setToken, saveUser } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const fieldCls =
  'border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent ' +
  'text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none ' +
  'focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full';

type InviteInfo = {
  licenseId: string;
  licenseName: string;
  role: string;
  roleType: string | null;
  expiresAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export default function InvitarPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [info,         setInfo]         = useState<InviteInfo | null>(null);
  const [infoError,    setInfoError]     = useState('');
  const [loading,      setLoading]       = useState(true);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);

  const [name,         setName]          = useState('');
  const [email,        setEmail]         = useState('');
  const [password,     setPassword]      = useState('');
  const [submitting,   setSubmitting]    = useState(false);
  const [formError,    setFormError]     = useState('');

  useEffect(() => {
    // If the user already has a session, warn them
    if (getToken()) {
      setAlreadyLoggedIn(true);
    }

    async function load() {
      try {
        const res = await fetch(`${BASE_URL}/invites/${token}`);
        const json = await res.json() as { ok: boolean; data: InviteInfo; message?: string };
        if (!res.ok) throw new Error(json.message ?? 'Invitación no válida');
        setInfo(json.data);
      } catch (err: unknown) {
        setInfoError(err instanceof Error ? err.message : 'Invitación no válida o expirada');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  function handleLogoutAndContinue() {
    clearAuth();
    setAlreadyLoggedIn(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError('Todos los campos son obligatorios');
      return;
    }
    if (password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const json = await res.json() as { ok: boolean; data: { user: object; access_token: string }; message?: string };
      if (!res.ok) throw new Error(json.message ?? 'Error al crear la cuenta');

      // Set new session and hard-reload so AuthContext re-initializes from scratch
      setToken(json.data.access_token);
      saveUser(json.data.user);
      window.location.href = '/inicio';
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al crear la cuenta');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-hover)] p-4">
      <div className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-xl w-full max-w-sm p-8 flex flex-col gap-6">

        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="w-10 h-10 rounded-xl bg-[var(--c-text)] flex items-center justify-center mb-1">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--c-bg)" strokeWidth="2" fill="none" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[var(--c-text)]">Rxflow</h1>
        </div>

        {/* Already logged in warning */}
        {alreadyLoggedIn && !loading && info && (
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-hover)]">
            <p className="text-[13px] text-[var(--c-text-sub)] text-center">
              Ya tienes una sesión activa. Para aceptar esta invitación como nueva cuenta debes cerrar sesión primero.
            </p>
            <div className="flex gap-2">
              <a
                href="/inicio"
                className="flex-1 text-center border border-[var(--c-border)] rounded-lg py-2 text-[13px] text-[var(--c-text-sub)] hover:bg-[var(--c-bg)] transition-colors font-[inherit]"
              >
                Ir al inicio
              </a>
              <button
                type="button"
                onClick={handleLogoutAndContinue}
                className="flex-1 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-[13px] font-semibold hover:opacity-80 transition-opacity cursor-pointer border-none font-[inherit]"
              >
                Cerrar sesión y continuar
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            <div className="h-4 bg-[var(--c-hover)] rounded animate-pulse" />
            <div className="h-4 bg-[var(--c-hover)] rounded animate-pulse w-3/4" />
          </div>
        )}

        {!loading && infoError && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--c-hover)] flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--c-danger)" strokeWidth="2" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--c-text)]">Enlace no válido</p>
              <p className="text-[13px] text-[var(--c-muted)] mt-1">{infoError}</p>
            </div>
            <a
              href="/login"
              className="text-[13px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors underline underline-offset-2"
            >
              Ir al inicio de sesión
            </a>
          </div>
        )}

        {!loading && info && !alreadyLoggedIn && (
          <>
            {/* Invite summary */}
            <div className="flex flex-col gap-1.5 text-center">
              <p className="text-[13px] text-[var(--c-text-sub)]">Te han invitado a unirte a</p>
              <p className="font-bold text-[var(--c-text)] text-base">{info.licenseName}</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--c-hover)] border border-[var(--c-border)] text-[var(--c-text-sub)]">
                  {ROLE_LABEL[info.role] ?? info.role}
                </span>
                {info.roleType && (
                  <span className="text-[11px] text-[var(--c-muted)]">{info.roleType}</span>
                )}
              </div>
            </div>

            <hr className="border-[var(--c-line)]" />

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Nombre completo</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ana García"
                  className={fieldCls}
                  autoFocus
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.io"
                  className={fieldCls}
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={fieldCls}
                  autoComplete="new-password"
                />
              </div>

              {formError && (
                <p className="text-[12px] text-[var(--c-danger)]">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none font-[inherit] mt-1"
              >
                {submitting ? 'Creando cuenta…' : 'Crear cuenta y unirme'}
              </button>
            </form>

            <p className="text-center text-[12px] text-[var(--c-muted)]">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors underline underline-offset-2">
                Inicia sesión
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
