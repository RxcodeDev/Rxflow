'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  ApiWrapped,
  LicenseMemberAccess,
  LicenseMemberAccessWorkspace,
  LicenseMemberAccessProject,
} from '@/types/api.types';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SearchSelect, { type SelectOption } from '@/components/ui/SearchSelect';
import Tooltip from '@/components/ui/Tooltip';
import { playDelete, playSuccess } from '@/hooks/useSound';
import { useAuth } from '@/hooks/useAuth';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  online:  'bg-green-400',
  away:    'bg-yellow-400',
  offline: 'bg-[var(--c-border)]',
};

const LICENSE_ROLE_OPTIONS: SelectOption[] = [
  { value: 'owner',  label: 'Owner'  },
  { value: 'admin',  label: 'Admin'  },
  { value: 'member', label: 'Member' },
];

const LICENSE_ROLE_LABEL: Record<string, string> = {
  owner:  'Owner',
  admin:  'Admin',
  member: 'Member',
};

type PermRow = { label: string; owner: boolean; admin: boolean; member: boolean };

const PERMISSION_MATRIX: PermRow[] = [
  { label: 'Configurar la cuenta',       owner: true,  admin: false, member: false },
  { label: 'Cambiar plan / facturación',  owner: true,  admin: false, member: false },
  { label: 'Invitar miembros',            owner: true,  admin: true,  member: false },
  { label: 'Eliminar miembros',           owner: true,  admin: false, member: false },
  { label: 'Cambiar roles',               owner: true,  admin: false, member: false },
  { label: 'Crear / eliminar workspaces', owner: true,  admin: true,  member: false },
  { label: 'Crear / archivar proyectos',  owner: true,  admin: true,  member: false },
  { label: 'Acceso completo sin asignar', owner: true,  admin: false, member: false },
  { label: 'Ver proyectos asignados',     owner: true,  admin: true,  member: true  },
  { label: 'Crear y editar tareas',       owner: true,  admin: true,  member: true  },
  { label: 'Comentar en tareas',          owner: true,  admin: true,  member: true  },
];

/* ── Small helpers ─────────────────────────────────────────────────────────── */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

