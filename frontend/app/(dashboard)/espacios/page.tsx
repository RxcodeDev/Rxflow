'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { WorkspaceSummary, ProjectSummary, ApiWrapped } from '@/types/api.types';
import { useUIDispatch } from '@/store/UIContext';
import { bumpProjects } from '@/store/slices/uiSlice';
import EditProjectModal from '@/components/features/projects/EditProjectModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { playDelete, playSuccess } from '@/hooks/useSound';
import { paletteColor } from '@/components/ui/SearchSelect';

/* ── Constants ── */
const WORKSPACE_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#64748b',
];
const WORKSPACE_ICON_NAMES = ['layers', 'code', 'target', 'briefcase', 'monitor', 'zap', 'globe', 'star'] as const;
type IconName = typeof WORKSPACE_ICON_NAMES[number];

const UNASSIGNED = '__unassigned__';

/* ── Helpers ── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

const fieldCls =
  'border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-transparent ' +
  'text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none ' +
  'focus:border-[var(--c-text-sub)] transition-colors font-[inherit] w-full';

function WorkspaceIcon({ icon, size = 16, color }: { icon: string; size?: number; color?: string }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color ?? 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  switch (icon) {
    case 'code':      return <svg {...p}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
    case 'target':    return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'briefcase': return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'monitor':   return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    case 'zap':       return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'globe':     return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case 'star':      return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    default:          return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
  }
}

/* ── Avatar — same pattern as Sidebar (real image, else colored initials) + live presence ── */
type Presence = 'online' | 'away' | 'offline';
const PRESENCE_COLOR: Record<Presence, string> = {
  online: 'var(--c-success)',
  away: '#f59e0b',
  offline: 'var(--c-muted)',
};

function Avatar({ name, initials, url, color, presence, size = 28, ring = 'var(--c-bg)' }: {
  name: string;
  initials: string;
  url?: string | null;
  color?: string | null;
  presence?: Presence;
  size?: number;
  ring?: string;
}) {
  const dot = Math.max(7, Math.round(size * 0.3));
  return (
    <span className="relative inline-flex shrink-0" title={name} style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name}
          className="w-full h-full rounded-full object-cover"
          style={{ border: `2px solid ${ring}` }} />
      ) : (
        <span className="w-full h-full rounded-full flex items-center justify-center font-semibold text-[var(--c-bg)]"
          style={{ background: color || 'var(--c-text)', border: `2px solid ${ring}`, fontSize: Math.round(size * 0.36) }}>
          {initials}
        </span>
      )}
      {presence && (
        <span className="absolute bottom-0 right-0 rounded-full"
          title={presence}
          style={{ width: dot, height: dot, background: PRESENCE_COLOR[presence], border: `2px solid ${ring}` }} />
      )}
    </span>
  );
}

/* ── Semantic status pill colors ── */
function statusStyle(status: string): { color: string; bg: string } {
  const s = status.toLowerCase();
  if (['activo', 'active', 'en progreso', 'in_progress'].includes(s))
    return { color: 'var(--c-success)', bg: 'color-mix(in srgb, var(--c-success) 12%, transparent)' };
  if (['pausado', 'paused', 'on_hold', 'bloqueado'].includes(s))
    return { color: '#b45309', bg: 'rgba(245,158,11,0.14)' };
  if (['completado', 'done', 'archivado', 'archived', 'cerrado'].includes(s))
    return { color: 'var(--c-muted)', bg: 'var(--c-hover)' };
  return { color: 'var(--c-text-sub)', bg: 'var(--c-hover)' };
}

/* ── Aggregate progress across a project list ── */
function aggProgress(projects: ProjectSummary[]) {
  const total = projects.reduce((s, p) => s + p.tasks_total, 0);
  const done = projects.reduce((s, p) => s + p.tasks_done, 0);
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/* ── Fixed-position dropdown hook ── */
function useFixedMenu() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current  && !btnRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  }

  return { open, setOpen, coords, btnRef, menuRef, handleOpen };
}

