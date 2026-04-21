'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

/* ── Palette of allowed avatar colors (bg / text pairs) ── */
const PALETTE: { bg: string; fg: string }[] = [
  { bg: '#111111', fg: '#ffffff' },
  { bg: '#374151', fg: '#ffffff' },
  { bg: '#1d4ed8', fg: '#ffffff' },
  { bg: '#7c3aed', fg: '#ffffff' },
  { bg: '#db2777', fg: '#ffffff' },
  { bg: '#dc2626', fg: '#ffffff' },
  { bg: '#ea580c', fg: '#ffffff' },
  { bg: '#ca8a04', fg: '#ffffff' },
  { bg: '#16a34a', fg: '#ffffff' },
  { bg: '#0891b2', fg: '#ffffff' },
];

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <p className="text-sm font-medium text-[var(--c-text)]">{label}</p>
      {children}
    </div>
  );
}

export default function PerfilPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── profile state ── */
  const [name,          setName]          = useState('');
  const [email,         setEmail]         = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [avatarColor,   setAvatarColor]   = useState<string>('#111111');
  const [colorChanged,  setColorChanged]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [status,        setStatus]        = useState<'idle' | 'ok' | 'error'>('idle');
  const [errMsg,        setErrMsg]        = useState('');

  /* ── password state ── */
  const [currentPwd,   setCurrentPwd]   = useState('');
  const [newPwd,       setNewPwd]       = useState('');
  const [confirmPwd,   setConfirmPwd]   = useState('');
  const [pwdSaving,    setPwdSaving]    = useState(false);
  const [pwdStatus,    setPwdStatus]    = useState<'idle' | 'ok' | 'error'>('idle');
  const [pwdErrMsg,    setPwdErrMsg]    = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarPreview(user.avatar_url ?? null);
      setAvatarColor(user.avatar_color ?? '#111111');
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = user
    ? (name !== user.name || email !== user.email || avatarChanged || colorChanged)
    : false;

  /* ── file upload ── */
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrMsg('La imagen no puede superar 2 MB');
      setStatus('error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
      setAvatarChanged(true);
      setStatus('idle');
      setErrMsg('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null);
    setAvatarChanged(true);
    setStatus('idle');
  }

  function handlePickColor(bg: string) {
    setAvatarColor(bg);
    setColorChanged(true);
    setStatus('idle');
  }

  /* ── save profile ── */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty || saving) return;
    setSaving(true);
    setStatus('idle');
    setErrMsg('');
    try {
      await updateProfile({
        name:         name.trim(),
        email:        email.trim(),
        avatar_url:   avatarChanged ? (avatarPreview ?? null) : undefined,
        avatar_color: colorChanged  ? avatarColor             : undefined,
      });
      setAvatarChanged(false);
      setColorChanged(false);
      setStatus('ok');
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Error al guardar');
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  /* ── change password ── */
  async function handlePwdSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdErrMsg('Las contraseñas no coinciden');
      setPwdStatus('error');
      return;
    }
    if (newPwd.length < 8) {
      setPwdErrMsg('La contraseña debe tener al menos 8 caracteres');
      setPwdStatus('error');
      return;
    }
    setPwdSaving(true);
    setPwdStatus('idle');
    setPwdErrMsg('');
    try {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setPwdStatus('ok');
    } catch (err: unknown) {
      setPwdErrMsg(err instanceof Error ? err.message : 'Error al cambiar contraseña');
      setPwdStatus('error');
    } finally {
      setPwdSaving(false);
    }
  }

  /* ── helpers ── */
  const fgForColor = PALETTE.find(p => p.bg === avatarColor)?.fg ?? '#ffffff';

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <h1 className="text-2xl font-bold text-[var(--c-text)]">Mi perfil</h1>

      {/* ── Profile form ── */}
      <form onSubmit={handleSave}>
        <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden divide-y divide-[var(--c-line)]">

          {/* Avatar row */}
          <div className="flex items-start gap-4 px-4 py-4">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="shrink-0 w-14 h-14 rounded-full object-cover border border-[var(--c-border)]"
              />
            ) : (
              <div
                className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
                style={{ background: avatarColor, color: fgForColor }}
                aria-hidden="true"
              >
                {user?.initials ?? '?'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-[var(--c-text)]">{user?.name ?? '—'}</p>
              <p className="text-[12px] text-[var(--c-muted)] mt-0.5 mb-2 capitalize">{user?.role ?? '—'}</p>

              {/* Color picker — only when no image */}
              {!avatarPreview && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PALETTE.map(({ bg }) => (
                    <button
                      key={bg}
                      type="button"
                      title={bg}
                      onClick={() => handlePickColor(bg)}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        background: bg,
                        borderColor: avatarColor === bg ? 'var(--c-text)' : 'transparent',
                      }}
                      aria-pressed={avatarColor === bg}
                    />
                  ))}
                </div>
              )}

              {/* File buttons */}
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFile}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors font-[inherit] cursor-pointer"
                >
                  {avatarPreview ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-danger)] hover:bg-[var(--c-hover)] transition-colors font-[inherit] cursor-pointer"
                  >
                    Quitar foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <FieldRow label="Nombre completo">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              className="w-52 border border-[var(--c-border)] rounded-lg px-3 py-1.5 text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
            />
          </FieldRow>

          {/* Correo */}
          <FieldRow label="Correo electrónico">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={120}
              className="w-52 border border-[var(--c-border)] rounded-lg px-3 py-1.5 text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
            />
          </FieldRow>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--c-text)] text-[var(--c-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity font-[inherit]"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {status === 'ok' && (
            <span className="text-[12px] text-[var(--c-text-sub)] flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                   strokeLinecap="round" strokeLinejoin="round" width={13} height={13} aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Guardado correctamente
            </span>
          )}
          {status === 'error' && (
            <span className="text-[12px] text-[var(--c-danger)]">{errMsg}</span>
          )}
        </div>
      </form>

      {/* ── Change password ── */}
      <form onSubmit={handlePwdSave}>
        <h2 className="text-base font-semibold text-[var(--c-text)] mb-3">Cambiar contraseña</h2>
        <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden divide-y divide-[var(--c-line)]">
          <FieldRow label="Contraseña actual">
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              autoComplete="current-password"
              className="w-52 border border-[var(--c-border)] rounded-lg px-3 py-1.5 text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
            />
          </FieldRow>
          <FieldRow label="Nueva contraseña">
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-52 border border-[var(--c-border)] rounded-lg px-3 py-1.5 text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
            />
          </FieldRow>
          <FieldRow label="Confirmar contraseña">
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-52 border border-[var(--c-border)] rounded-lg px-3 py-1.5 text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
            />
          </FieldRow>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--c-text)] text-[var(--c-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity font-[inherit]"
          >
            {pwdSaving ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
          {pwdStatus === 'ok' && (
            <span className="text-[12px] text-[var(--c-text-sub)] flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                   strokeLinecap="round" strokeLinejoin="round" width={13} height={13} aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Contraseña actualizada
            </span>
          )}
          {pwdStatus === 'error' && (
            <span className="text-[12px] text-[var(--c-danger)]">{pwdErrMsg}</span>
          )}
        </div>
      </form>
    </div>
  );
}
