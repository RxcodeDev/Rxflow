'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useUIDispatch, useUIState } from '@/store/UIContext';
import { openDrawer, bumpTasks } from '@/store/slices/uiSlice';
import type { TaskItem, ApiWrapped } from '@/types/api.types';

type EpicItem = { id: string; name: string; status: string };

/* ── Constants ───────────────────────────────────────── */
const STATUS_GROUPS = ['en_progreso', 'en_revision', 'backlog', 'bloqueado', 'completada'] as const;
type StatusKey = typeof STATUS_GROUPS[number];

const STATUS_LABEL: Record<string, string> = {
  en_progreso: 'En progreso',
  en_revision: 'En revisión',
  backlog:     'Backlog',
  bloqueado:   'Bloqueado',
  completada:  'Completada',
};

/* Status dot colors (inline style — these are status semantics, not brand tokens) */
const STATUS_DOT: Record<string, string> = {
  en_progreso: '#3b82f6',
  en_revision: '#f59e0b',
  backlog:     '#94a3b8',
  bloqueado:   '#ef4444',
  completada:  '#22c55e',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Media', baja: 'Baja',
};

const PRIORITY_CLS: Record<string, string> = {
  urgente: 'text-[var(--c-danger)]',
  alta:    'text-[var(--c-text-sub)]',
  media:   'text-[var(--c-text-sub)]',
  baja:    'text-[var(--c-muted)]',
};

/* ── Helpers ─────────────────────────────────────────── */
function dueDateLabel(raw: string | null): { label: string; danger: boolean } | null {
  if (!raw) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(raw); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: 'Vencida', danger: true };
  if (diff === 0) return { label: 'Hoy', danger: false };
  if (diff === 1) return { label: 'Mañana', danger: false };
  return { label: d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }), danger: false };
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

