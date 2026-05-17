'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { apiGet, apiDelete } from '@/lib/api';
import type { ProjectSummary, ApiWrapped } from '@/types/api.types';
import { useUIDispatch } from '@/store/UIContext';
import { openCreateModal, bumpProjects } from '@/store/slices/uiSlice';
import EditProjectModal from '@/components/features/projects/EditProjectModal';
import ImportProjectModal from '@/components/features/projects/ImportProjectModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SearchSelect, { paletteColor } from '@/components/ui/SearchSelect';
import Tooltip from '@/components/ui/Tooltip';
import Avatar from '@/components/ui/Avatar';
import { playDelete } from '@/hooks/useSound';

/* ── Helpers ──────────────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

type Tab = 'todos' | 'activos' | 'archivados';
type View = 'grid' | 'tabla';
type SortKey = 'name' | 'progress' | 'tasks' | 'status';

function statusStyle(status: string): { dot: string; label: string } {
  const s = (status || '').toLowerCase();
  if (s === 'activo' || s === 'active') return { dot: 'var(--c-success)', label: status };
  if (s === 'archivado' || s === 'archived') return { dot: 'var(--c-muted)', label: status };
  if (s === 'pausado' || s === 'paused') return { dot: '#f59e0b', label: status };
  return { dot: '#6366f1', label: status };
}

function progressColor(pct: number): string {
  if (pct >= 100) return 'var(--c-success)';
  if (pct >= 60) return 'var(--c-text)';
  if (pct >= 25) return '#f59e0b';
  return 'var(--c-muted)';
}

function TeamStack({ team }: { team: ProjectSummary['team'] }) {
  if (!team || team.length === 0) {
    return <span className="text-[12px] text-[var(--c-muted)]">Sin equipo</span>;
  }
  return (
    <div className="flex">
      {team.slice(0, 4).map((m, i) => (
        <span key={m.id ?? m.initials} style={{ marginLeft: i === 0 ? 0 : '-7px', zIndex: team.length - i }}>
          <Avatar name={m.name} initials={m.initials} url={m.avatar_url}
            color={m.avatar_color} presence={m.presence_status} size={24} />
        </span>
      ))}
      {team.length > 4 && (
        <span
          className="w-6 h-6 rounded-full bg-[var(--c-hover)] text-[var(--c-text-sub)] text-[10px] font-semibold flex items-center justify-center border-2 border-[var(--c-bg)]"
          style={{ marginLeft: '-7px' }}>
          +{team.length - 4}
        </span>
      )}
    </div>
  );
}

/* ── Context menu (fixed-positioned, escapes overflow) ────────── */
function ProjectMenu({ project, onEdit, onDelete, onImport }: {
  project: ProjectSummary;
  onEdit: (p: ProjectSummary) => void;
  onDelete: (id: string) => void;
  onImport: (p: ProjectSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent text-[var(--c-muted)] hover:border-[var(--c-border)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
        aria-label="Opciones del proyecto">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 9999 }}
          className="min-w-[170px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg py-1 text-sm">
          <Link href={`/proyectos/${project.code.toLowerCase()}/board`} onClick={() => setOpen(false)}
            className="flex items-center px-3 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors">
            Abrir board
          </Link>
          <button type="button" onClick={() => { setOpen(false); onEdit(project); }}
            className="w-full text-left px-3 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors cursor-pointer">
            Editar proyecto
          </button>
          <button type="button" onClick={() => { setOpen(false); onImport(project); }}
            className="w-full text-left px-3 py-2 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors cursor-pointer">
            Importar / Exportar
          </button>
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

/* ── Project card ─────────────────────────────────────────────── */
function ProjectCard({ p, onEdit, onDelete, onImport }: {
  p: ProjectSummary;
  onEdit: (p: ProjectSummary) => void;
  onDelete: (id: string) => void;
  onImport: (p: ProjectSummary) => void;
}) {
  const accent = paletteColor(p.code);
  const st = statusStyle(p.status);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] hover:border-[var(--c-text-sub)]">
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent.color }} aria-hidden="true" />
      <div className="p-5 pl-6">
        <div className="flex items-start gap-3">
          <span
            className="font-mono text-[11px] font-semibold rounded-md px-1.5 py-1 shrink-0"
            style={{ color: accent.color, background: accent.bg }}>
            {p.code}
          </span>
          <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] text-[var(--c-text)] leading-tight truncate">{p.name}</h3>
            <p className="text-[12px] text-[var(--c-text-sub)] truncate mt-0.5">{p.description || 'Sin descripción'}</p>
          </Link>
          <ProjectMenu project={p} onEdit={onEdit} onDelete={onDelete} onImport={onImport} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[var(--c-muted)]">Progreso</span>
            <span className="text-[13px] font-semibold tabular-nums text-[var(--c-text)]">{p.progress_pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--c-hover)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${p.progress_pct}%`, background: progressColor(p.progress_pct) }} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[12px] text-[var(--c-text-sub)] min-w-0">
            <span className="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              {p.tasks_done}/{p.tasks_total}
            </span>
            <span className="inline-flex items-center gap-1 truncate" title={p.active_cycle ?? undefined}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span className="truncate">{p.active_cycle ?? 'Sin cycle'}</span>
            </span>
          </div>
          <TeamStack team={p.team} />
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--c-line)] flex items-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--c-text-sub)] capitalize">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
            {st.label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function ProyectosPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('todos');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [view, setView] = useState<View>('grid');
  const [editProject, setEditProject] = useState<ProjectSummary | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [importProject, setImportProject] = useState<ProjectSummary | null>(null);
  const dispatch = useUIDispatch();

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('rxflow_projects_view') : null;
    if (saved === 'grid' || saved === 'tabla') setView(saved);
  }, []);

  useEffect(() => {
    apiGet<ApiWrapped<ProjectSummary[]>>('/projects')
      .then(res => setProjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function changeView(v: View) {
    setView(v);
    window.localStorage.setItem('rxflow_projects_view', v);
  }

  async function handleDelete(id: string) {
    await apiDelete(`/projects/${id}`).catch(console.error);
    playDelete();
    dispatch(bumpProjects());
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  function handleSaved(updated: ProjectSummary) {
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  }

  const counts = useMemo(() => ({
    todos: projects.length,
    activos: projects.filter(p => p.status === 'activo').length,
    archivados: projects.filter(p => p.status === 'archivado').length,
  }), [projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter(p => {
      if (tab === 'activos' && p.status !== 'activo') return false;
      if (tab === 'archivados' && p.status !== 'archivado') return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'progress') return b.progress_pct - a.progress_pct;
      if (sort === 'tasks') return b.tasks_total - a.tasks_total;
      if (sort === 'status') return a.status.localeCompare(b.status) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [projects, tab, query, sort]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: counts.todos },
    { key: 'activos', label: 'Activos', count: counts.activos },
    { key: 'archivados', label: 'Archivados', count: counts.archivados },
  ];

  const sortOptions = [
    { value: 'name', label: 'Nombre (A–Z)' },
    { value: 'progress', label: 'Mayor progreso' },
    { value: 'tasks', label: 'Más tareas' },
    { value: 'status', label: 'Estado' },
  ];

  const tableCols: { key: SortKey | null; label: string }[] = [
    { key: 'name', label: 'Proyecto' },
    { key: 'progress', label: 'Progreso' },
    { key: 'tasks', label: 'Tareas' },
    { key: null, label: 'Cycle' },
    { key: null, label: 'Equipo' },
    { key: 'status', label: 'Estado' },
    { key: null, label: '' },
  ];

  return (
    <div className="-m-6 flex flex-col bg-[var(--c-bg)]" style={{ height: '100dvh' }}>
      {/* Fixed header — title + toolbar + tabs */}
      <div className="flex-shrink-0 px-6 pt-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Proyectos</h1>
          {!loading && (
            <span className="text-sm text-[var(--c-muted)] tabular-nums">{counts.todos}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => dispatch(openCreateModal('project'))}
          className="text-sm font-semibold text-[var(--c-bg)] bg-[var(--c-text)] rounded-[0.625rem] px-3.5 py-2 hover:opacity-80 transition-opacity cursor-pointer font-[inherit] border-none"
        >
          + Nuevo proyecto
        </button>
      </div>

      {/* Toolbar: search + sort + view toggle */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 md:max-w-sm">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-[0.625rem] border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-60">
            <SearchSelect
              options={sortOptions}
              value={sort}
              onChange={v => setSort(v as SortKey)}
              hideNone
              placeholder="Ordenar"
              searchPlaceholder="Ordenar por…"
            />
          </div>

          {/* View toggle — desktop only (mobile is always cards) */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-[0.625rem] border border-[var(--c-border)]">
            <Tooltip content="Vista de tarjetas" side="bottom">
              <button
                type="button"
                onClick={() => changeView('grid')}
                aria-label="Vista de tarjetas"
                className={
                  'w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer bg-transparent ' +
                  (view === 'grid'
                    ? 'bg-[var(--c-hover)] text-[var(--c-text)]'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)]')
                }
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip content="Vista de tabla" side="bottom">
              <button
                type="button"
                onClick={() => changeView('tabla')}
                aria-label="Vista de tabla"
                className={
                  'w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer bg-transparent ' +
                  (view === 'tabla'
                    ? 'bg-[var(--c-hover)] text-[var(--c-text)]'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)]')
                }
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--c-border)]">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer bg-transparent font-[inherit] ' +
              (tab === t.key
                ? 'border-[var(--c-text)] text-[var(--c-text)]'
                : 'border-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]')
            }
          >
            {t.label}
            {!loading && (
              <span className="ml-1.5 text-[11px] text-[var(--c-muted)] tabular-nums">({t.count})</span>
            )}
          </button>
        ))}
      </div>
      </div>

      {/* Content area — fills remaining height; scroll lives inside each view */}
      <div className="flex-1 min-h-0 px-6 py-5 flex flex-col">
      {/* Loading */}
      {loading && (
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && visible.length === 0 && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5"
            aria-hidden="true" className="text-[var(--c-muted)]">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-[var(--c-muted)] text-sm">
            {query
              ? `Sin resultados para “${query}”`
              : tab === 'archivados'
                ? 'No hay proyectos archivados'
                : 'No hay proyectos aún'}
          </p>
          {!query && tab !== 'archivados' && (
            <button
              type="button"
              onClick={() => dispatch(openCreateModal('project'))}
              className="text-sm text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-4 py-2 bg-transparent hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer font-[inherit]"
            >
              Crear primer proyecto
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!loading && visible.length > 0 && (
        <>
          {/* Mobile — always cards, single scroll container (cards keep natural height) */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto -mx-1">
            <div className="grid grid-cols-1 gap-4 px-1 py-1 pb-[calc(var(--nav-h)+2rem)]">
              {visible.map(p => (
                <ProjectCard key={p.id} p={p} onEdit={setEditProject} onDelete={setPendingDeleteId} onImport={setImportProject} />
              ))}
            </div>
          </div>

          {/* Desktop — grid or table */}
          <div className="hidden md:flex flex-1 min-h-0">
            {view === 'grid' ? (
              <div className="flex-1 min-h-0 overflow-y-auto -mx-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 px-1 py-1">
                  {visible.map(p => (
                    <ProjectCard key={p.id} p={p} onEdit={setEditProject} onDelete={setPendingDeleteId} onImport={setImportProject} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-[var(--c-border)]">
                <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[var(--c-border)] bg-[var(--c-hover)]">
                      {tableCols.map(col => {
                        const active = col.key && sort === col.key;
                        return (
                          <th key={col.label || 'menu'}
                            className="text-left text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] px-4 py-3 whitespace-nowrap">
                            {col.key ? (
                              <button
                                type="button"
                                onClick={() => setSort(col.key as SortKey)}
                                className={
                                  'inline-flex items-center gap-1 bg-transparent cursor-pointer font-[inherit] uppercase tracking-widest transition-colors ' +
                                  (active ? 'text-[var(--c-text)]' : 'text-[var(--c-muted)] hover:text-[var(--c-text-sub)]')
                                }
                              >
                                {col.label}
                                {active && (
                                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                    <path d="M6 9l6 6 6-6" />
                                  </svg>
                                )}
                              </button>
                            ) : (
                              col.label
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(p => {
                      const accent = paletteColor(p.code);
                      const st = statusStyle(p.status);
                      return (
                        <tr key={p.id} className="border-b border-[var(--c-line)] last:border-0 hover:bg-[var(--c-hover)] transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="flex items-center gap-2.5 group/row">
                              <span className="font-mono text-[11px] font-semibold rounded-md px-1.5 py-1 shrink-0"
                                style={{ color: accent.color, background: accent.bg }}>
                                {p.code}
                              </span>
                              <span className="min-w-0">
                                <span className="block font-semibold text-sm text-[var(--c-text)] truncate group-hover/row:underline">{p.name}</span>
                                {p.description && (
                                  <span className="block text-[12px] text-[var(--c-text-sub)] truncate max-w-[260px]">{p.description}</span>
                                )}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 w-40">
                              <div className="flex-1 h-1.5 rounded-full bg-[var(--c-hover)] overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${p.progress_pct}%`, background: progressColor(p.progress_pct) }} />
                              </div>
                              <span className="text-[12px] font-medium text-[var(--c-text-sub)] tabular-nums w-9 text-right">{p.progress_pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-[var(--c-text-sub)] tabular-nums whitespace-nowrap">
                            {p.tasks_done}/{p.tasks_total}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-[var(--c-text-sub)] whitespace-nowrap max-w-[160px] truncate">
                            {p.active_cycle ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <TeamStack team={p.team} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--c-text-sub)] capitalize whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <ProjectMenu project={p} onEdit={setEditProject} onDelete={setPendingDeleteId} onImport={setImportProject} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </div>

      <EditProjectModal
        project={editProject}
        onClose={() => setEditProject(null)}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={pendingDeleteId !== null}
        title="Eliminar proyecto"
        message="Se eliminará el proyecto y todas sus tareas permanentemente. Esta acción no se puede deshacer."
        onConfirm={() => { if (pendingDeleteId) handleDelete(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

      {importProject && (
        <ImportProjectModal
          projectCode={importProject.code}
          projectName={importProject.name}
          onClose={() => setImportProject(null)}
        />
      )}
    </div>
  );
}
