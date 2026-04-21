'use client';

import type { TaskItem } from '@/types/api.types';
import { PRIORITY_STYLE, STATUS_ORDER } from './projectShared';

interface TaskCardProps {
  task: TaskItem;
  onOpen: (id: string) => void;
  onDragStart?: (id: string) => void;
  dragging?: boolean;
  accent?: string;
}

export default function TaskCard({ task, onOpen, onDragStart, dragging = false, accent = 'var(--c-border)' }: TaskCardProps) {
  const prio = (task.priority ?? 'media').toLowerCase();
  return (
    <div
      draggable={!!onDragStart}
      onClick={() => onOpen(task.id)}
      onDragStart={onDragStart ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task.id); } : undefined}
      className="border border-[var(--c-border)] rounded-lg p-3 mb-2 bg-[var(--c-bg)] hover:bg-[var(--c-hover)] cursor-pointer active:cursor-grabbing transition-all select-none"
      style={{
        borderLeft: `3px solid ${accent}`,
        opacity: dragging ? 0.35 : 1,
        transform: dragging ? 'scale(0.97)' : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-[var(--c-muted)]">{task.identifier}</span>
        <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize ${PRIORITY_STYLE[prio] ?? PRIORITY_STYLE.media}`}>
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
