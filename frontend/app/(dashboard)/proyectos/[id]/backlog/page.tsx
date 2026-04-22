'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { useUIDispatch, useUIState } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';
import type { TaskItem, ProjectSummary, ApiWrapped } from '@/types/api.types';
import ProjectViewTabs from '@/components/features/projects/ProjectViewTabs';
import { PRIORITY_LABEL, PRIORITY_STYLE } from '@/components/features/projects/projectShared';

/* ── Helpers ─────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

const PROMOTION_TARGETS = ['en_progreso', 'en_revision'] as const;
const PROMOTION_LABEL: Record<string, string> = {
  en_progreso: 'En progreso',
  en_revision: 'En revisión',
};

/* ── Page ────────────────────────────────────────────── */
export default function BacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectCode } = use(params);
  const code = projectCode.toUpperCase();
  const dispatch = useUIDispatch();
  const { tasksVersion } = useUIState();

  const [project,  setProject]  = useState<ProjectSummary | null>(null);
  const [tasks,    setTasks]    = useState<TaskItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  /* Filters */
  const [search,         setSearch]         = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet<ApiWrapped<ProjectSummary>>(`/projects/${code}`),
      apiGet<ApiWrapped<TaskItem[]>>(`/projects/${code}/tasks`),
    ])
      .then(([pRes, tRes]) => {
        setProject(pRes.data);
        /* backlog = tasks not yet started */
        setTasks(tRes.data.filter(t => t.status === 'backlog'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code, tasksVersion]);

  const filtered = useMemo(() =>
    tasks.filter((t) => {
      if (filterPriority && t.priority?.toLowerCase() !== filterPriority) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !t.identifier.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [tasks, filterPriority, search],
  );

  async function promoteTask(taskId: string, status: string) {
    setMovingId(taskId);
    try {
      await apiPatch(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error(err);
    } finally {
      setMovingId(null);
    }
  }

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
        <span className="text-[var(--c-text)] font-medium">Backlog</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {loading
            ? <Skeleton className="w-40 h-7 mb-1" />
            : <h1 className="text-xl font-bold text-[var(--c-text)]">{project?.name}</h1>
          }
          {loading
            ? <Skeleton className="w-32 h-4 mt-1" />
            : <p className="text-sm text-[var(--c-text-sub)]">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en backlog</p>
          }
        </div>

        {/* View tabs */}
        <ProjectViewTabs projectCode={projectCode} active="backlog" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </span>
          <input
            type="search"
            placeholder="Buscar en backlog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
          />
        </div>

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectCls}>
          <option value="">Todas las prioridades</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {(filterPriority || search) && (
          <button
            onClick={() => { setSearch(''); setFilterPriority(''); }}
            className="text-xs text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      )}

      {/* Empty backlog */}
      {!loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--c-muted)]" aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M5 12h14M5 16h6"/>
          </svg>
          <div>
            <p className="text-[var(--c-text)] text-sm font-medium">El backlog está vacío</p>
            <p className="text-[var(--c-muted)] text-xs mt-0.5">Las tareas sin iniciar aparecerán aquí</p>
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && tasks.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <p className="text-[var(--c-muted)] text-sm">No hay tareas que coincidan con los filtros</p>
        </div>
      )}

      {/* Task list */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((task) => (
              <div
                key={task.id}
                className="border border-[var(--c-border)] rounded-lg p-3 bg-[var(--c-bg)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => dispatch(openDrawer({ taskId: task.id, projectId: projectCode }))}
                    className="font-mono text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
                  >
                    {task.identifier}
                  </button>
                  <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize ${PRIORITY_STYLE[task.priority?.toLowerCase()] ?? PRIORITY_STYLE.media}`}>
                    {PRIORITY_LABEL[task.priority?.toLowerCase()] ?? task.priority}
                  </span>
                </div>
                <button
                  onClick={() => dispatch(openDrawer({ taskId: task.id, projectId: projectCode }))}
                  className="text-left text-sm font-medium text-[var(--c-text)] hover:text-[var(--c-text-sub)] transition-colors w-full cursor-pointer"
                >
                  {task.title}
                </button>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {task.epic_name && (
                    <span className="text-[10px] border border-[var(--c-border)] rounded px-1.5 py-0.5 text-[var(--c-text-sub)]">{task.epic_name}</span>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    {PROMOTION_TARGETS.map(target => (
                      <button
                        key={target}
                        onClick={() => promoteTask(task.id, target)}
                        disabled={movingId === task.id}
                        className="text-[10px] border border-[var(--c-border)] rounded px-2 py-0.5 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors disabled:opacity-50 cursor-pointer font-[inherit]"
                      >
                        → {PROMOTION_LABEL[target]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
                  <th className="text-left text-[11px] font-semibold text-[var(--c-text-sub)] tracking-wide uppercase px-4 py-2.5 w-[200px]">Mover a</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task, idx) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-[var(--c-hover)] transition-colors ${idx < filtered.length - 1 ? 'border-b border-[var(--c-border)]' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--c-muted)]">
                      <button
                        onClick={() => dispatch(openDrawer({ taskId: task.id, projectId: projectCode }))}
                        className="hover:text-[var(--c-text)] transition-colors cursor-pointer"
                      >
                        {task.identifier}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => dispatch(openDrawer({ taskId: task.id, projectId: projectCode }))}
                        className="text-left font-medium text-[var(--c-text)] hover:text-[var(--c-text-sub)] transition-colors cursor-pointer"
                      >
                        {task.title}
                      </button>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {PROMOTION_TARGETS.map(target => (
                          <button
                            key={target}
                            onClick={() => promoteTask(task.id, target)}
                            disabled={movingId === task.id}
                            className="text-[11px] border border-[var(--c-border)] rounded px-2 py-1 text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors disabled:opacity-50 cursor-pointer font-[inherit] whitespace-nowrap"
                          >
                            {PROMOTION_LABEL[target]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