/* ── WorkspaceMenu ── */
function WorkspaceMenu({ ws, onEdit, onDelete }: {
  ws: WorkspaceSummary;
  onEdit: (w: WorkspaceSummary) => void;
  onDelete: (id: string) => void;
}) {
  const { open, setOpen, coords, btnRef, menuRef, handleOpen } = useFixedMenu();
  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-muted)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
        aria-label="Opciones del espacio">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div ref={menuRef} style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 9999 }}
          className="min-w-[170px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg py-1 text-sm">
          <button type="button" onClick={() => { setOpen(false); onEdit(ws); }}
            className="w-full text-left px-4 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors cursor-pointer">
            Editar espacio
          </button>
          <hr className="border-[var(--c-line)] mx-2 my-1" />
          <button type="button" onClick={() => { setOpen(false); onDelete(ws.id); }}
            className="w-full text-left px-4 py-2 text-[var(--c-danger)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer">
            Eliminar espacio
          </button>
        </div>
      )}
    </>
  );
}

/* ── ProjectRowMenu ── */
function ProjectRowMenu({ project, workspaceId, onRemove, onEdit, onDelete }: {
  project: ProjectSummary;
  workspaceId: string | null;
  onRemove?: (id: string) => void;
  onEdit: (p: ProjectSummary) => void;
  onDelete: (id: string) => void;
}) {
  const { open, setOpen, coords, btnRef, menuRef, handleOpen } = useFixedMenu();
  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className="w-6 h-6 flex items-center justify-center rounded text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent border-none"
        aria-label="Opciones del proyecto">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div ref={menuRef} style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 9999 }}
          className="min-w-[160px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg py-1 text-sm">
          <Link href={`/proyectos/${project.code.toLowerCase()}/board`} onClick={() => setOpen(false)}
            className="flex items-center px-3 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors">
            Abrir board
          </Link>
          <button type="button" onClick={() => { setOpen(false); onEdit(project); }}
            className="w-full text-left px-3 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors cursor-pointer">
            Editar proyecto
          </button>
          {workspaceId && onRemove && (
            <>
              <hr className="border-[var(--c-line)] mx-2 my-1" />
              <button type="button" onClick={() => { setOpen(false); onRemove(project.id); }}
                className="w-full text-left px-3 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer">
                Quitar del espacio
              </button>
            </>
          )}
          <hr className="border-[var(--c-line)] mx-2 my-1" />
          <button type="button" onClick={() => { setOpen(false); onDelete(project.id); }}
            className="w-full text-left px-3 py-2 text-[var(--c-danger)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer">
            Eliminar proyecto
          </button>
        </div>
      )}
    </>
  );
}

