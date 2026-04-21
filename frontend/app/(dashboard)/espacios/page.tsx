'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { WorkspaceSummary, ProjectSummary, ApiWrapped } from '@/types/api.types';
import { useUIDispatch } from '@/store/UIContext';
import { openCreateModal, bumpProjects } from '@/store/slices/uiSlice';
import EditProjectModal from '@/components/features/projects/EditProjectModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { playDelete, playSuccess } from '@/hooks/useSound';

/* ── Constants ── */
const WORKSPACE_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#64748b',
];
const WORKSPACE_ICON_NAMES = ['layers', 'code', 'target', 'briefcase', 'monitor', 'zap', 'globe', 'star'] as const;
type IconName = typeof WORKSPACE_ICON_NAMES[number];

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
        className="p-1.5 rounded hover:bg-[var(--c-hover)] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
        aria-label="Opciones del espacio">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
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
        className="p-1.5 rounded hover:bg-[var(--c-hover)] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
        aria-label="Opciones del proyecto">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
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
              className="flex-1 border border-[var(--c-border)] rounded-lg py-2 text-sm text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit]">
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

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

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
          <div className="flex flex-col gap-1">
            {unassigned.map(p => (
              <button key={p.id} type="button" disabled={loading} onClick={() => assign(p.id)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent border-none w-full disabled:opacity-50">
                <span className="font-mono text-[11px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5 shrink-0">{p.code}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--c-text)] truncate">{p.name}</p>
                  {p.description && <p className="text-[12px] text-[var(--c-muted)] truncate">{p.description}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ProjectsTable ── */
function ProjectsTable({ projects, workspaceId, onEdit, onDelete, onRemove }: {
  projects: ProjectSummary[];
  workspaceId: string | null;
  onEdit: (p: ProjectSummary) => void;
  onDelete: (id: string) => void;
  onRemove?: (projectId: string) => void;
}) {
  if (projects.length === 0) {
    return <p className="text-sm text-[var(--c-muted)] py-3">Sin proyectos asignados aún</p>;
  }
  return (
    <>
      {/* Mobile */}
      <div className="flex flex-col divide-y divide-[var(--c-line)] md:hidden">
        {projects.map(p => (
          <div key={p.id} className="py-3 flex items-center gap-3">
            <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono text-[11px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5 shrink-0">{p.code}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--c-text)] truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-16 h-1 rounded-sm bg-[var(--c-border)] overflow-hidden">
                    <div className="h-full bg-[var(--c-text)] rounded-sm" style={{ width: `${p.progress_pct}%` }} />
                  </div>
                  <span className="text-[11px] text-[var(--c-muted)] tabular-nums">{p.progress_pct}%</span>
                </div>
              </div>
            </Link>
            <ProjectRowMenu project={p} workspaceId={workspaceId} onRemove={onRemove} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
      </div>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              {['Proyecto', 'Progreso', 'Tareas', 'Cycle', 'Equipo', 'Estado', ''].map(col => (
                <th key={col} className="text-left text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] pb-2 pr-4 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} className="border-b border-[var(--c-line)] hover:bg-[var(--c-hover)] transition-colors">
                <td className="py-3 pr-4">
                  <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="block">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5 shrink-0">{p.code}</span>
                      <span className="font-semibold text-sm text-[var(--c-text)]">{p.name}</span>
                    </div>
                    {p.description && <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5 truncate max-w-[200px]">{p.description}</p>}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 rounded-sm bg-[var(--c-border)] overflow-hidden shrink-0">
                      <div className="h-full bg-[var(--c-text)] rounded-sm" style={{ width: `${p.progress_pct}%` }} />
                    </div>
                    <span className="text-[11px] text-[var(--c-text-sub)] tabular-nums">{p.progress_pct}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-[13px] text-[var(--c-text-sub)] tabular-nums whitespace-nowrap">{p.tasks_done}/{p.tasks_total}</td>
                <td className="py-3 pr-4 text-[13px] text-[var(--c-text-sub)] whitespace-nowrap">{p.active_cycle ?? '—'}</td>
                <td className="py-3 pr-4">
                  <div className="flex">
                    {p.team.slice(0, 3).map((m, i) => (
                      <div key={m.initials}
                        className="w-6 h-6 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[10px] font-semibold flex items-center justify-center border-2 border-[var(--c-bg)]"
                        style={{ marginLeft: i === 0 ? 0 : '-6px', zIndex: p.team.length - i }}
                        title={m.name}>{m.initials}</div>
                    ))}
                    {p.team.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[10px] font-semibold flex items-center justify-center border-2 border-[var(--c-bg)]"
                        style={{ marginLeft: '-6px' }}>+{p.team.length - 3}</div>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-[11px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded px-2 py-0.5 capitalize">{p.status}</span>
                </td>
                <td className="py-3">
                  <ProjectRowMenu project={p} workspaceId={workspaceId} onRemove={onRemove} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── WorkspaceCard ── */
function WorkspaceCard({ ws, unassigned, onEditWorkspace, onDeleteWorkspace, onEditProject, onDeleteProject, onRefresh }: {
  ws: WorkspaceSummary;
  unassigned: ProjectSummary[];
  onEditWorkspace: (w: WorkspaceSummary) => void;
  onDeleteWorkspace: (id: string) => void;
  onEditProject: (p: ProjectSummary) => void;
  onDeleteProject: (id: string) => void;
  onRefresh: () => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);

  async function handleRemoveProject(projectId: string) {
    await apiDelete(`/workspaces/${ws.id}/projects/${projectId}`).catch(console.error);
    onRefresh();
  }

  return (
    <>
      <div className="border border-[var(--c-border)] rounded-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-4" style={{ borderLeft: `4px solid ${ws.color}` }}>
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ backgroundColor: ws.color + '22' }}>
            <WorkspaceIcon icon={ws.icon} size={18} color={ws.color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--c-text)]">{ws.name}</p>
            {ws.description && <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5 truncate">{ws.description}</p>}
            {ws.members.length > 0 && (
              <div className="flex items-center mt-2">
                {ws.members.slice(0, 6).map((m, i) => (
                  <div key={m.id}
                    className="w-6 h-6 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[10px] font-semibold flex items-center justify-center border-2 border-[var(--c-bg)]"
                    style={{ marginLeft: i === 0 ? 0 : '-6px', zIndex: ws.members.length - i }}
                    title={m.name}>{m.initials}</div>
                ))}
                {ws.members.length > 6 && (
                  <span className="text-[11px] text-[var(--c-muted)] ml-2">+{ws.members.length - 6}</span>
                )}
              </div>
            )}
          </div>
          <WorkspaceMenu ws={ws} onEdit={onEditWorkspace} onDelete={onDeleteWorkspace} />
        </div>
        <div className="px-4 pb-2 border-t border-[var(--c-line)]">
          <ProjectsTable
            projects={ws.projects}
            workspaceId={ws.id}
            onEdit={onEditProject}
            onDelete={onDeleteProject}
            onRemove={handleRemoveProject}
          />
        </div>
        <div className="px-4 pb-4">
          <button type="button" onClick={() => setAssignOpen(true)}
            className="text-[12px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit] flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Asignar proyecto
          </button>
        </div>
      </div>
      {assignOpen && (
        <AssignProjectModal
          workspaceId={ws.id}
          unassigned={unassigned}
          onClose={() => setAssignOpen(false)}
          onAssigned={onRefresh}
        />
      )}
    </>
  );
}

export default function EspaciosPage() {
  const [workspaces,         setWorkspaces]         = useState<WorkspaceSummary[]>([]);
  const [unassigned,         setUnassigned]         = useState<ProjectSummary[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [wsForm,             setWsForm]             = useState<WorkspaceSummary | 'new' | null>(null);
  const [editProject,        setEditProject]        = useState<ProjectSummary | null>(null);
  const [pendingDeleteWsId,  setPendingDeleteWsId]  = useState<string | null>(null);
  const [pendingDeleteProjId,setPendingDeleteProjId]= useState<string | null>(null);
  const dispatch = useUIDispatch();

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

  useEffect(() => { load(); }, [load]);

  async function handleDeleteWorkspace(id: string) {
    await apiDelete(`/workspaces/${id}`).catch(console.error);
    playDelete();
    load();
  }

  async function handleDeleteProject(id: string) {
    await apiDelete(`/projects/${id}`).catch(console.error);
    playDelete();
    dispatch(bumpProjects());
    load();
  }

  function handleProjectSaved(updated: ProjectSummary) {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(p => p.id === updated.id ? updated : p),
    })));
    setUnassigned(prev => prev.map(p => p.id === updated.id ? updated : p));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-[var(--c-text)]">Espacios de trabajo</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => dispatch(openCreateModal('project'))}
            className="text-sm text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-3 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]">
            + Nuevo proyecto
          </button>
          <button type="button" onClick={() => setWsForm('new')}
            className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-3 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]">
            + Nuevo espacio
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-5">
          {workspaces.map(ws => (
            <WorkspaceCard
              key={ws.id}
              ws={ws}
              unassigned={unassigned}
              onEditWorkspace={w => setWsForm(w)}
              onDeleteWorkspace={setPendingDeleteWsId}
              onEditProject={setEditProject}
              onDeleteProject={setPendingDeleteProjId}
              onRefresh={load}
            />
          ))}

          {workspaces.length === 0 && (
            <div className="text-center py-12 border border-dashed border-[var(--c-border)] rounded-2xl">
              <p className="text-[var(--c-muted)] text-sm mb-3">Aún no tienes espacios de trabajo</p>
              <button type="button" onClick={() => setWsForm('new')}
                className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-4 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]">
                Crear primer espacio
              </button>
            </div>
          )}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="border border-dashed border-[var(--c-border)] rounded-2xl p-4">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-3">
                Sin espacio de trabajo
              </p>
              <ProjectsTable
                projects={unassigned}
                workspaceId={null}
                onEdit={setEditProject}
                onDelete={setPendingDeleteProjId}
              />
            </div>
          )}
        </div>
      )}

      {wsForm !== null && (
        <WorkspaceFormModal
          workspace={wsForm === 'new' ? null : wsForm}
          onClose={() => setWsForm(null)}
          onSaved={load}
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
