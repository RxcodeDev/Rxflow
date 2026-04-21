'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { apiGet, apiDelete } from '@/lib/api';
import type { ProjectSummary, ApiWrapped } from '@/types/api.types';
import { useUIDispatch } from '@/store/UIContext';
import { openCreateModal, bumpProjects } from '@/store/slices/uiSlice';
import EditProjectModal from '@/components/features/projects/EditProjectModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { playDelete } from '@/hooks/useSound';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

type Tab = 'todos' | 'activos' | 'archivados';

function ProjectMenu({ project, onEdit, onDelete }: {
  project: ProjectSummary;
  onEdit: (p: ProjectSummary) => void;
  onDelete: (id: string) => void;
}) {
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

export default function ProyectosPage() {
  const [projects,        setProjects]        = useState<ProjectSummary[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [tab,             setTab]             = useState<Tab>('todos');
  const [editProject,     setEditProject]     = useState<ProjectSummary | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const dispatch = useUIDispatch();

  useEffect(() => {
    apiGet<ApiWrapped<ProjectSummary[]>>('/projects')
      .then(res => setProjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await apiDelete(`/projects/${id}`).catch(console.error);
    playDelete();
    dispatch(bumpProjects());
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  function handleSaved(updated: ProjectSummary) {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  }

  const filtered = projects.filter(p => {
    if (tab === 'activos')    return p.status === 'activo';
    if (tab === 'archivados') return p.status === 'archivado';
    return true;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'todos',      label: 'Todos' },
    { key: 'activos',    label: 'Activos' },
    { key: 'archivados', label: 'Archivados' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-[var(--c-text)]">Proyectos</h1>
        <button
          type="button"
          onClick={() => dispatch(openCreateModal('project'))}
          className="text-sm font-semibold text-[var(--c-bg)] bg-[var(--c-text)] rounded-[0.625rem] px-3 py-2 hover:opacity-80 transition-opacity cursor-pointer font-[inherit] border-none"
        >
          + Nuevo proyecto
        </button>
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
            {t.key === 'todos' && !loading && (
              <span className="ml-1.5 text-[11px] text-[var(--c-muted)]">({projects.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 border border-dashed border-[var(--c-border)] rounded-2xl">
          <p className="text-[var(--c-muted)] text-sm mb-3">
            {tab === 'archivados' ? 'No hay proyectos archivados' : 'No hay proyectos aún'}
          </p>
          {tab !== 'archivados' && (
            <button
              type="button"
              onClick={() => dispatch(openCreateModal('project'))}
              className="text-sm text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-4 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]"
            >
              Crear primer proyecto
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(p => (
              <div key={p.id} className="border border-[var(--c-border)] rounded-xl p-4 flex items-center gap-3">
                <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5 shrink-0">{p.code}</span>
                    <span className="font-semibold text-sm text-[var(--c-text)] truncate">{p.name}</span>
                  </div>
                  {p.description && (
                    <p className="text-[12px] text-[var(--c-text-sub)] truncate mb-2">{p.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 rounded-sm bg-[var(--c-border)] overflow-hidden">
                      <div className="h-full bg-[var(--c-text)] rounded-sm" style={{ width: `${p.progress_pct}%` }} />
                    </div>
                    <span className="text-[11px] text-[var(--c-muted)] tabular-nums">{p.progress_pct}%</span>
                  </div>
                </Link>
                <ProjectMenu project={p} onEdit={setEditProject} onDelete={setPendingDeleteId} />
              </div>
            ))}
          </div>

          {/* Desktop table */}
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
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-[var(--c-line)] hover:bg-[var(--c-hover)] transition-colors">
                    <td className="py-3 pr-4">
                      <Link href={`/proyectos/${p.code.toLowerCase()}/board`} className="block">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5 shrink-0">{p.code}</span>
                          <span className="font-semibold text-sm text-[var(--c-text)]">{p.name}</span>
                        </div>
                        {p.description && (
                          <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5 truncate max-w-[200px]">{p.description}</p>
                        )}
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
                    <td className="py-3 pr-4 text-[13px] text-[var(--c-text-sub)] tabular-nums whitespace-nowrap">
                      {p.tasks_done}/{p.tasks_total}
                    </td>
                    <td className="py-3 pr-4 text-[13px] text-[var(--c-text-sub)] whitespace-nowrap">
                      {p.active_cycle ?? '—'}
                    </td>
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
                      <span className="text-[11px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded px-2 py-0.5 capitalize">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <ProjectMenu project={p} onEdit={setEditProject} onDelete={setPendingDeleteId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

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
    </div>
  );
}