/* ── WorkspaceFormModal ── */
function WorkspaceFormModal({ workspace, onClose, onSaved }: {
  workspace: WorkspaceSummary | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!workspace;
  const [name,        setName]        = useState(workspace?.name ?? '');
  const [description, setDescription] = useState(workspace?.description ?? '');
  const [color,       setColor]       = useState(workspace?.color ?? WORKSPACE_COLORS[0]);
  const [icon,        setIcon]        = useState<IconName>((workspace?.icon as IconName) ?? 'layers');
  const [error,       setError]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setSubmitting(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, color, icon };
      if (isEdit) {
        await apiPatch(`/workspaces/${workspace!.id}`, body);
      } else {
        await apiPost(`/workspaces`, body);
      }
      playSuccess();
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[var(--c-text)]">{isEdit ? 'Editar espacio' : 'Nuevo espacio de trabajo'}</h2>
          <button type="button" onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] cursor-pointer bg-transparent border-none">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Mi espacio" className={fieldCls} autoFocus />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--c-text-sub)]">
              Descripción <span className="text-[var(--c-muted)] font-normal">(opcional)</span>
            </label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="¿En qué trabaja este equipo?" className={fieldCls} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Color</label>
            <div className="flex gap-2 flex-wrap">
              {WORKSPACE_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer border-2 ${color === c ? 'scale-110 border-[var(--c-text)]' : 'border-transparent'}`}
                  aria-label={c} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[var(--c-text-sub)]">Ícono</label>
            <div className="flex gap-2 flex-wrap">
              {WORKSPACE_ICON_NAMES.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ${icon === ic ? 'bg-[var(--c-hover)] border-[var(--c-text-sub)]' : 'border-[var(--c-border)] hover:bg-[var(--c-hover)]'}`}>
                  <WorkspaceIcon icon={ic} size={16} />
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-[12px] text-[var(--c-danger)]">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-[var(--c-border)] rounded-lg py-2 text-sm text-[var(--c-text-sub)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent font-[inherit]">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg py-2 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-none font-[inherit]">
              {submitting ? 'Guardando…' : (isEdit ? 'Guardar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── AssignProjectModal ── */
function AssignProjectModal({ workspaceId, unassigned, onClose, onAssigned }: {
  workspaceId: string;
  unassigned: ProjectSummary[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const list = q.trim()
    ? unassigned.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.code.toLowerCase().includes(q.toLowerCase()))
    : unassigned;

  async function assign(projectId: string) {
    setLoading(true);
    try {
      await apiPost(`/workspaces/${workspaceId}/projects`, { projectId });
      playSuccess();
      onAssigned();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--c-text)]">Asignar proyecto</h2>
          <button type="button" onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] cursor-pointer bg-transparent border-none">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {unassigned.length === 0 ? (
          <p className="text-sm text-[var(--c-muted)] text-center py-6">Todos los proyectos ya están asignados a un espacio</p>
        ) : (
          <>
            <div className="flex items-center gap-2 border border-[var(--c-border)] rounded-lg px-3 py-2 mb-3">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--c-muted)] shrink-0" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar proyecto…"
                className="flex-1 text-sm bg-transparent outline-none text-[var(--c-text)] placeholder:text-[var(--c-muted)] font-[inherit]" autoFocus />
            </div>
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
              {list.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)] text-center py-6">Sin resultados</p>
              ) : list.map(p => (
                <button key={p.id} type="button" disabled={loading} onClick={() => assign(p.id)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent border-none w-full disabled:opacity-50">
                  <span className="font-mono text-[11px] font-semibold rounded-[4px] px-1.5 py-0.5 shrink-0"
                    style={{ color: paletteColor(p.code).color, background: paletteColor(p.code).bg }}>{p.code}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--c-text)] truncate">{p.name}</p>
                    {p.description && <p className="text-[12px] text-[var(--c-muted)] truncate">{p.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── ProjectGrid ── */
const GRID_COLS = 'minmax(240px,2.4fr) minmax(130px,1.1fr) minmax(170px,1.6fr) 72px 80px 92px 32px';
const GRID_HEADERS = ['Proyecto', 'Cycle', 'Progreso', 'Tareas', 'Equipo', 'Estado', ''];

function ProjectGrid({ projects, workspaceId, accent, onEdit, onDelete, onRemove }: {
  projects: ProjectSummary[];
  workspaceId: string | null;
  accent: string;
  onEdit: (p: ProjectSummary) => void;
  onDelete: (id: string) => void;
  onRemove?: (projectId: string) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <div className="flex flex-col">
      {/* Header — desktop only */}
      <div className="hidden md:grid sticky top-0 z-10 bg-[var(--c-bg)] border-b border-[var(--c-line)]"
        style={{ gridTemplateColumns: GRID_COLS }}>
        {GRID_HEADERS.map(h => (
          <div key={h} className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)] py-2 pr-3">
            {h}
          </div>
        ))}
      </div>

      {projects.map(p => (
        <div key={p.id} className="border-b border-[var(--c-line)] last:border-0">

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-3 py-3">
            <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5 shrink-0"
                  style={{ color: paletteColor(p.code).color, background: paletteColor(p.code).bg }}>{p.code}</span>
                <span className="text-sm font-medium text-[var(--c-text)] truncate">{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-[var(--c-border)] overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${p.progress_pct}%`, background: accent }} />
                </div>
                <span className="text-[11px] text-[var(--c-muted)] tabular-nums shrink-0">{p.progress_pct}%</span>
                <span className="text-[11px] text-[var(--c-text-sub)] tabular-nums shrink-0">{p.tasks_done}/{p.tasks_total}</span>
              </div>
            </Link>
            <ProjectRowMenu project={p} workspaceId={workspaceId} onRemove={onRemove} onEdit={onEdit} onDelete={onDelete} />
          </div>

          {/* Desktop */}
          <div className="hidden md:grid items-center hover:bg-[var(--c-hover)] transition-colors"
            style={{ gridTemplateColumns: GRID_COLS }}>
            {/* Proyecto */}
            <div className="py-2.5 pr-3 min-w-0">
              <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="block">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5 shrink-0"
                  style={{ color: paletteColor(p.code).color, background: paletteColor(p.code).bg }}>{p.code}</span>
                  <span className="font-semibold text-[13px] text-[var(--c-text)] truncate">{p.name}</span>
                </div>
                {p.description && (
                  <p className="text-[11px] text-[var(--c-text-sub)] mt-0.5 truncate pl-[calc(1.5ch+1.25rem)]">{p.description}</p>
                )}
              </Link>
            </div>
            {/* Cycle */}
            <div className="py-2.5 pr-3 text-[12px] text-[var(--c-text-sub)] truncate" title={p.active_cycle ?? undefined}>
              {p.active_cycle ?? '—'}
            </div>
            {/* Progreso */}
            <div className="py-2.5 pr-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--c-border)] overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${p.progress_pct}%`, background: accent }} />
              </div>
              <span className="text-[11px] text-[var(--c-muted)] tabular-nums shrink-0 w-8 text-right">{p.progress_pct}%</span>
            </div>
            {/* Tareas */}
            <div className="py-2.5 pr-3 text-[12px] text-[var(--c-text-sub)] tabular-nums">{p.tasks_done}/{p.tasks_total}</div>
            {/* Equipo */}
            <div className="py-2.5 pr-3 flex items-center">
              {p.team.slice(0, 3).map((m, i) => (
                <span key={m.id ?? m.initials} style={{ marginLeft: i === 0 ? 0 : '-6px', zIndex: p.team.length - i }}
                  className="relative">
                  <Avatar name={m.name} initials={m.initials} url={m.avatar_url}
                    color={m.avatar_color} presence={m.presence_status} size={22} />
                </span>
              ))}
              {p.team.length > 3 && (
                <span className="w-[22px] h-[22px] rounded-full bg-[var(--c-hover)] text-[var(--c-muted)] text-[9px] font-semibold flex items-center justify-center border-2 border-[var(--c-bg)]"
                  style={{ marginLeft: '-6px' }}>+{p.team.length - 3}</span>
              )}
            </div>
            {/* Estado */}
            <div className="py-2.5 pr-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 capitalize"
                style={{ color: statusStyle(p.status).color, background: statusStyle(p.status).bg }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusStyle(p.status).color }} />
                {p.status}
              </span>
            </div>
            {/* Menu */}
            <div className="py-2.5">
              <ProjectRowMenu project={p} workspaceId={workspaceId} onRemove={onRemove} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}

/* ── WorkspaceDetail (right panel / mobile sheet body) ── */
function WorkspaceDetail({
  ws, unassigned, onEditWorkspace, onDeleteWorkspace, onEditProject, onDeleteProject, onRefresh,
}: {
  ws: WorkspaceSummary | null;            // null → unassigned bucket
  unassigned: ProjectSummary[];
  onEditWorkspace: (w: WorkspaceSummary) => void;
  onDeleteWorkspace: (id: string) => void;
  onEditProject: (p: ProjectSummary) => void;
  onDeleteProject: (id: string) => void;
  onRefresh: () => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);

  async function handleRemoveProject(projectId: string) {
    if (!ws) return;
    await apiDelete(`/workspaces/${ws.id}/projects/${projectId}`).catch(console.error);
    onRefresh();
  }

  const projects = ws ? ws.projects : unassigned;
  const pct = aggProgress(projects);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--c-border)]">
        <div className="px-6 pt-5 pb-4">
          {/* Top row */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={ws
                ? { background: ws.color + '1f', boxShadow: `inset 0 0 0 1px ${ws.color}33` }
                : { background: 'var(--c-hover)' }}>
              {ws
                ? <WorkspaceIcon icon={ws.icon} size={26} color={ws.color} />
                : (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--c-muted)" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
                  </svg>
                )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[var(--c-text)] leading-tight tracking-tight">
                  {ws ? ws.name : 'Sin espacio asignado'}
                </h2>
                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0"
                  style={ws
                    ? { color: ws.color, background: ws.color + '1f' }
                    : { color: 'var(--c-muted)', background: 'var(--c-hover)' }}>
                  {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[12px] text-[var(--c-text-sub)] mt-1 truncate">
                {ws
                  ? (ws.description || 'Sin descripción')
                  : 'Proyectos que aún no pertenecen a ningún espacio de trabajo'}
              </p>
            </div>

            {ws && (
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setAssignOpen(true)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-3 py-1.5 hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-[var(--c-bg)] font-[inherit] whitespace-nowrap">
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span className="hidden sm:inline">Asignar proyecto</span>
                </button>
                <WorkspaceMenu ws={ws} onEdit={onEditWorkspace} onDelete={onDeleteWorkspace} />
              </div>
            )}
          </div>

          {/* Stats row: members + progress */}
          <div className="flex items-center gap-4 mt-4">
            {ws && (
              <div className="flex items-center gap-2 shrink-0">
                {ws.members.length > 0 ? (
                  <>
                    <div className="flex items-center">
                      {ws.members.slice(0, 6).map((m, i) => (
                        <span key={m.id} style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: ws.members.length - i }}
                          className="relative">
                          <Avatar name={m.name} initials={m.initials} url={m.avatar_url}
                            color={m.avatar_color} presence={m.presence_status} size={30} />
                        </span>
                      ))}
                      {ws.members.length > 6 && (
                        <span className="w-[30px] h-[30px] rounded-full bg-[var(--c-hover)] text-[var(--c-muted)] text-[10px] font-semibold flex items-center justify-center border-2 border-[var(--c-bg)]"
                          style={{ marginLeft: '-8px' }}>+{ws.members.length - 6}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--c-muted)] font-medium">
                      {ws.members.length} miembro{ws.members.length !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-[var(--c-muted)]">Sin miembros</span>
                )}
              </div>
            )}

            {projects.length > 0 && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 h-2 rounded-full bg-[var(--c-border)] overflow-hidden min-w-[80px]">
                  <div className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${pct}%`, background: ws ? ws.color : 'var(--c-text-sub)' }} />
                </div>
                <span className="text-[11px] font-semibold text-[var(--c-text-sub)] tabular-nums shrink-0">{pct}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-[calc(var(--nav-h)+2rem)] md:pb-4">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-[var(--c-muted)]">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--c-text-sub)]">Sin proyectos</p>
              <p className="text-[12px] mt-0.5">
                {ws ? 'Asigna un proyecto a este espacio' : 'Todos los proyectos están asignados'}
              </p>
            </div>
          </div>
        ) : (
          <ProjectGrid
            projects={projects}
            workspaceId={ws ? ws.id : null}
            accent={ws ? ws.color : 'var(--c-text-sub)'}
            onEdit={onEditProject}
            onDelete={onDeleteProject}
            onRemove={ws ? handleRemoveProject : undefined}
          />
        )}
      </div>

      {ws && assignOpen && (
        <AssignProjectModal
          workspaceId={ws.id}
          unassigned={unassigned}
          onClose={() => setAssignOpen(false)}
          onAssigned={onRefresh}
        />
      )}
    </div>
  );
}

/* ── ListItem ── */
function ListItem({ active, onClick, color, iconNode, name, sub, count }: {
  active: boolean;
  onClick: () => void;
  color: string;
  iconNode: React.ReactNode;
  name: string;
  sub: string;
  count: number;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer border ${
        active
          ? 'bg-[var(--c-hover)] border-[var(--c-border)]'
          : 'bg-transparent border-transparent hover:bg-[var(--c-hover)]'
      }`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color }}>
        {iconNode}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--c-text)] truncate">{name}</p>
        <p className="text-[11px] text-[var(--c-muted)] truncate">{sub}</p>
      </div>
      <span className="text-[10px] font-medium text-[var(--c-muted)] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-full px-2 py-0.5 shrink-0 tabular-nums">
        {count}
      </span>
    </button>
  );
}

