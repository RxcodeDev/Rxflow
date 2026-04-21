'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useUIDispatch } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';
import type { TaskItem, ProjectSummary, ApiWrapped } from '@/types/api.types';
import ProjectViewTabs from '@/components/features/projects/ProjectViewTabs';
import { STATUS_LABEL, STATUS_STYLE, PRIORITY_LABEL, PRIORITY_STYLE, STATUS_ORDER } from '@/components/features/projects/projectShared';

/* ── Helpers ─────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

/* ── Page ────────────────────────────────────────────── */
export default function ListaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectCode } = use(params);
  const code = projectCode.toUpperCase();
  const dispatch = useUIDispatch();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [tasks,   setTasks]   = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* Filters */
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet<ApiWrapped<ProjectSummary>>(`/projects/${code}`),
      apiGet<ApiWrapped<TaskItem[]>>(`/projects/${code}/tasks`),
    ])
      .then(([pRes, tRes]) => {
        setProject(pRes.data);
        setTasks(tRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code]);

  const filtered = useMemo(() =>
    tasks.filter((t) => {
      if (filterStatus   && t.status !== filterStatus) return false;
      if (filterPriority && t.priority?.toLowerCase() !== filterPriority) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !t.identifier.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [tasks, filterStatus, filterPriority, search],
  );

  /* Group by status for visual separation */
  const grouped = useMemo(() =>
    STATUS_ORDER
      .map(s => ({ status: s, items: filtered.filter(t => t.status === s) }))
      .filter(g => g.items.length > 0),
    [filtered],
  );

  const selectCls =
    'border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm ' +
    'bg-[var(--c-bg)] text-[var(--c-text-sub)] outline-none font-[inherit] cursor-pointer ' +
    'focus:border-[var(--c-text-sub)] transition-colors';

  return (
    <div className="flex flex-col gap-5">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px] text-[var(--c-muted)]" aria-label="Ruta">
        <Link href="/proyectos" className="hover:text-[var(--c-text)] transition-colors">
          Proyectos
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
        {loading
          ? <Skeleton className="w-20 h-4" />
          : <span className="text-[var(--c-text-sub)]">{project?.name ?? code}</span>
        }
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
        <span className="text-[var(--c-text)] font-medium">Lista</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {loading
            ? <Skeleton className="w-40 h-7 mb-1" />
            : <h1 className="text-xl font-bold text-[var(--c-text)]">{project?.name}</h1>
          }
          {loading
            ? <Skeleton className="w-24 h-4 mt-1" />
            : <p className="text-sm text-[var(--c-text-sub)]">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</p>
          }
        </div>

        {/* View tabs */}
        <ProjectViewTabs projectCode={projectCode} active="lista" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </span>
          <input
            type="search"
            placeholder="Buscar tareas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
          />
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
          <option value="">Todos los estados</option>
          {STATUS_ORDER.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectCls}>
          <option value="">Todas las prioridades</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {(filterStatus || filterPriority || search) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); }}
            className="text-xs text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--c-muted)]" aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p className="text-[var(--c-muted)] text-sm">No hay tareas en este proyecto</p>
        </div>
      )}

      {/* No results */}
      {!loading && tasks.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <p className="text-[var(--c-muted)] text-sm">No hay tareas que coincidan con los filtros</p>
        </div>
      )}

      {/* Task list — grouped by status */}
      {!loading && grouped.length > 0 && (
        <div className="flex flex-col gap-6">
          {grouped.map(({ status, items }) => (
            <section key={status}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.backlog}`}>
                  {STATUS_LABEL[status]}
                </span>
                <span className="text-xs text-[var(--c-muted)]">{items.length}</span>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {items.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => dispatch(openDrawer({ taskId: task.id, projectId: projectCode }))}
                    className="text-left w-full border border-[var(--c-border)] rounded-lg p-3 hover:bg-[var(--c-hover)] transition-colors bg-[var(--c-bg)] cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] text-[var(--c-muted)]">{task.identifier}</span>
                      <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize ${PRIORITY_STYLE[task.priority?.toLowerCase()] ?? PRIORITY_STYLE.media}`}>
                        {PRIORITY_LABEL[task.priority?.toLowerCase()] ?? task.priority}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${task.status === 'completada' ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {task.epic_name && (
                        <span className="text-[10px] border border-[var(--c-border)] rounded px-1.5 py-0.5 text-[var(--c-text-sub)]">
                          {task.epic_name}
                        </span>
                      )}
                      {task.assignee_initials && (
                        <div className="w-5 h-5 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[9px] font-semibold flex items-center justify-center">
                          {task.assignee_initials}
                        </div>
                      )}
                      {task.due_date && (
                        <span className="text-[10px] text-[var(--c-text-sub)] ml-auto">
                          {new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto border border-[var(--c-border)] rounded-xl">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--c-border)] bg-[var(--c-hover)]">
                      <th className="text-left text-[11px] font-semibold text-[var(--c-text-sub)] tracking-wide uppercase px-4 py-2.5 w-[90px]">ID</th>
                      <th className="text-left text-[11px] font-semibold text-[var(--c-text-sub)] tracking-wide uppercase px-4 py-2.5">Título</th>
                      <th className="text-left text-[11px] font-semibold text-[var(--c-text-sub)] tracking-wide uppercase px-4 py-2.5 w-[110px]">Prioridad</th>
                      <th className="text-left text-[11px] font-semibold text-[var(--c-text-sub)] tracking-wide uppercase px-4 py-2.5 w-[120px]">Épica</th>
                      <th className="text-left text-[11px] font-semibold text-[var(--c-text-sub)] tracking-wide uppercase px-4 py-2.5 w-[60px]">Asignado</th>
                      <th className="text-left text-[11px] font-semibold text-[var(--c-text-sub)] tracking-wide uppercase px-4 py-2.5 w-[100px]">Vence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((task, idx) => (
                      <tr
                        key={task.id}
                        onClick={() => dispatch(openDrawer({ taskId: task.id, projectId: projectCode }))}
                        className={`cursor-pointer hover:bg-[var(--c-hover)] transition-colors ${idx < items.length - 1 ? 'border-b border-[var(--c-border)]' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] text-[var(--c-muted)]">{task.identifier}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${task.status === 'completada' ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
                            {task.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] border rounded px-1.5 py-0.5 capitalize ${PRIORITY_STYLE[task.priority?.toLowerCase()] ?? PRIORITY_STYLE.media}`}>
                            {PRIORITY_LABEL[task.priority?.toLowerCase()] ?? task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[var(--c-text-sub)]">
                          {task.epic_name ?? <span className="text-[var(--c-muted)]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {task.assignee_initials
                            ? <div className="w-7 h-7 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[11px] font-semibold flex items-center justify-center">{task.assignee_initials}</div>
                            : <div className="w-7 h-7 rounded-full border border-dashed border-[var(--c-border)]" />
                          }
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[var(--c-text-sub)]">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })
                            : <span className="text-[var(--c-muted)]">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
