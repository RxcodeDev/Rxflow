'use client';

import { useState, useEffect, use, useMemo, useCallback } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { TaskItem, ProjectSummary, ApiWrapped } from '@/types/api.types';
import Modal from '@/components/ui/Modal';
import { useUIDispatch } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';
import ProjectViewTabs from '@/components/features/projects/ProjectViewTabs';
import TaskCreateModal from '@/components/features/projects/TaskCreateModal';

/* ── Types ───────────────────────────────────────────── */
type StatusKey = 'backlog' | 'en_progreso' | 'en_revision' | 'bloqueado' | 'completada';

interface EpicItem   { id: string; name: string }
interface MemberItem { id: string; name: string; initials: string }

const COLUMN_META: { key: StatusKey; name: string; wip?: number }[] = [
  { key: 'backlog',      name: 'Backlog' },
  { key: 'en_progreso',  name: 'En progreso', wip: 3 },
  { key: 'en_revision',  name: 'En revisión' },
  { key: 'bloqueado',    name: 'Bloqueado' },
  { key: 'completada',   name: 'Completadas' },
];

const COL_BADGE: Record<StatusKey, { bg: string; color: string }> = {
  backlog:     { bg: '#e2e8f0', color: '#475569' },
  en_progreso: { bg: '#ede9fe', color: '#6d28d9' },
  en_revision: { bg: '#fef3c7', color: '#b45309' },
  bloqueado:   { bg: '#fee2e2', color: '#b91c1c' },
  completada:  { bg: '#d1fae5', color: '#065f46' },
};

const PRIORITIES = ['urgente', 'alta', 'media', 'baja'] as const;
type Priority = typeof PRIORITIES[number];

const selectCls =
  'border border-[var(--c-border)] rounded-[6px] px-3 py-1.5 text-[13px] ' +
  'bg-[var(--c-bg)] text-[var(--c-text-sub)] outline-none font-[inherit] cursor-pointer ' +
  'focus:border-[var(--c-text-sub)] transition-colors';

const fieldCls =
  'w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm ' +
  'bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] ' +
  'outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]';

const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'text-[var(--c-danger)] border-[var(--c-danger)]',
  alta:    'text-[var(--c-text-sub)] border-[var(--c-text-sub)]',
  media:   'text-[var(--c-text-sub)] border-[var(--c-border)]',
  baja:    'text-[var(--c-muted)] border-[var(--c-border)]',
};

