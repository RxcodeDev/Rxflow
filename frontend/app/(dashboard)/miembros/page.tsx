'use client';

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { MemberItem, ApiWrapped } from '@/types/api.types';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { playDelete, playSuccess } from '@/hooks/useSound';

const STATUS_COLOR: Record<string, string> = {
  online:  'bg-green-400',
  away:    'bg-yellow-400',
  offline: 'bg-[var(--c-border)]',
};

const ROLES = ['member', 'admin', 'Tech Lead', 'Backend Dev', 'Frontend Dev', 'Full Stack Dev', 'Designer', 'Product Manager'];

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

const fieldCls =
  'border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent ' +
  'text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none ' +
  'focus:border-[var(--c-text-sub)] transition-colors font-[inherit]';

/* ── Kebab menu per member ── */
function MemberMenu({
  memberId,
  member,
  onRequestDelete,
  onRequestEdit,
}: {
  memberId: string;
  member: MemberItem;
  onRequestDelete: (id: string) => void;
  onRequestEdit: (m: MemberItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="p-1.5 rounded hover:bg-[var(--c-hover)] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
        aria-label="Opciones"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 9999 }}
          className="min-w-[160px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg py-1 text-sm"
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onRequestEdit(member); }}
            className="w-full text-left px-4 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
          >
            Editar miembro
          </button>
          <hr className="border-[var(--c-line)] mx-2 my-1" />
          <button
            type="button"
            onClick={() => { setOpen(false); onRequestDelete(memberId); }}
            className="w-full text-left px-4 py-2 text-[var(--c-danger)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer"
          >
            Eliminar miembro
          </button>
        </div>
      )}
    </>
  );
}

/* ── Edit member modal ── */
function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: MemberItem;
  onClose: () => void;
  onSaved: (updated: MemberItem) => void;
}) {
  const [name,       setName]       = useState(member.name);
  const [email,      setEmail]      = useState(member.email);
  const [role,       setRole]       = useState(member.role ?? 'member');
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim())  { setError('El nombre es requerido'); return; }
    if (!email.trim()) { setError('El correo es requerido'); return; }
    setSubmitting(true);
    try {
      const res = await apiPatch<ApiWrapped<MemberItem>>(`/users/${member.id}`, {
        name: name.trim(),
        email: email.trim(),
        role,
      });
      playSuccess();
      onSaved(res.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el miembro');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[var(--c-text)]">Editar miembro</h2>
          <button type="button" onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] cursor-pointer bg-transparent border-none">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Nombre completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan García" className={fieldCls} autoFocus />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@empresa.io" className={fieldCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldCls}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-[12px] text-[var(--c-danger)]">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-[var(--c-border)] rounded-lg py-2 text-sm text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit]">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none font-[inherit]">
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Add member modal (Crear / Invitar) ── */
type ModalMode = 'crear' | 'invitar';

function AddMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode,       setMode]       = useState<ModalMode>('crear');
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [role,       setRole]       = useState('member');
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function switchMode(m: ModalMode) {
    setMode(m); setError(''); setInviteSent(false);
    setName(''); setEmail(''); setPassword(''); setRole('member');
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) { setError('Todos los campos son obligatorios'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setSubmitting(true);
    try {
      await apiPost('/users', { name: name.trim(), email: email.trim(), password, role });
      playSuccess();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el miembro');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('El correo es obligatorio'); return; }
    setSubmitting(true);
    try {
      await apiPost('/users/invite', { email: email.trim() });
      playSuccess();
      setInviteSent(true);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar la invitación');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={inviteSent ? undefined : onClose}>
      <div
        className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--c-text)]">Añadir miembro</h2>
          <button type="button" onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] cursor-pointer bg-transparent border-none">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-[var(--c-hover)] rounded-lg mb-4">
          {(['crear', 'invitar'] as ModalMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={
                'flex-1 py-1.5 text-[13px] font-medium rounded-md transition-colors cursor-pointer border-none font-[inherit] capitalize ' +
                (mode === m
                  ? 'bg-[var(--c-bg)] text-[var(--c-text)] shadow-sm'
                  : 'text-[var(--c-text-sub)] hover:text-[var(--c-text)] bg-transparent')
              }
            >
              {m === 'crear' ? 'Crear cuenta' : 'Invitar'}
            </button>
          ))}
        </div>

        {/* Success state (Invitar) */}
        {inviteSent ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 bg-[var(--c-hover)] rounded-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--c-text)] mt-0.5 shrink-0" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Invitación enviada</p>
                <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5">
                  Se ha enviado un correo a <strong>{email}</strong> con las credenciales de acceso.
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="w-full bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-sm font-semibold hover:opacity-80 transition-opacity cursor-pointer border-none font-[inherit]">
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={mode === 'crear' ? handleCrear : handleInvitar} noValidate className="flex flex-col gap-3">
            {mode === 'crear' && (
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Nombre completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan García" className={fieldCls} autoFocus />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@empresa.io" className={fieldCls} autoFocus={mode === 'invitar'} />
            </div>
            {mode === 'crear' && (
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={fieldCls} />
              </div>
            )}
            {mode === 'crear' && (
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldCls}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            {mode === 'invitar' && (
              <p className="text-[11px] text-[var(--c-muted)]">
                Se enviará un correo con las credenciales de acceso.
              </p>
            )}
            {error && <p className="text-[12px] text-[var(--c-danger)]">{error}</p>}
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-[var(--c-border)] rounded-lg py-2 text-sm text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit]">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none font-[inherit]">
                {submitting ? '…' : mode === 'crear' ? 'Crear' : 'Invitar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function MiembrosPage() {
  const [members,        setMembers]        = useState<MemberItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showAdd,        setShowAdd]        = useState(false);
  const [editMember,     setEditMember]     = useState<MemberItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function loadMembers() {
    setLoading(true);
    apiGet<ApiWrapped<MemberItem[]>>('/users')
      .then((res) => setMembers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadMembers(); }, []);

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/users/${id}`);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      playDelete();
    } catch (err) {
      console.error(err);
    }
  }

  function handleSaved(updated: MemberItem) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
  }

  return (
    <div className="flex flex-col gap-5">
      {showAdd && (
        <AddMemberModal onClose={() => setShowAdd(false)} onSuccess={loadMembers} />
      )}
      {editMember && (
        <EditMemberModal member={editMember} onClose={() => setEditMember(null)} onSaved={handleSaved} />
      )}
      <ConfirmModal
        open={pendingDeleteId !== null}
        title="Eliminar miembro"
        message="El miembro será eliminado del equipo y perderá acceso al sistema."
        onConfirm={() => { if (pendingDeleteId) handleDelete(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Miembros</h1>
          <p className="text-[13px] text-[var(--c-text-sub)] mt-0.5">
            {loading ? '...' : `${members.length} miembros en el equipo`}
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)}
          className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-3 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]">
          + Añadir miembro
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      )}

      {/* Mobile: cards */}
      {!loading && (
        <div className="flex flex-col gap-3 md:hidden">
          {members.map((m) => (
            <div key={m.id} className="border border-[var(--c-border)] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] font-semibold text-sm flex items-center justify-center">
                    {m.initials}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--c-bg)] ${STATUS_COLOR[m.presence_status] ?? STATUS_COLOR.offline}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[var(--c-text)]">{m.name}</p>
                  <p className="text-[12px] text-[var(--c-text-sub)] capitalize">{m.role}</p>
                </div>
                {m.last_seen_at && (
                  <span className="ml-auto text-[11px] text-[var(--c-muted)]">
                    {new Date(m.last_seen_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <MemberMenu memberId={m.id} member={m} onRequestDelete={setPendingDeleteId} onRequestEdit={setEditMember} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(m.projects as string[]).map((p) => (
                  <span key={p} className="text-[11px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5">{p}</span>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-[var(--c-muted)]">{m.tasks_open} tareas abiertas</p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop: table */}
      {!loading && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--c-border)]">
                {['Miembro', 'Rol', 'Proyectos', 'Tareas abiertas', 'Última actividad', ''].map((col) => (
                  <th key={col} className="text-left text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] pb-2 pr-6 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-[var(--c-line)] hover:bg-[var(--c-hover)] transition-colors">
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[11px] font-semibold flex items-center justify-center">
                          {m.initials}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-[var(--c-bg)] ${STATUS_COLOR[m.presence_status] ?? STATUS_COLOR.offline}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--c-text)]">{m.name}</p>
                        <p className="text-[11px] text-[var(--c-muted)]">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-6 text-[13px] text-[var(--c-text-sub)] whitespace-nowrap capitalize">{m.role}</td>
                  <td className="py-3 pr-6">
                    <div className="flex flex-wrap gap-1">
                      {(m.projects as string[]).map((p) => (
                        <span key={p} className="text-[11px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-6 text-[13px] text-[var(--c-text-sub)] tabular-nums">{m.tasks_open}</td>
                  <td className="py-3 pr-6 text-[13px] text-[var(--c-muted)] whitespace-nowrap">
                    {m.last_seen_at
                      ? new Date(m.last_seen_at).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : m.presence_status}
                  </td>
                  <td className="py-3">
                    <MemberMenu memberId={m.id} member={m} onRequestDelete={setPendingDeleteId} onRequestEdit={setEditMember} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
