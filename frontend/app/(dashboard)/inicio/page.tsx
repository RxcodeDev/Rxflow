'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPatch } from '@/lib/api';
import { useUIState } from '@/store/UIContext';
import type { TaskItem, NotificationItem, ProjectSummary, CycleSummary, ApiWrapped } from '@/types/api.types';

/* ── Brand accents — used sparingly ───────────────────── */
const B_CYAN  = '#06b6d4';
const B_GREEN = '#10b981';

const STATUSES = ['backlog', 'en_progreso', 'en_revision', 'completada'] as const;

const STATUS_META: Record<string, { label: string; dot: string }> = {
  backlog:     { label: 'Backlog',      dot: '#94a3b8' },
  en_progreso: { label: 'En progreso',  dot: B_CYAN   },
  en_revision: { label: 'En revisión',  dot: '#f59e0b' },
  completada:  { label: 'Completadas',  dot: B_GREEN  },
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#ef4444',
  high:   '#f97316',
  medium: '#f59e0b',
  low:    B_GREEN,
};

const PROJECT_COLORS = [B_CYAN, B_GREEN, '#0d9488', '#059669', '#0891b2'];

/* ── Helpers ──────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function dueDateBadge(raw: string | null): { text: string; danger: boolean } | null {
  if (!raw) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(raw); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { text: 'Vencida', danger: true };
  if (diff === 0) return { text: 'Hoy',    danger: true };
  if (diff === 1) return { text: 'Mañana', danger: false };
  return null;
}

/* ── Micro components ─────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)] shrink-0">
      {children}
    </p>
  );
}

function Ring({ pct, color, size = 40 }: { pct: number; color: string; size?: number }) {
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.min(pct, 100) / 100)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export default function InicioPage() {
  const { user }  = useAuth();
  const { tasksVersion } = useUIState();
  const [myTasks,  setMyTasks]  = useState<TaskItem[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [cycles,   setCycles]   = useState<CycleSummary[]>([]);
  const [notifs,   setNotifs]   = useState<NotificationItem[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<ApiWrapped<TaskItem[]>>('/tasks/mine'),
      apiGet<ApiWrapped<TaskItem[]>>('/tasks'),
      apiGet<ApiWrapped<ProjectSummary[]>>('/projects'),
      apiGet<ApiWrapped<CycleSummary[]>>('/cycles'),
      apiGet<ApiWrapped<NotificationItem[]>>('/notifications'),
    ])
      .then(([mine, all, projs, cycs, nots]) => {
        setMyTasks(mine.data);
        setAllTasks(all.data);
        setProjects(projs.data);
        setCycles(cycs.data);
        setNotifs(nots.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tasksVersion]);

  const activeCycle        = useMemo(() => cycles.find((c) => c.status === 'activo') ?? null, [cycles]);
  const activeProjectCount = projects.filter((p) => p.status === 'activo').length;

  /* ── Kanban board state (mutable for DnD) ──────────── */
  type BoardCard = { id: string; taskUuid: string; title: string; initials: string; priority: string; project: string };
  type BoardCol  = { key: string; meta: { label: string; dot: string }; cards: BoardCard[] };

  const [boardCols, setBoardCols] = useState<BoardCol[]>([]);
  const dragRef = useRef<{ cardId: string; fromKey: string } | null>(null);
  const [overKey, setOverKey]    = useState<string | null>(null);

  useEffect(() => {
    setBoardCols(
      STATUSES.map((s) => ({
        key:   s,
        meta:  STATUS_META[s],
        cards: allTasks.filter((t) => t.status === s).map((t) => ({
          id:       t.identifier,
          taskUuid: t.id,
          title:    t.title,
          initials: t.assignee_initials ?? '?',
          priority: t.priority,
          project:  t.project_code,
        })),
      }))
    );
  }, [allTasks]);

  const handleDragStart = useCallback((cardId: string, fromKey: string) => {
    dragRef.current = { cardId, fromKey };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setOverKey(colKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverKey(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toKey: string) => {
    e.preventDefault();
    setOverKey(null);
    if (!dragRef.current) return;
    const { cardId, fromKey } = dragRef.current;
    dragRef.current = null;
    if (fromKey === toKey) return;
    setBoardCols((prev) => {
      const next     = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const fromCol  = next.find((c) => c.key === fromKey);
      const toCol    = next.find((c) => c.key === toKey);
      if (!fromCol || !toCol) return prev;
      const idx = fromCol.cards.findIndex((c) => c.id === cardId);
      if (idx === -1) return prev;
      const [card] = fromCol.cards.splice(idx, 1);
      toCol.cards.push(card);
      apiPatch(`/tasks/${card.taskUuid}`, { status: toKey }).catch(console.error);
      return next;
    });
  }, []);

  const subtitleText = activeCycle
    ? `${activeCycle.name} · ${activeCycle.days_left ?? 0} días restantes · ${activeProjectCount} proyectos activos`
    : `${activeProjectCount} proyectos activos`;

  const statsData = [
    { label: 'Mis tareas',  value: myTasks.length,                                           accent: B_CYAN   },
    { label: 'En progreso', value: allTasks.filter((t) => t.status === 'en_progreso').length, accent: B_CYAN   },
    { label: 'En revisión', value: allTasks.filter((t) => t.status === 'en_revision').length, accent: '#f59e0b' },
    { label: 'Completadas', value: allTasks.filter((t) => t.status === 'completada').length,  accent: B_GREEN  },
  ];

  return (
    <div className="flex flex-col gap-3 md:h-full md:min-h-0">

      {/* HEADER */}
      <div className="shrink-0">
        <h1 className="text-lg font-bold text-[var(--c-text)]">
          {greeting()}, {user?.name ?? 'Usuario'}
        </h1>
        <p className="text-xs text-[var(--c-muted)] mt-0.5">{subtitleText}</p>
      </div>

      {/* STAT ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
        {loading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)
          : statsData.map((s) => (
            <div
              key={s.label}
              className="border border-[var(--c-border)] rounded-lg px-3 py-2.5"
              style={{ borderLeft: `3px solid ${s.accent}` }}
            >
              <p className="text-xl font-bold text-[var(--c-text)] leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] text-[var(--c-muted)] mt-1">{s.label}</p>
            </div>
          ))
        }
      </div>

      {/* MAIN GRID — fills remaining height */}
      <div className="md:flex-1 md:min-h-0 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-3">

        {/* LEFT */}
        <div className="flex flex-col gap-3 md:min-h-0">

          {/* Mis tareas */}
          <div className="shrink-0 border border-[var(--c-border)] rounded-lg overflow-hidden">
            <Label>Mis tareas hoy</Label>
            {loading ? (
              <div className="px-4 py-2 flex flex-col gap-1.5">
                {[1, 2].map((i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : myTasks.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-[var(--c-muted)]">Sin tareas asignadas</p>
            ) : (
              <div className="divide-y divide-[var(--c-line)]">
                {myTasks.map((task) => {
                  const dl   = dueDateBadge(task.due_date);
                  const pDot = PRIORITY_DOT[task.priority] ?? 'var(--c-border)';
                  return (
                    <div key={task.id} className="flex items-center gap-2.5 px-4 py-2 hover:bg-[var(--c-hover)] transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pDot }} aria-hidden="true" />
                      <span className="font-mono text-[10px] text-[var(--c-muted)] shrink-0 w-14">{task.identifier}</span>
                      <span className="flex-1 min-w-0 text-[13px] text-[var(--c-text)] truncate">{task.title}</span>
                      {dl && (
                        <span className={`shrink-0 text-[10px] ${dl.danger ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>
                          {dl.text}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kanban — fills remaining height, equal columns, drag-and-drop */}
          <div className="md:flex-1 md:min-h-0 border border-[var(--c-border)] rounded-lg flex flex-col overflow-hidden">
            <Label>Flujo del equipo</Label>

            {loading ? (
              <div className="flex-1 flex gap-2 px-3 pb-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="flex-1" />)}
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex gap-2 px-3 pb-3 overflow-x-auto">
                {boardCols.map((col) => {
                  const isOver = overKey === col.key;
                  return (
                    <div
                      key={col.key}
                      className="flex flex-col flex-1 min-w-[148px] rounded-lg transition-colors"
                      style={{ backgroundColor: isOver ? `${col.meta.dot}14` : 'var(--c-hover)' }}
                      onDragOver={(e) => handleDragOver(e, col.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.key)}
                    >
                      {/* Column header */}
                      <div className="flex items-center justify-between px-2.5 py-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.meta.dot }} aria-hidden="true" />
                          <span className="text-[11px] font-semibold text-[var(--c-text)]">{col.meta.label}</span>
                        </div>
                        <span className="text-[10px] text-[var(--c-muted)] tabular-nums">{col.cards.length}</span>
                      </div>

                      {/* Cards */}
                      <div
                        className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-1.5 flex flex-col gap-1.5"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        {col.cards.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <p className="text-[10px] text-[var(--c-muted)]">Sin tareas</p>
                          </div>
                        ) : col.cards.map((card) => (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={() => handleDragStart(card.id, col.key)}
                            className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-md px-2 py-1.5 flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:border-[var(--c-text-sub)] transition-colors select-none"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[card.priority] ?? 'var(--c-border)' }} aria-hidden="true" />
                              <span className="font-mono text-[9px] text-[var(--c-muted)] flex-1">{card.id}</span>
                              <span className="text-[9px] text-[var(--c-muted)] shrink-0 w-5 h-5 rounded-full bg-[var(--c-hover)] flex items-center justify-center font-medium">
                                {card.initials}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--c-text)] leading-snug line-clamp-2">{card.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-3 md:min-h-0 md:overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

          {/* Progreso de proyectos */}
          <div className="shrink-0 border border-[var(--c-border)] rounded-lg overflow-hidden">
            <Label>Progreso de proyectos</Label>
            {loading ? (
              <div className="px-4 py-2 flex flex-col gap-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <div className="divide-y divide-[var(--c-line)]">
                {projects.slice(0, 4).map((p, i) => {
                  const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
                        <Ring pct={p.progress_pct} color={color} size={40} />
                        <span
                          className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
                          style={{ color }}
                        >
                          {p.progress_pct}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[var(--c-text)] truncate">{p.name}</p>
                        <p className="text-[10px] text-[var(--c-muted)] mt-0.5">{p.tasks_done}/{p.tasks_total} tareas</p>
                        <div className="mt-1 h-0.5 bg-[var(--c-line)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.progress_pct}%`, backgroundColor: color, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ciclo activo */}
          {(loading || activeCycle) && (
            <div className="shrink-0 border border-[var(--c-border)] rounded-lg overflow-hidden">
              <Label>Ciclo activo</Label>
              {loading ? (
                <div className="px-4 pb-3"><Skeleton className="h-16" /></div>
              ) : activeCycle && (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--c-text)]">{activeCycle.name}</p>
                      <p className="text-[10px] text-[var(--c-muted)] mt-0.5">{activeCycle.project_name}</p>
                    </div>
                    <div className="relative shrink-0" style={{ width: 48, height: 48 }}>
                      <Ring pct={activeCycle.scope_pct} color={B_CYAN} size={48} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--c-text)]">
                        {activeCycle.scope_pct}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="text-[10px] text-[var(--c-muted)]">
                      <span className="font-semibold text-[var(--c-text)]">{activeCycle.tasks_done}</span>/{activeCycle.tasks_total} hechas
                    </span>
                    {activeCycle.days_left !== null && (
                      <span className="text-[10px] text-[var(--c-muted)]">
                        <span className="font-semibold text-[var(--c-text)]">{activeCycle.days_left}</span> días restantes
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-0.5 bg-[var(--c-line)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${activeCycle.scope_pct}%`, backgroundColor: B_CYAN, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actividad reciente */}
          <div className="shrink-0 border border-[var(--c-border)] rounded-lg overflow-hidden">
            <Label>Actividad reciente</Label>
            {loading ? (
              <div className="px-4 py-2 flex flex-col gap-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : notifs.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-[var(--c-muted)]">Sin actividad reciente</p>
            ) : (
              <div className="divide-y divide-[var(--c-line)]">
                {notifs.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--c-hover)] text-[9px] font-bold text-[var(--c-text-sub)] flex items-center justify-center mt-0.5">
                      {n.sender.initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[var(--c-text)] leading-snug">{n.message}</p>
                      {n.task && (
                        <p className="font-mono text-[9px] text-[var(--c-muted)] mt-0.5">{n.task.identifier}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] text-[var(--c-muted)]">
                        {new Date(n.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: B_CYAN }} aria-label="No leída" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