/* ── Page ── */
export default function EspaciosPage() {
  const [workspaces,          setWorkspaces]          = useState<WorkspaceSummary[]>([]);
  const [unassigned,          setUnassigned]          = useState<ProjectSummary[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [wsForm,              setWsForm]              = useState<WorkspaceSummary | 'new' | null>(null);
  const [editProject,         setEditProject]         = useState<ProjectSummary | null>(null);
  const [pendingDeleteWsId,   setPendingDeleteWsId]   = useState<string | null>(null);
  const [pendingDeleteProjId, setPendingDeleteProjId] = useState<string | null>(null);
  const [listFilter,          setListFilter]          = useState('');
  const [selectedId,          setSelectedId]          = useState<string | null>(null);
  const [sheetOpen,           setSheetOpen]           = useState(false);
  const dispatch = useUIDispatch();

  const filteredWs = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(ws =>
      ws.name.toLowerCase().includes(q) ||
      (ws.description ?? '').toLowerCase().includes(q));
  }, [workspaces, listFilter]);

  const showUnassigned = unassigned.length > 0 &&
    (!listFilter.trim() || 'sin espacio asignado'.includes(listFilter.trim().toLowerCase()));

  const selectedWs = selectedId && selectedId !== UNASSIGNED
    ? workspaces.find(w => w.id === selectedId) ?? null
    : null;
  const isUnassignedView = selectedId === UNASSIGNED;
  const hasSelection = !!selectedWs || isUnassignedView;

  const load = useCallback(async () => {
    try {
      const [wsRes, uaRes] = await Promise.all([
        apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces'),
        apiGet<ApiWrapped<ProjectSummary[]>>('/workspaces/unassigned-projects'),
      ]);
      setWorkspaces(wsRes.data);
      setUnassigned(uaRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* reload page data + notify Sidebar (re-fetches /workspaces via projectsVersion) */
  const reloadAll = useCallback(async () => {
    await load();
    dispatch(bumpProjects());
  }, [load, dispatch]);

  useEffect(() => { load(); }, [load]);

  /* keep a valid selection after data loads/changes (desktop auto-select) */
  useEffect(() => {
    if (loading) return;
    const stillValid =
      (selectedId === UNASSIGNED && unassigned.length > 0) ||
      (selectedId && workspaces.some(w => w.id === selectedId));
    if (stillValid) return;
    if (workspaces.length > 0) setSelectedId(workspaces[0].id);
    else if (unassigned.length > 0) setSelectedId(UNASSIGNED);
    else setSelectedId(null);
  }, [loading, workspaces, unassigned, selectedId]);

  function selectItem(id: string) {
    setSelectedId(id);
    setSheetOpen(true); // mobile only — sheet is hidden on md+
  }

  async function handleDeleteWorkspace(id: string) {
    await apiDelete(`/workspaces/${id}`).catch(console.error);
    playDelete();
    if (selectedId === id) setSelectedId(null);
    reloadAll();
  }

  async function handleDeleteProject(id: string) {
    await apiDelete(`/projects/${id}`).catch(console.error);
    playDelete();
    dispatch(bumpProjects());
    load();
  }

  function handleProjectSaved(updated: ProjectSummary) {
    // Optimistic in-place patch for snappiness…
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(p => p.id === updated.id ? updated : p),
    })));
    setUnassigned(prev => prev.map(p => p.id === updated.id ? updated : p));
    // …then full reload: the project's workspace assignment may have changed,
    // which moves it between buckets and must refresh the Sidebar too.
    reloadAll();
  }

  const detailProps = {
    unassigned,
    onEditWorkspace: (w: WorkspaceSummary) => setWsForm(w),
    onDeleteWorkspace: setPendingDeleteWsId,
    onEditProject: setEditProject,
    onDeleteProject: setPendingDeleteProjId,
    onRefresh: reloadAll,
  };

  return (
    <div className="-m-6 flex flex-col bg-[var(--c-bg)]" style={{ height: '100dvh' }}>

      {/* Fixed header */}
      <header className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-[var(--c-border)]">
        <div className="shrink-0">
          <h1 className="text-lg font-bold text-[var(--c-text)]">Espacios de trabajo</h1>
          {!loading && (
            <p className="text-[12px] text-[var(--c-muted)] mt-0.5">
              {workspaces.length} espacio{workspaces.length !== 1 ? 's' : ''}
              {unassigned.length > 0 && ` · ${unassigned.length} sin asignar`}
            </p>
          )}
        </div>
        <button type="button" onClick={() => setWsForm('new')}
          className="ml-auto shrink-0 text-sm font-semibold bg-[var(--c-text)] text-[var(--c-bg)] rounded-[0.625rem] px-3 py-1.5 hover:opacity-80 transition-opacity cursor-pointer border-none font-[inherit] whitespace-nowrap">
          + Nuevo espacio
        </button>
      </header>

      {/* Body: master-detail split */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── Left: list ── */}
        <div className="w-full md:w-[320px] md:border-r border-[var(--c-border)] flex flex-col min-h-0">
          {/* Search */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--c-line)]">
            <div className="flex items-center gap-2 border border-[var(--c-border)] rounded-lg px-3 py-2">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
                className="text-[var(--c-muted)] shrink-0" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={listFilter} onChange={e => setListFilter(e.target.value)}
                placeholder="Buscar espacio…"
                className="flex-1 text-sm bg-transparent outline-none text-[var(--c-text)] placeholder:text-[var(--c-muted)] font-[inherit]" />
              {listFilter && (
                <button type="button" onClick={() => setListFilter('')}
                  className="text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none"
                  aria-label="Limpiar">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-1 pb-[calc(var(--nav-h)+2rem)] md:pb-3">
            {loading ? (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            ) : workspaces.length === 0 && unassigned.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-[var(--c-muted)] px-4">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
                <div>
                  <p className="text-sm font-medium text-[var(--c-text-sub)]">Sin espacios de trabajo</p>
                  <p className="text-[12px] mt-0.5">Crea tu primer espacio para organizar proyectos</p>
                </div>
                <button type="button" onClick={() => setWsForm('new')}
                  className="text-sm font-semibold bg-[var(--c-text)] text-[var(--c-bg)] rounded-[0.625rem] px-4 py-2 hover:opacity-80 transition-opacity cursor-pointer border-none font-[inherit]">
                  Crear primer espacio
                </button>
              </div>
            ) : filteredWs.length === 0 && !showUnassigned ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-[var(--c-muted)]">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p className="text-sm">Sin resultados</p>
              </div>
            ) : (
              <>
                {filteredWs.map(ws => (
                  <ListItem
                    key={ws.id}
                    active={selectedId === ws.id}
                    onClick={() => selectItem(ws.id)}
                    color={ws.color + '1a'}
                    iconNode={<WorkspaceIcon icon={ws.icon} size={18} color={ws.color} />}
                    name={ws.name}
                    sub={ws.description || `${ws.members.length} miembro${ws.members.length !== 1 ? 's' : ''}`}
                    count={ws.projects.length}
                  />
                ))}
                {showUnassigned && (
                  <>
                    {filteredWs.length > 0 && <div className="my-1 border-t border-dashed border-[var(--c-border)]" />}
                    <ListItem
                      active={selectedId === UNASSIGNED}
                      onClick={() => selectItem(UNASSIGNED)}
                      color="var(--c-hover)"
                      iconNode={
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--c-muted)" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
                        </svg>
                      }
                      name="Sin espacio asignado"
                      sub="Proyectos sin espacio"
                      count={unassigned.length}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right: detail (desktop) ── */}
        <aside className="hidden md:flex flex-1 min-w-0">
          {loading ? (
            <div className="flex-1 p-6 flex flex-col gap-4">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : !hasSelection ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-[var(--c-muted)] p-6">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <p className="text-sm">Selecciona un espacio para ver sus proyectos</p>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <WorkspaceDetail
                key={selectedId ?? 'none'}
                ws={selectedWs}
                {...detailProps}
              />
            </div>
          )}
        </aside>
      </div>

      {/* ── Mobile bottom sheet ── */}
      {sheetOpen && hasSelection && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end bg-black/30"
          onClick={() => setSheetOpen(false)}>
          <div className="w-full bg-[var(--c-bg)] rounded-t-2xl h-[88dvh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
              <span className="w-10 h-1 rounded-full bg-[var(--c-border)]" />
            </div>
            <div className="flex-1 min-h-0">
              <WorkspaceDetail
                key={selectedId ?? 'none'}
                ws={selectedWs}
                {...detailProps}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {wsForm !== null && (
        <WorkspaceFormModal
          workspace={wsForm === 'new' ? null : wsForm}
          onClose={() => setWsForm(null)}
          onSaved={reloadAll}
        />
      )}

      <EditProjectModal
        project={editProject}
        onClose={() => setEditProject(null)}
        onSaved={handleProjectSaved}
      />

      <ConfirmModal
        open={pendingDeleteWsId !== null}
        title="Eliminar espacio de trabajo"
        message="Se eliminará el espacio pero los proyectos quedarán sin asignar. Esta acción no se puede deshacer."
        onConfirm={() => { if (pendingDeleteWsId) handleDeleteWorkspace(pendingDeleteWsId); setPendingDeleteWsId(null); }}
        onCancel={() => setPendingDeleteWsId(null)}
      />

      <ConfirmModal
        open={pendingDeleteProjId !== null}
        title="Eliminar proyecto"
        message="Se eliminará el proyecto y todas sus tareas permanentemente. Esta acción no se puede deshacer."
        onConfirm={() => { if (pendingDeleteProjId) handleDeleteProject(pendingDeleteProjId); setPendingDeleteProjId(null); }}
        onCancel={() => setPendingDeleteProjId(null)}
      />
    </div>
  );
}