/* ── StatusMenu ──────────────────────────────────────── */
function StatusMenu({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (s: StatusKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        title="Cambiar estado"
        className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--c-border)] hover:bg-[var(--c-hover)] transition-colors text-[11px] text-[var(--c-text-sub)] cursor-pointer bg-transparent font-[inherit]"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: STATUS_DOT[current] ?? STATUS_DOT.backlog }}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{STATUS_LABEL[current] ?? current}</span>
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="min-w-[160px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_GROUPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setOpen(false); onSelect(s); }}
              className={
                'w-full text-left flex items-center gap-2.5 px-3 py-2 cursor-pointer font-[inherit] border-none bg-transparent transition-colors hover:bg-[var(--c-hover)] ' +
                (s === current ? 'text-[var(--c-text)] font-semibold' : 'text-[var(--c-text-sub)]')
              }
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[s] }} aria-hidden="true" />
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── FilterSelect ───────────────────────────────────── */
function FilterSelect({
  value, onChange, options, placeholder, disabled = false, loading = false, width = 150,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-1.5 text-[12px] rounded-lg px-2.5 py-1.5 border border-[var(--c-border)] bg-[var(--c-bg)] cursor-pointer font-[inherit] transition-colors hover:border-[var(--c-text-sub)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
        style={{ color: selected ? 'var(--c-text)' : 'var(--c-muted)' }}
      >
        <span className="truncate">{loading ? 'Cargando…' : (selected?.label ?? placeholder)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
          className="shrink-0 text-[var(--c-muted)] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg overflow-hidden py-1" style={{ minWidth: width, maxWidth: 260 }}>
          <button type="button" onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer font-[inherit] border-none transition-colors hover:bg-[var(--c-hover)]"
            style={{ color: value === '' ? 'var(--c-accent)' : 'var(--c-muted)' }}>
            {placeholder}
          </button>
          {options.length > 0 && <div className="my-1 h-px bg-[var(--c-line)]" />}
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer font-[inherit] border-none transition-colors hover:bg-[var(--c-hover)] flex items-center justify-between gap-2"
              style={{ color: 'var(--c-text)' }}>
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="shrink-0" style={{ color: 'var(--c-accent)' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
type Tab = 'activas' | 'completadas' | 'todas';

export default function MisTareasPage() {
  const dispatch = useUIDispatch();
  const { tasksVersion } = useUIState();
  const [tasks,   setTasks]   = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('activas');

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterEpic,    setFilterEpic]    = useState('');
  const [filterEpics,   setFilterEpics]   = useState<EpicItem[]>([]);
  const [epicLoading,   setEpicLoading]   = useState(false);

  useEffect(() => {
    apiGet<ApiWrapped<TaskItem[]>>('/tasks/mine')
      .then((res) => setTasks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tasksVersion]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: StatusKey) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await apiPatch(`/tasks/${taskId}`, { status: newStatus });
      dispatch(bumpTasks());
    } catch {
      // revert on error
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t } : t));
    }
  }, []);

  const handleCheckbox = useCallback((task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const next: StatusKey = task.status === 'completada' ? 'en_progreso' : 'completada';
    handleStatusChange(task.id, next);
  }, [handleStatusChange]);

  // Load epics when project filter changes
  useEffect(() => {
    if (!filterProject) { setFilterEpics([]); setFilterEpic(''); return; }
    setEpicLoading(true);
    setFilterEpic('');
    apiGet<ApiWrapped<EpicItem[]>>(`/projects/${filterProject}/epics`)
      .then(res => setFilterEpics(res.data.filter(e => e.status === 'activa')))
      .catch(console.error)
      .finally(() => setEpicLoading(false));
  }, [filterProject]);

  const uniqueProjects = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => map.set(t.project_code, t.project_name));
    return [...map.entries()].map(([code, name]) => ({ code, name }));
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    let base = tasks;
    if (tab === 'activas')     base = base.filter((t) => t.status !== 'completada');
    if (tab === 'completadas') base = base.filter((t) => t.status === 'completada');
    if (filterProject) base = base.filter(t => t.project_code === filterProject);
    if (filterEpic)    base = base.filter(t => t.epic_id === filterEpic);
    return base;
  }, [tasks, tab, filterProject, filterEpic]);

  const hasFilter = !!filterProject || !!filterEpic;

  const grouped = useMemo(() =>
    STATUS_GROUPS
      .map((s) => ({ status: s, tasks: visibleTasks.filter((t) => t.status === s) }))
      .filter((g) => g.tasks.length > 0),
  [visibleTasks]);

  const activeCount    = tasks.filter((t) => t.status !== 'completada').length;
  const completedCount = tasks.filter((t) => t.status === 'completada').length;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'activas',     label: 'Activas',     count: activeCount },
    { key: 'completadas', label: 'Completadas', count: completedCount },
    { key: 'todas',       label: 'Todas',       count: tasks.length },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Mis tareas</h1>
          <p className="text-[13px] text-[var(--c-text-sub)] mt-0.5">
            {loading ? '...' : `${activeCount} tarea${activeCount !== 1 ? 's' : ''} activa${activeCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Filters */}
        {!loading && tasks.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 mr-6">
            <FilterSelect
              value={filterProject}
              onChange={setFilterProject}
              options={uniqueProjects.map(p => ({ value: p.code, label: p.name }))}
              placeholder="Proyecto"
              width={150}
            />
            <FilterSelect
              value={filterEpic}
              onChange={setFilterEpic}
              options={filterEpics.map(e => ({ value: e.id, label: e.name }))}
              placeholder="Épica"
              disabled={!filterProject}
              loading={epicLoading}
              width={150}
            />
            {hasFilter && (
              <button
                type="button"
                onClick={() => { setFilterProject(''); setFilterEpic(''); }}
                className="flex items-center gap-1 text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[var(--c-border)] -mt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'text-sm px-4 py-2 -mb-px border-b-2 transition-colors cursor-pointer bg-transparent font-[inherit] flex items-center gap-1.5 ' +
              (tab === t.key
                ? 'border-[var(--c-text)] text-[var(--c-text)] font-semibold'
                : 'border-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]')
            }
          >
            {t.label}
            {!loading && (
              <span className="text-[11px] text-[var(--c-muted)]">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && visibleTasks.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5"
               className="text-[var(--c-muted)]" aria-hidden="true">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <p className="text-sm text-[var(--c-muted)]">
            {tab === 'completadas' ? 'No hay tareas completadas' : 'No tienes tareas asignadas'}
          </p>
        </div>
      )}

      {/* Groups */}
      {!loading && grouped.map((group) => (
        <section key={group.status}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: STATUS_DOT[group.status] }}
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
              {STATUS_LABEL[group.status]}
            </span>
            <span className="text-[11px] text-[var(--c-text-sub)]">({group.tasks.length})</span>
            <div className="flex-1 h-px bg-[var(--c-line)]" />
          </div>

          <div className="flex flex-col divide-y divide-[var(--c-line)] border border-[var(--c-border)] rounded-xl overflow-hidden">
            {group.tasks.map((task) => {
              const due  = dueDateLabel(task.due_date);
              const done = task.status === 'completada';
              return (
                <div
                  key={task.id}
                  onClick={() => dispatch(openDrawer({ taskId: task.id, projectId: task.project_code.toLowerCase() }))}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--c-hover)] transition-colors cursor-pointer"
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleCheckbox(task, e)}
                    className={
                      'shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ' +
                      (done
                        ? 'bg-[var(--c-text)] border-[var(--c-text)]'
                        : 'bg-transparent border-[var(--c-border)] hover:border-[var(--c-text-sub)]')
                    }
                    aria-label={done ? 'Marcar como incompleta' : 'Marcar como completada'}
                  >
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" aria-hidden="true">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                      </svg>
                    )}
                  </button>

                  {/* Identifier */}
                  <span className="font-mono text-[11px] text-[var(--c-muted)] shrink-0 w-16 hidden sm:block">
                    {task.identifier}
                  </span>

                  {/* Title */}
                  <span className={`flex-1 min-w-0 text-sm truncate ${done ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
                    {task.title}
                  </span>

                  {/* Epic */}
                  {task.epic_name && (
                    <span className="hidden lg:inline shrink-0 text-[11px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5 max-w-[120px] truncate">
                      {task.epic_name}
                    </span>
                  )}

                  {/* Project */}
                  <span className="hidden md:inline shrink-0 text-[11px] text-[var(--c-muted)] max-w-[100px] truncate">
                    {task.project_name}
                  </span>

                  {/* Priority */}
                  <span className={`shrink-0 text-[11px] font-medium ${PRIORITY_CLS[task.priority] ?? PRIORITY_CLS.baja}`}>
                    {PRIORITY_LABEL[task.priority] ?? task.priority}
                  </span>

                  {/* Due date */}
                  {due && (
                    <span className={`shrink-0 text-[11px] hidden sm:inline ${due.danger ? 'text-[var(--c-danger)]' : 'text-[var(--c-text-sub)]'}`}>
                      {due.label}
                    </span>
                  )}

                  {/* Status changer */}
                  <StatusMenu
                    current={task.status}
                    onSelect={(s) => handleStatusChange(task.id, s)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