/* ── Skeleton ────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

/* ── TaskCard ────────────────────────────────────────── */
function TaskCard({
  task, onOpen, onDragStart, dragging, accent,
}: {
  task: TaskItem;
  onOpen: (id: string) => void;
  onDragStart: (id: string) => void;
  dragging: boolean;
  accent: string;
}) {
  const prio = (task.priority ?? 'media').toLowerCase();
  return (
    <div
      draggable
      onClick={() => onOpen(task.id)}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task.id); }}
      className="border border-[var(--c-border)] rounded-lg p-3 mb-2 bg-[var(--c-bg)] hover:bg-[var(--c-hover)] cursor-grab active:cursor-grabbing transition-all select-none"
      style={{
        borderLeft: `3px solid ${accent}`,
        opacity: dragging ? 0.35 : 1,
        transform: dragging ? 'scale(0.97)' : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-[var(--c-muted)]">{task.identifier}</span>
        <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize ${PRIORITY_COLOR[prio] ?? PRIORITY_COLOR.media}`}>
          {task.priority ?? 'media'}
        </span>
      </div>
      <p className={`text-sm font-medium mt-1 ${task.status === 'completada' ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
        {task.title}
      </p>
      {task.epic_name && (
        <span className="mt-1.5 inline-block text-[10px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5">
          {task.epic_name}
        </span>
      )}
      <div className="flex items-center justify-between mt-2">
        {task.assignee_initials ? (
          <div className="w-6 h-6 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[10px] font-semibold flex items-center justify-center">
            {task.assignee_initials}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border border-dashed border-[var(--c-border)]" />
        )}
        {task.due_date && (
          <span className="text-[11px] text-[var(--c-text-sub)]">
            {new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: code } = use(params);
  const dispatch = useUIDispatch();

  const [project,  setProject]  = useState<ProjectSummary | null>(null);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [epics,    setEpics]    = useState<EpicItem[]>([]);
  const [members,  setMembers]  = useState<MemberItem[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSearch,   setFilterSearch]   = useState('');

  // Drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol,    setOverCol]    = useState<StatusKey | null>(null);

  async function handleDrop(targetCol: StatusKey) {
    if (!draggingId) return;
    const task = allTasks.find((t) => t.id === draggingId);
    if (!task || task.status === targetCol) { setDraggingId(null); setOverCol(null); return; }
    // Optimistic update
    setAllTasks((prev) => prev.map((t) => t.id === draggingId ? { ...t, status: targetCol } : t));
    setDraggingId(null);
    setOverCol(null);
    try {
      await apiPatch(`/tasks/${draggingId}`, { status: targetCol });
    } catch {
      // Revert
      setAllTasks((prev) => prev.map((t) => t.id === draggingId ? { ...t, status: task.status } : t));
    }
  }

  // Create task modal
  const [modalOpen,  setModalOpen]  = useState(false);
  const [initStatus, setInitStatus] = useState<StatusKey>('backlog');

  const fetchTasks = useCallback(() => {
    apiGet<ApiWrapped<TaskItem[]>>(`/projects/${code}/tasks`)
      .then((r) => setAllTasks(r.data))
      .catch(console.error);
  }, [code]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<ApiWrapped<ProjectSummary>>(`/projects/${code}`),
      apiGet<ApiWrapped<TaskItem[]>>(`/projects/${code}/tasks`),
      apiGet<ApiWrapped<EpicItem[]>>(`/projects/${code}/epics`).catch(() => ({ data: [] as EpicItem[] })),
      apiGet<ApiWrapped<MemberItem[]>>(`/projects/${code}/members`).catch(() => ({ data: [] as MemberItem[] })),
    ])
      .then(([pRes, tRes, eRes, mRes]) => {
        setProject(pRes.data);
        setAllTasks(tRes.data);
        setEpics(eRes.data);
        setMembers(mRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code]);

  // Client-side filtering
  const filtered = useMemo(() =>
    allTasks.filter((t) => {
      if (filterAssignee && t.assignee_initials !== filterAssignee) return false;
      if (filterPriority && t.priority?.toLowerCase() !== filterPriority) return false;
      if (filterSearch && !t.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
          !t.identifier.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      return true;
    }),
    [allTasks, filterAssignee, filterPriority, filterSearch],
  );

  const columns = useMemo(() =>
    COLUMN_META.map((m) => ({ ...m, tasks: filtered.filter((t) => t.status === m.key) })),
    [filtered],
  );

  const openTasks = useMemo(() =>
    allTasks.filter((t) => t.status !== 'completada').length,
    [allTasks],
  );

  const assigneeOptions = useMemo(() =>
    [...new Set(allTasks.map((t) => t.assignee_initials).filter(Boolean))] as string[],
    [allTasks],
  );

  function openCreate(status: StatusKey = 'backlog') {
    setInitStatus(status);
    setModalOpen(true);
  }

  const handleOpen = (taskId: string) => dispatch(openDrawer({ taskId, projectId: code }));

  return (
    <div className="flex flex-col md:h-full md:min-h-0">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <p className="text-[13px] text-[var(--c-text-sub)] mb-1">
          Proyectos <span className="mx-1">/</span> {project?.name ?? code.toUpperCase()}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-48 mb-2" />
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-0">
                <h1 className="text-2xl font-bold text-[var(--c-text)]">{project?.name}</h1>
                <span className="font-mono text-[13px] text-[var(--c-muted)] ml-2">[{code.toUpperCase()}]</span>
              </div>
              <p className="text-[13px] text-[var(--c-text-sub)] mt-0.5">
                {project?.active_cycle ? `${project.active_cycle} · ` : ''}{openTasks} tareas abiertas
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreate('backlog')}
              className="shrink-0 text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-3 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]"
            >
              + Nueva tarea
            </button>
          </div>
        )}
        {/* View tabs */}
        <div className="mt-2">
          <ProjectViewTabs projectCode={code} active="board" />
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 gap-y-2 mb-3">
        <select className={selectCls} value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="">Asignado: Todos</option>
          {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={selectCls} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">Prioridad: Todas</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        {(filterAssignee || filterPriority || filterSearch) && (
          <button
            type="button"
            onClick={() => { setFilterAssignee(''); setFilterPriority(''); setFilterSearch(''); }}
            className="text-[12px] text-[var(--c-danger)] bg-transparent border-none cursor-pointer font-[inherit] hover:opacity-70"
          >
            Limpiar
          </button>
        )}
        <div className="w-px h-6 bg-[var(--c-line)] mx-1 hidden sm:block" aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="w-full sm:w-[180px] border border-[var(--c-border)] rounded-[6px] px-3 py-1.5 text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]"
        />
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="min-w-[272px] w-[272px] flex-shrink-0 flex flex-col gap-2">
              <Skeleton className="h-5 w-24 mb-1" />
              {[1, 2].map((j) => <Skeleton key={j} className="h-24 rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="md:flex-1 md:min-h-0 overflow-x-auto overflow-y-auto">
          <div className="flex gap-3 pb-4" style={{ alignItems: 'flex-start' }}>
            {columns.map((col) => {
              const wipOver = col.wip !== undefined && col.tasks.length > col.wip;
              const isOver  = overCol === col.key;
              const badge   = COL_BADGE[col.key];

              const header = (
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {col.name}
                  </span>
                  <span className="text-[11px] text-[var(--c-text-sub)]">({col.tasks.length})</span>
                  {wipOver && <span className="text-[10px] text-[var(--c-danger)]">WIP {col.tasks.length}/{col.wip}</span>}
                  <button
                    type="button"
                    onClick={() => openCreate(col.key)}
                    className="ml-auto text-[var(--c-muted)] hover:text-[var(--c-text)] bg-transparent border-none cursor-pointer font-[inherit] text-base leading-none"
                    aria-label={`Agregar tarea en ${col.name}`}
                  >
                    +
                  </button>
                </div>
              );

              const dropProps = {
                onDragOver: (e: React.DragEvent) => e.preventDefault(),
                onDragEnter: () => setOverCol(col.key),
                onDragLeave: (e: React.DragEvent) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                },
                onDrop: () => handleDrop(col.key),
              };

              if (col.key === 'completada') {
                return (
                  <div
                    key={col.key}
                    className="min-w-[272px] w-[272px] flex-shrink-0 rounded-xl p-3 transition-colors"
                    style={isOver ? { background: badge.bg + '66', border: `2px dashed ${badge.color}60` } : { border: '2px solid transparent' }}
                    {...dropProps}
                  >
                    <details>
                      <summary className="flex items-center gap-2 mb-3 cursor-pointer list-none select-none">
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {col.name}
                        </span>
                        <span className="text-[11px] text-[var(--c-text-sub)]">({col.tasks.length})</span>
                      </summary>
                      {col.tasks.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          onOpen={handleOpen}
                          onDragStart={setDraggingId}
                          dragging={draggingId === t.id}
                          accent={badge.color}
                        />
                      ))}
                    </details>
                  </div>
                );
              }

              return (
                <div
                  key={col.key}
                  className="min-w-[272px] w-[272px] flex-shrink-0 rounded-xl p-3 transition-colors"
                  style={isOver ? { background: badge.bg + '66', border: `2px dashed ${badge.color}60` } : { border: '2px solid transparent' }}
                  {...dropProps}
                >
                  {header}
                  {col.tasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onOpen={handleOpen}
                      onDragStart={setDraggingId}
                      dragging={draggingId === t.id}
                      accent={badge.color}
                    />
                  ))}
                  {col.tasks.length === 0 && (
                    <div
                      onClick={() => openCreate(col.key)}
                      className="border border-dashed border-[var(--c-border)] rounded-lg p-3 text-center text-[12px] text-[var(--c-muted)] cursor-pointer hover:bg-[var(--c-hover)] transition-colors"
                    >
                      + Agregar tarea
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create task modal */}
      <TaskCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchTasks}
        projectCode={code}
        defaultStatus={initStatus}
        epics={epics}
        members={members}
      />
    </div>
  );
}