function Avatar({
  member,
  size = 'md',
}: {
  member: Pick<LicenseMemberAccess, 'avatar_url' | 'avatar_color' | 'initials' | 'name'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const cls = size === 'sm' ? 'w-8 h-8 text-[11px]' : size === 'lg' ? 'w-12 h-12 text-base' : size === 'xl' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${cls} rounded-full font-semibold flex items-center justify-center overflow-hidden flex-shrink-0`}
      style={
        !member.avatar_url && member.avatar_color
          ? { background: member.avatar_color }
          : { background: 'var(--c-hover)' }
      }
    >
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span style={member.avatar_color ? { color: '#fff' } : { color: 'var(--c-text-sub)' }}>
          {member.initials}
        </span>
      )}
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const base = 'text-[10px] font-semibold px-1.5 py-0.5 rounded-md';
  if (role === 'owner')
    return <span className={`${base} bg-[var(--c-text)] text-[var(--c-bg)]`}>Owner</span>;
  if (role === 'admin')
    return <span className={`${base} bg-[var(--c-hover)] text-[var(--c-text-sub)] border border-[var(--c-border)]`}>Admin</span>;
  return null;
}

/* ── Manage positions modal ────────────────────────────────────────────────── */

type Position = { id: string; name: string };

const SUGGESTED_POSITIONS = [
  {
    label: 'Tecnología',
    items: ['Tech Lead', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'DevOps Engineer', 'QA Engineer', 'Data Engineer', 'Data Scientist', 'Scrum Master', 'Engineering Manager'],
  },
  {
    label: 'Diseño & Creativo',
    items: ['UI/UX Designer', 'Product Designer', 'Graphic Designer', 'Creative Director', 'Motion Designer', 'Content Writer'],
  },
  {
    label: 'Producto & Negocio',
    items: ['Product Manager', 'Product Owner', 'Project Manager', 'Business Analyst', 'Operations Manager'],
  },
  {
    label: 'Liderazgo',
    items: ['CEO', 'CTO', 'COO', 'CFO', 'CMO'],
  },
  {
    label: 'Marketing & Ventas',
    items: ['Marketing Manager', 'Social Media Manager', 'Sales Manager', 'Account Manager', 'SEO Specialist'],
  },
  {
    label: 'Soporte & RR.HH.',
    items: ['HR Manager', 'Recruiter', 'Customer Support', 'IT Support'],
  },
];

function CatCheckbox({ status }: { status: 'all' | 'some' | 'none' }) {
  return (
    <div
      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
        status !== 'none'
          ? 'bg-[var(--c-text)] border-[var(--c-text)]'
          : 'border-[var(--c-border)] bg-transparent'
      }`}
    >
      {status === 'all' && (
        <svg viewBox="0 0 24 24" width="10" height="10" stroke="var(--c-bg)" strokeWidth="3" fill="none" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {status === 'some' && (
        <svg viewBox="0 0 24 24" width="10" height="10" stroke="var(--c-bg)" strokeWidth="3" fill="none" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  );
}

function ManagePositionsModal({
  licenseId,
  positions,
  onClose,
  onUpdate,
}: {
  licenseId: string;
  positions: Position[];
  onClose: () => void;
  onUpdate: (positions: Position[]) => void;
}) {
  const [list,     setList]     = useState<Position[]>(positions);
  const [newName,  setNewName]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function isAdded(name: string) {
    return list.some((p) => p.name === name);
  }

  function catStatus(cat: (typeof SUGGESTED_POSITIONS)[0]): 'all' | 'some' | 'none' {
    const n = cat.items.filter(isAdded).length;
    if (n === cat.items.length) return 'all';
    if (n > 0) return 'some';
    return 'none';
  }

  function toggleExpanded(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  async function handleAddCustom() {
    const name = newName.trim();
    if (!name || isAdded(name)) { setNewName(''); return; }
    setSaving(true);
    setError('');
    try {
      const res = await apiPost<ApiWrapped<Position>>(`/licenses/${licenseId}/positions`, { name });
      const updated = [...list, res.data].sort((a, b) => a.name.localeCompare(b.name));
      setList(updated);
      onUpdate(updated);
      setNewName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al añadir cargo');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleName(name: string) {
    const pos = list.find((p) => p.name === name);
    if (pos) {
      try {
        await apiDelete(`/licenses/${licenseId}/positions/${pos.id}`);
        const updated = list.filter((p) => p.id !== pos.id);
        setList(updated);
        onUpdate(updated);
      } catch (err) { console.error(err); }
    } else {
      try {
        const res = await apiPost<ApiWrapped<Position>>(`/licenses/${licenseId}/positions`, { name });
        const updated = [...list, res.data].sort((a, b) => a.name.localeCompare(b.name));
        setList(updated);
        onUpdate(updated);
      } catch (err) { console.error(err); }
    }
  }

  async function handleToggleCategory(cat: (typeof SUGGESTED_POSITIONS)[0]) {
    const status = catStatus(cat);
    setSaving(true);
    try {
      if (status === 'all') {
        const toRemove = list.filter((p) => cat.items.includes(p.name));
        await Promise.all(toRemove.map((p) => apiDelete(`/licenses/${licenseId}/positions/${p.id}`)));
        const removedIds = new Set(toRemove.map((p) => p.id));
        const updated = list.filter((p) => !removedIds.has(p.id));
        setList(updated);
        onUpdate(updated);
      } else {
        const toAdd = cat.items.filter((name) => !isAdded(name));
        const results = await Promise.all(
          toAdd.map((name) => apiPost<ApiWrapped<Position>>(`/licenses/${licenseId}/positions`, { name })),
        );
        const updated = [...list, ...results.map((r) => r.data)].sort((a, b) => a.name.localeCompare(b.name));
        setList(updated);
        onUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '84dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-line)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--c-text)]">Gestionar cargos</h2>
            {list.length > 0 && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--c-hover)] text-[var(--c-muted)]">
                {list.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--c-muted)] hover:text-[var(--c-text)] cursor-pointer bg-transparent border-none"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Active chips — compact fixed zone */}
        <div className="px-6 py-3 border-b border-[var(--c-line)] flex-shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-2">
            Cargos activos
          </p>
          {list.length === 0 ? (
            <p className="text-[12px] text-[var(--c-muted)]">Sin cargos. Usa las sugerencias de abajo.</p>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-[4.5rem] overflow-y-auto">
              {list.map((pos) => (
                <span
                  key={pos.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-[var(--c-hover)] border border-[var(--c-border)] rounded-full text-[11px] text-[var(--c-text)]"
                >
                  {pos.name}
                  <button
                    type="button"
                    onClick={() => handleToggleName(pos.name)}
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-danger)] transition-colors cursor-pointer border-none bg-transparent"
                    aria-label={`Quitar ${pos.name}`}
                  >
                    <svg viewBox="0 0 24 24" width="8" height="8" stroke="currentColor" strokeWidth="2.5" fill="none" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Custom add input */}
        <div className="px-6 py-3 border-b border-[var(--c-line)] flex-shrink-0">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); }}
              placeholder="Cargo personalizado…"
              className="flex-1 border border-[var(--c-border)] rounded-lg px-3 py-1.5 text-sm bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={saving || !newName.trim()}
              className="px-4 py-1.5 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none whitespace-nowrap font-[inherit]"
            >
              Añadir
            </button>
          </div>
          {error && <p className="text-[11px] text-[var(--c-danger)] mt-1">{error}</p>}
        </div>

        {/* Category accordion — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)] px-6 pt-3 pb-2">
            Sugeridas por industria
          </p>
          {SUGGESTED_POSITIONS.map((cat) => {
            const status   = catStatus(cat);
            const count    = cat.items.filter(isAdded).length;
            const isOpen   = expanded.has(cat.label);

            return (
              <div key={cat.label} className="border-t border-[var(--c-line)]">
                {/* Row header */}
                <div className="flex items-center gap-3 px-6 py-2.5">
                  {/* Master checkbox */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => { e.stopPropagation(); handleToggleCategory(cat); }}
                    className="flex-shrink-0 cursor-pointer bg-transparent border-none p-0 disabled:opacity-50"
                    aria-label={`Seleccionar todo ${cat.label}`}
                  >
                    <CatCheckbox status={status} />
                  </button>

                  {/* Expand trigger */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(cat.label)}
                    className="flex-1 flex items-center justify-between text-left cursor-pointer bg-transparent border-none font-[inherit] py-0.5"
                  >
                    <span className="text-sm text-[var(--c-text)]">{cat.label}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-[var(--c-muted)]">{count}/{cat.items.length}</span>
                      <svg
                        viewBox="0 0 24 24" width="14" height="14"
                        stroke="currentColor" strokeWidth="2" fill="none"
                        className={`text-[var(--c-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>
                </div>

                {/* Individual checkboxes — 2-col grid */}
                {isOpen && (
                  <div className="px-6 pb-3 grid grid-cols-2 gap-y-0.5 gap-x-4">
                    {cat.items.map((item) => {
                      const checked = isAdded(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          disabled={saving}
                          onClick={() => handleToggleName(item)}
                          className="flex items-center gap-2 py-1.5 text-left cursor-pointer bg-transparent border-none font-[inherit] group disabled:opacity-50"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              checked
                                ? 'bg-[var(--c-text)] border-[var(--c-text)]'
                                : 'border-[var(--c-border)] group-hover:border-[var(--c-text-sub)]'
                            }`}
                          >
                            {checked && (
                              <svg viewBox="0 0 24 24" width="10" height="10" stroke="var(--c-bg)" strokeWidth="3" fill="none" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-[12px] transition-colors ${
                              checked
                                ? 'text-[var(--c-text)]'
                                : 'text-[var(--c-text-sub)] group-hover:text-[var(--c-text)]'
                            }`}
                          >
                            {item}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div className="h-3" />
        </div>
      </div>
    </div>
  );
}

/* ── Check toggle row ──────────────────────────────────────────────────────── */

function AccessRow({
  label,
  checked,
  disabled,
  onClick,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[var(--c-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          checked
            ? 'bg-[var(--c-text)] border-[var(--c-text)]'
            : 'border-[var(--c-border)] bg-transparent'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 24 24" width="10" height="10" stroke="var(--c-bg)" strokeWidth="3" fill="none" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span className="text-sm text-[var(--c-text)]">{label}</span>
    </button>
  );
}

/* ── Permission matrix table ───────────────────────────────────────────────── */

const ROLE_COLS = [
  { key: 'owner'  as const, label: 'Owner'  },
  { key: 'admin'  as const, label: 'Admin'  },
  { key: 'member' as const, label: 'Member' },
];

function PermissionsTable({ activeRole }: { activeRole: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr>
            <th className="text-left pb-2 pr-2 pl-3 text-[var(--c-muted)] font-medium">Permiso</th>
            {ROLE_COLS.map((col) => (
              <th
                key={col.key}
                className={`text-center pb-2 px-2 min-w-[44px] text-[10px] ${
                  col.key === activeRole
                    ? 'font-bold text-[var(--c-text)]'
                    : 'font-normal text-[var(--c-muted)]'
                }`}
              >
                {col.label}
                {col.key === activeRole && (
                  <div className="mx-auto mt-0.5 h-0.5 w-4 rounded-full bg-[var(--c-text)]" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MATRIX.map((row) => (
            <tr key={row.label} className="border-t border-[var(--c-line)]">
              <td className="py-1.5 pr-2 pl-3 text-[var(--c-text-sub)] leading-snug">{row.label}</td>
              {ROLE_COLS.map((col) => (
                <td
                  key={col.key}
                  className={`text-center py-1.5 px-2 ${
                    col.key === activeRole ? 'text-[var(--c-text)]' : 'text-[var(--c-muted)]'
                  }`}
                >
                  {row[col.key] ? (
                    <svg viewBox="0 0 24 24" width="12" height="12" className="inline" stroke="currentColor" strokeWidth="2.5" fill="none" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="text-[10px] text-[var(--c-border)]">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Left member card ──────────────────────────────────────────────────────── */

function MemberCard({
  member,
  selected,
  onClick,
}: {
  member: LicenseMemberAccess;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer border ${
        selected
          ? 'bg-[var(--c-hover)] border-[var(--c-border)]'
          : 'border-transparent hover:bg-[var(--c-hover)]'
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar member={member} size="sm" />
        <span
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-[var(--c-bg)] ${
            STATUS_COLOR[member.presence_status] ?? STATUS_COLOR.offline
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-[var(--c-text)] truncate">{member.name}</p>
          <RolePill role={member.license_role} />
        </div>
        <p className="text-[11px] text-[var(--c-muted)] truncate">
          {member.role_type ?? member.email}
        </p>
      </div>
    </button>
  );
}

/* ── Right panel ───────────────────────────────────────────────────────────── */

function MemberPanel({
  member,
  licenseOwnerId,
  isCallerOwner,
  isCallerAdmin,
  currentUserId,
  positions,
  wide = false,
  onRoleChange,
  onCargoChange,
  onManagePositions,
  onWorkspaceToggle,
  onProjectToggle,
  onRemove,
  onClose,
  onSaved,
}: {
  member: LicenseMemberAccess;
  licenseOwnerId: string;
  isCallerOwner: boolean;
  isCallerAdmin: boolean;
  currentUserId: string;
  positions: Position[];
  wide?: boolean;
  onRoleChange: (role: string) => void;
  onCargoChange: (cargo: string) => void;
  onManagePositions: () => void;
  onWorkspaceToggle: (ws: LicenseMemberAccessWorkspace) => void;
  onProjectToggle: (proj: LicenseMemberAccessProject) => void;
  onRemove: () => void;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const isPrimaryOwner = member.id === licenseOwnerId;
  const isSelf         = member.id === currentUserId;
  const isOwnerRole    = member.license_role === 'owner';
  const canRemove      = !isPrimaryOwner && !isSelf && (isCallerOwner || isCallerAdmin);
  const canChangeRole  = isCallerOwner && !isPrimaryOwner;
  const canEditCargo   = isOwnerRole
    ? isCallerOwner
    : (isCallerOwner || isCallerAdmin || isSelf);
  const canToggleAccess = isOwnerRole
    ? isCallerOwner
    : (isCallerOwner || isCallerAdmin);
  const positionOptions: SelectOption[] = positions.map((p) => ({ value: p.name, label: p.name }));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editEmail, setEditEmail] = useState(member.email);
  const [editPwd, setEditPwd] = useState('');
  const [editCargo, setEditCargo] = useState(member.role_type ?? '');
  const [editRole, setEditRole] = useState(member.license_role);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function openEdit() {
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPwd('');
    setEditCargo(member.role_type ?? '');
    setEditRole(member.license_role);
    setMenuOpen(false);
    setEditMode(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: editName.trim(), roleType: editCargo || null };
      if (editEmail.trim() && editEmail.trim() !== member.email) payload.email = editEmail.trim();
      await apiPatch(`/users/${member.id}`, payload);
      if (editPwd.trim()) await apiPatch(`/users/${member.id}/reset-password`, { password: editPwd.trim() });
      if (editRole !== member.license_role) onRoleChange(editRole);
      if (editCargo !== (member.role_type ?? '')) onCargoChange(editCargo);
      setEditMode(false);
      setEditPwd('');
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  /* ── Shared sub-sections ── */
  const headerNode = (
    <div className={`flex items-start gap-4 ${wide ? 'pb-5 mb-0 border-b border-[var(--c-line)]' : 'mb-6'}`}>
      <div className="relative flex-shrink-0">
        <Avatar member={member} size="lg" />
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--c-bg)] ${
            STATUS_COLOR[member.presence_status] ?? STATUS_COLOR.offline
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-[var(--c-text)]">{member.name}</h2>
          <RolePill role={member.license_role} />
          {isSelf && (
            <span className="text-[10px] text-[var(--c-muted)] bg-[var(--c-hover)] rounded-md px-1.5 py-0.5">
              Tú
            </span>
          )}
        </div>
        <p className="text-[13px] text-[var(--c-muted)] mt-0.5">{member.email}</p>
        {member.role_type && (
          <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5">{member.role_type}</p>
        )}
      </div>
      {wide && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {editMode ? (
            <>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 text-[12px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit]"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || !editName.trim()}
                className="flex items-center gap-1.5 text-[12px] font-semibold bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg px-3 py-1.5 hover:opacity-80 transition-opacity cursor-pointer font-[inherit] disabled:opacity-40 border-none"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </>
          ) : (isCallerOwner || isCallerAdmin) ? (
            <button
              type="button"
              onClick={openEdit}
              className="flex items-center gap-1.5 text-[12px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent font-[inherit]"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Editar
            </button>
          ) : null}
          {canRemove && !editMode && (
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 text-[12px] text-[var(--c-danger)] border border-[var(--c-danger)] rounded-lg px-3 py-1.5 hover:bg-[var(--c-danger)] hover:text-[var(--c-bg)] transition-colors cursor-pointer bg-transparent font-[inherit]"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );

  const roleNode = (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-2">
        Rol en la cuenta
      </p>
      {canChangeRole ? (
        <SearchSelect
          options={LICENSE_ROLE_OPTIONS}
          value={member.license_role}
          onChange={(val) => { if (val) onRoleChange(val); }}
          placeholder="Selecciona rol"
          searchPlaceholder="Buscar rol..."
          hideNone
        />
      ) : (
        <div className="text-sm text-[var(--c-text-sub)] px-3 py-2 border border-[var(--c-border)] rounded-lg bg-[var(--c-hover)]">
          {LICENSE_ROLE_LABEL[member.license_role] ?? member.license_role}
          {isPrimaryOwner && (
            <span className="ml-2 text-[11px] text-[var(--c-muted)]">(propietario principal)</span>
          )}
        </div>
      )}
    </div>
  );

  const cargoNode = (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
          Cargo
        </p>
        {isCallerOwner && (
          <Tooltip
            content="Gestionar cargos"
            side="left"
            icon={
              <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
            }
          >
            <button
              type="button"
              onClick={onManagePositions}
              className="w-6 h-6 flex items-center justify-center rounded-md border border-[var(--c-border)] text-[var(--c-muted)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
              aria-label="Gestionar cargos"
            >
              <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
            </button>
          </Tooltip>
        )}
      </div>
      {canEditCargo ? (
        <SearchSelect
          options={positionOptions}
          value={member.role_type ?? ''}
          onChange={(val) => onCargoChange(val ?? '')}
          placeholder="Sin cargo definido"
          searchPlaceholder="Buscar cargo…"
          noneLabel="Sin cargo"
        />
      ) : (
        <div className="text-sm text-[var(--c-text-sub)] px-3 py-2 border border-[var(--c-border)] rounded-lg bg-[var(--c-hover)]">
          {member.role_type ?? '—'}
        </div>
      )}
    </div>
  );

  const permissionsNode = (
    <div className="px-3 py-3 rounded-xl bg-[var(--c-hover)] border border-[var(--c-line)]">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-3">
        Permisos por rol
      </p>
      <PermissionsTable activeRole={member.license_role} />
    </div>
  );

  const accessNode = isOwnerRole ? (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--c-hover)] text-[var(--c-text-sub)]">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <p className="text-[13px]">Acceso completo — los owners pueden ver todos los workspaces y proyectos.</p>
    </div>
  ) : (
    <div className="flex flex-col gap-5">
      {member.workspaces.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Workspaces</p>
            <span className="text-[11px] text-[var(--c-muted)]">
              {member.workspaces.filter((w) => w.has_access).length}/{member.workspaces.length}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {member.workspaces.map((ws) => (
              <AccessRow key={ws.id} label={ws.name} checked={ws.has_access} disabled={!canToggleAccess} onClick={() => onWorkspaceToggle(ws)} />
            ))}
          </div>
        </div>
      )}
      {member.projects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Proyectos</p>
            <span className="text-[11px] text-[var(--c-muted)]">
              {member.projects.filter((p) => p.has_access).length}/{member.projects.length}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {member.projects.map((proj) => (
              <AccessRow key={proj.id} label={`${proj.code} — ${proj.name}`} checked={proj.has_access} disabled={!canToggleAccess} onClick={() => onProjectToggle(proj)} />
            ))}
          </div>
        </div>
      )}
      {member.workspaces.length === 0 && member.projects.length === 0 && (
        <p className="text-[13px] text-[var(--c-muted)]">
          No hay workspaces ni proyectos configurados en esta cuenta.
        </p>
      )}
    </div>
  );

  /* ── Wide (desktop 2-col) layout ── */
  if (wide) {
    return (
      <div className="flex flex-col h-full gap-6">
        {headerNode}

        {editMode ? (
          /* ── Formulario de edición desktop ── */
          <div className="flex flex-col gap-6 flex-1">
            <div className="grid grid-cols-2 gap-5">
              {/* Columna izquierda: datos personales */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Nombre</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full"
                    placeholder="Nombre del miembro"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Correo</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Nueva contraseña</label>
                  <input
                    type="password"
                    value={editPwd}
                    onChange={e => setEditPwd(e.target.value)}
                    className="border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full"
                    placeholder="Dejar vacío para no cambiar"
                  />
                </div>
              </div>

              {/* Columna derecha: rol y cargo */}
              <div className="flex flex-col gap-4">
                {canChangeRole && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Rol en la cuenta</label>
                    <SearchSelect
                      options={LICENSE_ROLE_OPTIONS}
                      value={editRole}
                      onChange={val => { if (val) setEditRole(val); }}
                      placeholder="Selecciona rol"
                      searchPlaceholder="Buscar rol..."
                      hideNone
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Cargo</label>
                  <SearchSelect
                    options={positionOptions}
                    value={editCargo}
                    onChange={val => setEditCargo(val)}
                    placeholder="Sin cargo"
                    searchPlaceholder="Buscar cargo..."
                    noneLabel="— Sin cargo —"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Vista normal 2 columnas ── */
          <div className="flex-1 grid grid-cols-5 gap-8 min-h-0">
            {/* Left col: role + cargo */}
            <div className="col-span-2 flex flex-col gap-5">
              {roleNode}
              {cargoNode}
            </div>

            {/* Right col: permissions + access */}
            <div className="col-span-3 flex flex-col gap-5 overflow-y-auto">
              {permissionsNode}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-3">
                  Acceso
                </p>
                {accessNode}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Default (mobile) layout — tab-based ── */
  const [mobileTab, setMobileTab] = useState<'perfil' | 'permisos' | 'acceso'>('perfil');

  const TABS: { key: typeof mobileTab; label: string }[] = [
    { key: 'perfil',   label: 'Perfil'    },
    { key: 'permisos', label: 'Permisos'  },
    { key: 'acceso',   label: 'Acceso'    },
  ];

  return (
    <div className="flex flex-col">

      {/* ── Barra superior ── */}
      <div className="flex items-center justify-between mb-4">
        {/* Izquierda: flecha atrás en edición, engrane en normal (solo si hay acciones) */}
        <div className="relative" ref={menuRef}>
          {editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
              aria-label="Volver"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          ) : (isCallerOwner || isCallerAdmin || canRemove) ? (
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
              aria-label="Más opciones"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          ) : (
            <div className="w-8" />
          )}

          {menuOpen && (
            <div className="absolute left-0 top-full mt-1.5 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden z-10 min-w-[170px]">
              {(isCallerOwner || isCallerAdmin) && (
                <button
                  type="button"
                  onClick={openEdit}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer text-left"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Editar miembro
                </button>
              )}
              {(isCallerOwner || isCallerAdmin) && canRemove && (
                <div className="border-t border-[var(--c-line)]" />
              )}
              {canRemove && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onRemove(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[var(--c-danger)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer text-left"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Eliminar miembro
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cerrar — siempre a la derecha */}
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Modo edición ── */}
      {editMode && (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Nombre</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full"
              placeholder="Nombre del miembro"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Correo</label>
            <input
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              className="border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Nueva contraseña</label>
            <input
              type="password"
              value={editPwd}
              onChange={e => setEditPwd(e.target.value)}
              className="border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full"
              placeholder="Dejar vacío para no cambiar"
            />
          </div>

          {canChangeRole && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Rol en la cuenta</label>
              <SearchSelect
                options={LICENSE_ROLE_OPTIONS}
                value={editRole}
                onChange={val => { if (val) setEditRole(val); }}
                placeholder="Selecciona rol"
                searchPlaceholder="Buscar rol..."
                hideNone
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Cargo</label>
            <SearchSelect
              options={positionOptions}
              value={editCargo}
              onChange={val => setEditCargo(val)}
              placeholder="Sin cargo"
              searchPlaceholder="Buscar cargo..."
              noneLabel="— Sin cargo —"
            />
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || !editName.trim()}
              className="w-full py-2 text-[13px] font-semibold rounded-lg bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-80 transition-opacity cursor-pointer font-[inherit] disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* ── Header centrado (oculto en edición) ── */}
      {!editMode && <div className="flex flex-col items-center pb-5">
        {/* Avatar grande centrado */}
        <div className="relative mb-3">
          <Avatar member={member} size="xl" />
          <span
            className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--c-bg)] ${
              STATUS_COLOR[member.presence_status] ?? STATUS_COLOR.offline
            }`}
          />
        </div>

        {/* Nombre + badge Tú */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[17px] font-bold text-[var(--c-text)]">{member.name}</p>
          {isSelf && (
            <span className="text-[10px] text-[var(--c-muted)] bg-[var(--c-hover)] rounded-md px-1.5 py-0.5 font-medium">Tú</span>
          )}
        </div>

        {/* Email */}
        <p className="text-[12px] text-[var(--c-muted)] mb-2">{member.email}</p>

        {/* Role pill + cargo */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <RolePill role={member.license_role} />
          {member.role_type && (
            <span className="text-[11px] font-medium text-[var(--c-text-sub)] bg-[var(--c-hover)] rounded-md px-2 py-0.5">
              {member.role_type}
            </span>
          )}
        </div>
      </div>}

      {!editMode && <>
        {/* ── Tabs — estilo píldora ── */}
        <div className="flex gap-1 bg-[var(--c-hover)] rounded-xl p-1 mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMobileTab(t.key)}
              style={{ border: 'none', outline: 'none' }}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${
                mobileTab === t.key
                  ? 'bg-[var(--c-bg)] text-[var(--c-text)] shadow-sm'
                  : 'bg-transparent text-[var(--c-muted)] hover:text-[var(--c-text-sub)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div>
          {mobileTab === 'perfil' && (
            <div className="flex flex-col gap-5">
              {roleNode}
              {cargoNode}
            </div>
          )}
          {mobileTab === 'permisos' && (
            <div className="rounded-xl bg-[var(--c-hover)] border border-[var(--c-line)] overflow-hidden">
              <PermissionsTable activeRole={member.license_role} />
            </div>
          )}
          {mobileTab === 'acceso' && accessNode}
        </div>
      </>}
    </div>
  );
}

/* ── Add member modal ──────────────────────────────────────────────────────── */

const fieldCls =
  'border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent ' +
  'text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none ' +
  'focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full';

/* ── Invite-link sub-form ────────────────────────────────────────────────── */

function InviteLinkForm({
  licenseId,
  positions,
}: {
  licenseId: string;
  positions: Position[];
}) {
  const [role,           setRole]           = useState('member');
  const [roleType,       setRoleType]       = useState('');
  const [link,           setLink]           = useState('');
  const [loading,        setLoading]        = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [error,          setError]          = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await apiPost<ApiWrapped<{ token: string }>>(`/licenses/${licenseId}/invites`, {
        role,
        roleType: roleType || undefined,
      });
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setLink(`${origin}/invitar/${res.data.token}`);
      playSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al generar el enlace');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: select input */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[var(--c-text-sub)]">
        Genera un enlace de invitación. Quien lo abra podrá crear su cuenta y se unirá automáticamente a esta cuenta con el rol que elijas.
      </p>

      <div className="flex flex-col gap-1">
        <label
          className="text-[12px] font-medium transition-colors"
          style={{ color: link ? 'var(--c-success)' : 'var(--c-text-sub)' }}
        >
          Rol en la cuenta
        </label>
          <SearchSelect
            options={LICENSE_ROLE_OPTIONS}
            value={role}
            onChange={(val) => setRole(val || 'member')}
            placeholder="Selecciona rol"
            searchPlaceholder="Buscar..."
            hideNone
            locked={!!link}
          />
      </div>

      <div className="flex flex-col gap-1">
        <label
          className="text-[12px] font-medium transition-colors"
          style={{ color: link ? 'var(--c-success)' : 'var(--c-text-sub)' }}
        >
          Cargo (opcional)
        </label>
          <SearchSelect
            options={positions.map((p) => ({ value: p.name, label: p.name }))}
            value={roleType}
            onChange={(val) => setRoleType(val ?? '')}
            placeholder="Sin cargo asignado"
            searchPlaceholder="Buscar cargo…"
            noneLabel="Sin cargo"
            locked={!!link}
          />
      </div>

      {!link ? (
        <>
          {error && <p className="text-[12px] text-[var(--c-danger)]">{error}</p>}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none font-[inherit]"
          >
            {loading ? 'Generando…' : 'Generar enlace de invitación'}
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="var(--c-success)" strokeWidth="2.5" fill="none" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-success)]">
                Enlace generado — válido 7 días
              </p>
            </div>
            <Tooltip
              content="Generar nuevo enlace"
              side="right"
              icon={
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" strokeWidth="2.5" fill="none" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              }
            >
              <button
                type="button"
                onClick={() => { setLink(''); setError(''); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-muted)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
                aria-label="Generar nuevo enlace"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                </svg>
              </button>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 border rounded-lg px-3 py-2 text-[12px] font-[inherit] focus:outline-none cursor-text truncate transition-colors"
              style={{ borderColor: 'var(--c-success)', background: 'color-mix(in srgb, var(--c-success) 8%, var(--c-bg))', color: 'var(--c-success)' }}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer font-[inherit] whitespace-nowrap border"
              style={copied
                ? { background: 'var(--c-success)', color: 'var(--c-bg)', borderColor: 'var(--c-success)' }
                : { background: 'transparent', color: 'var(--c-success)', borderColor: 'var(--c-success)' }
              }
            >
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create-account sub-form (2-step) ────────────────────────────────────── */

function CreateAccountForm({
  licenseId,
  availableWorkspaces,
  availableProjects,
  positions,
  onSuccess,
  onClose,
}: {
  licenseId: string;
  availableWorkspaces: LicenseMemberAccessWorkspace[];
  availableProjects: LicenseMemberAccessProject[];
  positions: Position[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [step,        setStep]        = useState<1 | 2>(1);
  const [newUserId,   setNewUserId]   = useState('');
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [licenseRole, setLicenseRole] = useState('member');
  const [roleType,    setRoleType]    = useState('');
  const [selWs,       setSelWs]       = useState<Set<string>>(new Set());
  const [selProj,     setSelProj]     = useState<Set<string>>(new Set());
  const [error,       setError]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Nombre, correo y contraseña son obligatorios');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const userRes = await apiPost<ApiWrapped<{ id: string }>>('/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        roleType: roleType || null,
      });
      const userId = userRes.data.id;
      await apiPost(`/licenses/${licenseId}/members`, { userId, role: licenseRole });
      setNewUserId(userId);
      playSuccess();
      if (licenseRole === 'owner' || (availableWorkspaces.length === 0 && availableProjects.length === 0)) {
        onSuccess();
        onClose();
      } else {
        setStep(2);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el miembro');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign() {
    setSubmitting(true);
    setError('');
    try {
      await Promise.all([
        ...Array.from(selWs).map((wsId) =>
          apiPost(`/workspaces/${wsId}/members`, { userId: newUserId }),
        ),
        ...Array.from(selProj).map((projId) =>
          apiPost(`/licenses/${licenseId}/assign-project`, { projectId: projId, userId: newUserId }),
        ),
      ]);
      playSuccess();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al asignar accesos');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleWs(id: string) {
    setSelWs((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleProj(id: string) {
    setSelProj((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (step === 2) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-[var(--c-text-sub)]">
          Selecciona a qué workspaces y proyectos tendrá acceso. Puedes ajustarlo más tarde.
        </p>
        {availableWorkspaces.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-1">Workspaces</p>
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
              {availableWorkspaces.map((ws) => (
                <AccessRow key={ws.id} label={ws.name} checked={selWs.has(ws.id)} onClick={() => toggleWs(ws.id)} />
              ))}
            </div>
          </div>
        )}
        {availableProjects.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-1">Proyectos</p>
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
              {availableProjects.map((proj) => (
                <AccessRow key={proj.id} label={`${proj.code} — ${proj.name}`} checked={selProj.has(proj.id)} onClick={() => toggleProj(proj.id)} />
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-[12px] text-[var(--c-danger)]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { onSuccess(); onClose(); }}
            disabled={submitting}
            className="flex-1 border border-[var(--c-border)] rounded-lg py-2 text-sm text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit]"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={submitting || (selWs.size === 0 && selProj.size === 0)}
            className="flex-1 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none font-[inherit]"
          >
            {submitting ? 'Asignando…' : 'Asignar acceso'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Nombre completo</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana García" className={fieldCls} autoFocus />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Correo electrónico</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@empresa.io" className={fieldCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={fieldCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Rol en la cuenta</label>
        <SearchSelect
          options={LICENSE_ROLE_OPTIONS}
          value={licenseRole}
          onChange={(val) => setLicenseRole(val || 'member')}
          placeholder="Selecciona rol"
          searchPlaceholder="Buscar..."
          hideNone
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Cargo</label>
        <SearchSelect
          options={positions.map((p) => ({ value: p.name, label: p.name }))}
          value={roleType}
          onChange={(val) => setRoleType(val ?? '')}
          placeholder="Selecciona un cargo"
          searchPlaceholder="Buscar cargo…"
          noneLabel="Sin cargo"
        />
      </div>
      {error && <p className="text-[12px] text-[var(--c-danger)]">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-[var(--c-border)] rounded-lg py-2 text-sm text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none font-[inherit]"
        >
          {submitting ? 'Creando…' : 'Crear cuenta'}
        </button>
      </div>
    </form>
  );
}

/* ── Modal wrapper with mode tabs ────────────────────────────────────────── */

function AddMemberModal({
  licenseId,
  availableWorkspaces,
  availableProjects,
  positions,
  onClose,
  onSuccess,
}: {
  licenseId: string;
  availableWorkspaces: LicenseMemberAccessWorkspace[];
  availableProjects: LicenseMemberAccessProject[];
  positions: Position[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'invite' | 'create'>('invite');

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--c-text)]">Añadir miembro</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--c-muted)] hover:text-[var(--c-text)] cursor-pointer bg-transparent border-none"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[var(--c-hover)] rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode('invite')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer border-none font-[inherit] ${
              mode === 'invite'
                ? 'bg-[var(--c-bg)] text-[var(--c-text)] shadow-sm'
                : 'bg-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]'
            }`}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Invitar via link
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer border-none font-[inherit] ${
              mode === 'create'
                ? 'bg-[var(--c-bg)] text-[var(--c-text)] shadow-sm'
                : 'bg-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]'
            }`}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Crear cuenta
          </button>
        </div>

        {/* Content */}
        {mode === 'invite' ? (
          <InviteLinkForm licenseId={licenseId} positions={positions} />
        ) : (
          <CreateAccountForm
            licenseId={licenseId}
            availableWorkspaces={availableWorkspaces}
            availableProjects={availableProjects}
            positions={positions}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function MiembrosPage() {
  const { user: authUser } = useAuth();

  const [licenseId,            setLicenseId]            = useState<string | null>(null);
  const [licenseOwnerId,       setLicenseOwnerId]       = useState<string>('');
  const [noLicense,            setNoLicense]            = useState(false);
  const [members,              setMembers]              = useState<LicenseMemberAccess[]>([]);
  const [positions,            setPositions]            = useState<Position[]>([]);
  const [loading,              setLoading]              = useState(true);
  const [search,               setSearch]               = useState('');
  const [selected,             setSelected]             = useState<LicenseMemberAccess | null>(null);
  const [mobileOpen,           setMobileOpen]           = useState(false);
  const [showAdd,              setShowAdd]              = useState(false);
  const [showManagePositions,  setShowManagePositions]  = useState(false);
  const [pendingRemove,        setPendingRemove]        = useState<string | null>(null);

  /* load license id — created automatically on registration for all new users */
  useEffect(() => {
    apiGet<ApiWrapped<Array<{ id: string; owner_id: string }>>>('/licenses')
      .then((res) => {
        if (res.data[0]) {
          setLicenseId(res.data[0].id);
          setLicenseOwnerId(res.data[0].owner_id);
        } else {
          setNoLicense(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error cargando licencias:', err);
        setLoading(false);
      });
  }, []);

  /* load members + positions when licenseId is available */
  useEffect(() => {
    if (!licenseId) return;
    loadMembers();
    apiGet<ApiWrapped<Position[]>>(`/licenses/${licenseId}/positions`)
      .then((res) => setPositions(res.data))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseId]);

  function loadMembers() {
    if (!licenseId) return;
    setLoading(true);
    apiGet<ApiWrapped<LicenseMemberAccess[]>>(`/licenses/${licenseId}/members`)
      .then((res) => {
        setMembers(res.data);
        setSelected((prev) => (prev ? res.data.find((m) => m.id === prev.id) ?? null : null));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(
    () =>
      search.trim()
        ? members.filter(
            (m) =>
              m.name.toLowerCase().includes(search.toLowerCase()) ||
              m.email.toLowerCase().includes(search.toLowerCase()),
          )
        : members,
    [members, search],
  );

  /* derive available workspaces/projects from first member (same list for all) */
  const availableWorkspaces = members[0]?.workspaces ?? [];
  const availableProjects   = members[0]?.projects ?? [];

  const callerLicenseRole = authUser?.licenseRole ?? 'member';
  const isCallerOwner = !!authUser && (authUser.id === licenseOwnerId || callerLicenseRole === 'owner');
  const isCallerAdmin = !!authUser && callerLicenseRole === 'admin';
  const canViewPage   = isCallerOwner || isCallerAdmin;

  /* optimistic helpers */
  function applyMemberPatch(id: string, patch: Partial<LicenseMemberAccess>) {
    const applyPatch = (m: LicenseMemberAccess) =>
      m.id === id ? { ...m, ...patch } : m;
    setMembers((prev) => prev.map(applyPatch));
    setSelected((prev) => (prev?.id === id ? applyPatch(prev) : prev));
  }

  /* cargo change */
  async function handleCargoChange(memberId: string, cargo: string) {
    const prev = members.find((m) => m.id === memberId)?.role_type ?? null;
    applyMemberPatch(memberId, { role_type: cargo || null });
    try {
      await apiPatch(`/users/${memberId}`, { roleType: cargo || null });
    } catch {
      applyMemberPatch(memberId, { role_type: prev });
    }
  }

  /* role change */
  async function handleRoleChange(memberId: string, role: string) {
    const prev = members.find((m) => m.id === memberId)?.license_role ?? '';
    applyMemberPatch(memberId, { license_role: role });
    try {
      await apiPatch(`/licenses/${licenseId}/members/${memberId}`, { role });
    } catch {
      applyMemberPatch(memberId, { license_role: prev });
    }
  }

  /* workspace toggle */
  async function handleWorkspaceToggle(memberId: string, ws: LicenseMemberAccessWorkspace) {
    const next = !ws.has_access;
    applyMemberPatch(memberId, {
      workspaces: members
        .find((m) => m.id === memberId)!
        .workspaces.map((w) => (w.id === ws.id ? { ...w, has_access: next } : w)),
    });
    try {
      if (next) {
        await apiPost(`/workspaces/${ws.id}/members`, { userId: memberId });
      } else {
        await apiDelete(`/workspaces/${ws.id}/members/${memberId}`);
      }
    } catch {
      applyMemberPatch(memberId, {
        workspaces: members
          .find((m) => m.id === memberId)!
          .workspaces.map((w) => (w.id === ws.id ? { ...w, has_access: ws.has_access } : w)),
      });
    }
  }

  /* project toggle */
  async function handleProjectToggle(memberId: string, proj: LicenseMemberAccessProject) {
    const next = !proj.has_access;
    applyMemberPatch(memberId, {
      projects: members
        .find((m) => m.id === memberId)!
        .projects.map((p) => (p.id === proj.id ? { ...p, has_access: next } : p)),
    });
    try {
      if (next) {
        await apiPost(`/licenses/${licenseId}/assign-project`, { projectId: proj.id, userId: memberId });
      } else {
        await apiDelete(`/licenses/${licenseId}/members/${memberId}/projects/${proj.id}`);
      }
    } catch {
      applyMemberPatch(memberId, {
        projects: members
          .find((m) => m.id === memberId)!
          .projects.map((p) => (p.id === proj.id ? { ...p, has_access: proj.has_access } : p)),
      });
    }
  }

  /* remove member */
  async function handleRemove(memberId: string) {
    try {
      await apiDelete(`/licenses/${licenseId}/members/${memberId}`);
      playDelete();
      setSelected(null);
      setMobileOpen(false);
      loadMembers();
    } catch (err) {
      console.error(err);
    }
  }

  function selectMember(m: LicenseMemberAccess) {
    setSelected(m);
    setMobileOpen(true);
  }

  return (
    <>
      {/* Modals */}
      {showAdd && licenseId && (
        <AddMemberModal
          licenseId={licenseId}
          availableWorkspaces={availableWorkspaces}
          availableProjects={availableProjects}
          positions={positions}
          onClose={() => setShowAdd(false)}
          onSuccess={loadMembers}
        />
      )}
      {showManagePositions && licenseId && (
        <ManagePositionsModal
          licenseId={licenseId}
          positions={positions}
          onClose={() => setShowManagePositions(false)}
          onUpdate={setPositions}
        />
      )}
      <ConfirmModal
        open={pendingRemove !== null}
        title="Eliminar miembro"
        message="El miembro perderá acceso a todos los workspaces y proyectos de esta cuenta."
        onConfirm={() => {
          if (pendingRemove) handleRemove(pendingRemove);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />

      {/* Mobile panel overlay — modal centrado */}
      {mobileOpen && selected && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/40">
          {/* min-h-full garantiza que items-center funcione cuando el card es más corto que el viewport */}
          <div
            className="flex min-h-full items-center justify-center p-5"
            onClick={() => setMobileOpen(false)}
          >
          <div
            className="bg-[var(--c-bg)] rounded-2xl border border-[var(--c-border)] shadow-[0_24px_64px_rgba(0,0,0,0.2)] w-full max-w-sm overflow-y-auto"
            style={{ maxHeight: 'calc(100dvh - 2.5rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 pb-6">
              <MemberPanel
                member={selected}
                licenseOwnerId={licenseOwnerId}
                isCallerOwner={isCallerOwner}
                isCallerAdmin={isCallerAdmin}
                currentUserId={authUser?.id ?? ''}
                positions={positions}
                onRoleChange={(role) => handleRoleChange(selected.id, role)}
                onCargoChange={(cargo) => handleCargoChange(selected.id, cargo)}
                onManagePositions={() => setShowManagePositions(true)}
                onWorkspaceToggle={(ws) => handleWorkspaceToggle(selected.id, ws)}
                onProjectToggle={(proj) => handleProjectToggle(selected.id, proj)}
                onRemove={() => { setPendingRemove(selected.id); setMobileOpen(false); }}
                onClose={() => setMobileOpen(false)}
                onSaved={loadMembers}
              />
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Access denied — members cannot view this page */}
      {!noLicense && !loading && !canViewPage && (
        <div className="-m-6 flex flex-col items-center justify-center gap-3 text-center text-[var(--c-muted)]" style={{ height: '100dvh' }}>
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-sm font-medium text-[var(--c-text-sub)]">Acceso restringido</p>
          <p className="text-[12px] max-w-xs">Solo los owners y admins pueden gestionar los miembros de la cuenta.</p>
        </div>
      )}

      {/* No license — only visible to legacy users who existed before auto-license on registration */}
      {noLicense && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-[var(--c-muted)]">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-sm font-medium text-[var(--c-text-sub)]">Sin acceso a este módulo</p>
          <p className="text-[12px] max-w-xs">Contacta al administrador para que te asigne a una cuenta.</p>
        </div>
      )}

      {/* Page layout: 100dvh split panel */}
      {!noLicense && canViewPage && (
      <div
        className="-m-6 flex flex-col bg-[var(--c-bg)]"
        style={{ height: '100dvh' }}
      >
        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--c-border)]">
          <div>
            <h1 className="text-xl font-bold text-[var(--c-text)]">Miembros</h1>
            <p className="text-[12px] text-[var(--c-muted)] mt-0.5">
              {loading ? '…' : `${members.length} ${members.length === 1 ? 'miembro' : 'miembros'} en la cuenta`}
            </p>
          </div>
          {isCallerOwner && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-3 py-2 bg-transparent hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer font-[inherit] whitespace-nowrap"
            >
              + Añadir miembro
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: list */}
          <div className="w-full md:w-72 flex-shrink-0 flex flex-col border-r border-[var(--c-border)]">
            {/* Search */}
            <div className="px-4 py-3 border-b border-[var(--c-line)]">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar miembro…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--c-hover)] border border-transparent rounded-lg text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-border)] transition-colors"
                />
              </div>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto px-2 py-2 pb-[calc(var(--nav-h)+1rem)] md:pb-2">
              {loading ? (
                <div className="flex flex-col gap-2 px-2 pt-2">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-[13px] text-[var(--c-muted)] text-center py-8">
                  {search ? 'Sin resultados' : 'No hay miembros aún'}
                </p>
              ) : (
                filtered.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    selected={selected?.id === m.id}
                    onClick={() => selectMember(m)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: panel (desktop only) */}
          <div className="hidden md:flex flex-1 overflow-y-auto px-8 py-6">
            {selected ? (
              <div className="w-full">
                <MemberPanel
                  member={selected}
                  licenseOwnerId={licenseOwnerId}
                  isCallerOwner={isCallerOwner}
                  isCallerAdmin={isCallerAdmin}
                  currentUserId={authUser?.id ?? ''}
                  positions={positions}
                  wide
                  onRoleChange={(role) => handleRoleChange(selected.id, role)}
                  onCargoChange={(cargo) => handleCargoChange(selected.id, cargo)}
                  onManagePositions={() => setShowManagePositions(true)}
                  onWorkspaceToggle={(ws) => handleWorkspaceToggle(selected.id, ws)}
                  onProjectToggle={(proj) => handleProjectToggle(selected.id, proj)}
                  onRemove={() => setPendingRemove(selected.id)}
                  onSaved={loadMembers}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full text-center gap-3 text-[var(--c-muted)]">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p className="text-sm">Selecciona un miembro para ver su perfil y gestionar su acceso</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
}
