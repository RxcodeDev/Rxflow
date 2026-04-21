'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api';
import type { TaskItem, ApiWrapped } from '@/types/api.types';

const STATUS_GROUPS = ['en_progreso', 'en_revision', 'backlog', 'completada'] as const;
const STATUS_LABEL: Record<string, string> = {
  en_progreso: 'En progreso',
  en_revision: 'En revisión',
  backlog:     'Backlog',
  completada:  'Completada',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'text-[var(--c-danger)] border-[var(--c-danger)]',
  alta:    'text-[var(--c-text-sub)] border-[var(--c-border)]',
  media:   'text-[var(--c-text-sub)] border-[var(--c-border)]',
  baja:    'text-[var(--c-muted)] border-[var(--c-border)]',
};

function dueDateLabel(raw: string | null): { label: string; danger: boolean } | null {
  if (!raw) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(raw); d.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: 'Vencida', danger: true };
  if (diff === 0) return { label: 'Hoy', danger: true };
  if (diff === 1) return { label: 'Mañana', danger: false };
  return { label: d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' }), danger: false };
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

export default function MisTareasPage() {
  const [tasks,   setTasks]   = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ApiWrapped<TaskItem[]>>('/tasks/mine')
      .then((res) => setTasks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() =>
    STATUS_GROUPS
      .map((s) => ({ status: s, tasks: tasks.filter((t) => t.status === s) }))
      .filter((g) => g.tasks.length > 0),
  [tasks]);

  const activeCount = tasks.filter((t) => t.status !== 'completada').length;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Mis tareas</h1>
          <p className="text-[13px] text-[var(--c-text-sub)] mt-0.5">
            {loading ? '...' : `${activeCount} tareas activas`}
          </p>
        </div>

      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-4">
          {[1,2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && tasks.length === 0 && (
        <p className="text-sm text-[var(--c-muted)] py-8 text-center">No tienes tareas asignadas</p>
      )}

      {/* Groups */}
      {!loading && grouped.map((group) => (
        <section key={group.status}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
              {STATUS_LABEL[group.status]}
            </span>
            <span className="text-[11px] text-[var(--c-text-sub)]">({group.tasks.length})</span>
            <div className="flex-1 h-px bg-[var(--c-line)] ml-2" />
          </div>

          <div className="flex flex-col divide-y divide-[var(--c-line)] border border-[var(--c-border)] rounded-xl overflow-hidden">
            {group.tasks.map((task) => {
              const due = dueDateLabel(task.due_date);
              const done = task.status === 'completada';
              return (
                <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--c-hover)] transition-colors cursor-pointer">
                  <span
                    className="shrink-0 w-4 h-4 rounded border border-[var(--c-border)]"
                    aria-hidden="true"
                    style={done ? { background: 'var(--c-border)' } : undefined}
                  />
                  <span className="font-mono text-[11px] text-[var(--c-muted)] shrink-0 w-16">{task.identifier}</span>
                  <span className={`flex-1 min-w-0 text-sm truncate ${done ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
                    {task.title}
                  </span>
                  {task.epic_name && (
                    <span className="hidden sm:inline shrink-0 text-[11px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5">
                      {task.epic_name}
                    </span>
                  )}
                  <span className="hidden md:inline shrink-0 text-[11px] text-[var(--c-muted)]">{task.project_name}</span>
                  <span className={`shrink-0 text-[10px] border rounded px-1.5 py-0.5 capitalize ${PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.baja}`}>
                    {task.priority}
                  </span>
                  {due && (
                    <span className={`shrink-0 text-[11px] ${due.danger ? 'text-[var(--c-danger)]' : 'text-[var(--c-text-sub)]'}`}>
                      {due.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

    </div>
  );
}
