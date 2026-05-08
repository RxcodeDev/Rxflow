'use client';

import { useEffect, useRef, useState } from 'react';
import type { TaskItem } from '@/types/api.types';

export type TaskWithProject = TaskItem & { projectCode: string; projectName: string };

/* ── Project colour palette ────────────────────────────────────── */
const PROJECT_PALETTE = [
  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },   // indigo
  { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },   // sky
  { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },   // emerald
  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },   // amber
  { color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },   // pink
  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },   // violet
  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },    // red
  { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },   // teal
];
const projectColorCache = new Map<string, typeof PROJECT_PALETTE[number]>();
function projectColor(code: string) {
  if (!projectColorCache.has(code)) {
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
    projectColorCache.set(code, PROJECT_PALETTE[hash % PROJECT_PALETTE.length]);
  }
  return projectColorCache.get(code)!;
}

/* ── Status colour mapping ─────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  backlog:     '#bbb',
  todo:        '#bbb',
  in_progress: '#3b82f6',
  in_review:   '#f59e0b',
  done:        '#22c55e',
  cancelled:   '#ef4444',
};
function statusColor(s: string) {
  return STATUS_COLOR[s.toLowerCase()] ?? '#bbb';
}

/* ── Status icon (inline Feather-style) ────────────────────────── */
function StatusIcon({ status }: { status: string }) {
  const color = statusColor(status);
  const s = status.toLowerCase();

  if (s === 'done') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" aria-hidden="true" className="shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (s === 'in_progress') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (s === 'in_review') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true" className="shrink-0">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }
  if (s === 'cancelled') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
  /* backlog / todo */
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

/* ── Props ─────────────────────────────────────────────────────── */
interface TaskSearchSelectProps {
  tasks: TaskWithProject[];
  value: string;
  onChange: (id: string, task: TaskWithProject | null) => void;
  loading?: boolean;
}

/* ── Component ─────────────────────────────────────────────────── */
export default function TaskSearchSelect({ tasks, value, onChange, loading }: TaskSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tooltip, setTooltip] = useState<{ title: string; project: string; color: string; top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = tasks.find(t => t.id === value) ?? null;

  const filtered = query.trim()
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.identifier.toLowerCase().includes(query.toLowerCase()) ||
        t.projectName.toLowerCase().includes(query.toLowerCase()),
      )
    : tasks;

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* auto-focus search on open */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const select = (task: TaskWithProject | null) => {
    onChange(task?.id ?? '', task);
    setOpen(false);
    setQuery('');
    setTooltip(null);
  };

  const triggerCls =
    'w-full flex items-center gap-2 px-3 py-[0.55rem] border border-[var(--c-border)] ' +
    'rounded-[0.625rem] text-[13px] font-[inherit] bg-[var(--c-bg)] ' +
    'transition-[border-color,box-shadow] duration-[0.25s] ';

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => !loading && setOpen(o => !o)}
        disabled={loading}
        className={
          triggerCls +
          (loading ? 'opacity-50 cursor-not-allowed ' : 'cursor-pointer hover:border-[var(--c-text-sub)] ') +
          (open ? 'border-[var(--c-text-sub)] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]' : '')
        }
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <svg className="shrink-0 animate-spin text-[var(--c-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : selected ? (
          <StatusIcon status={selected.status} />
        ) : (
          <svg className="shrink-0 text-[var(--c-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        )}

        {selected ? (
          <span className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[var(--c-text)] font-medium truncate">{selected.title}</span>
          </span>
        ) : (
          <span className="flex-1 text-left text-[var(--c-muted)]">
            {loading ? 'Cargando tareas...' : '— ninguna —'}
          </span>
        )}

        <svg className="shrink-0 text-[var(--c-muted)] ml-auto transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* ── Dropdown ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden"
          role="listbox"
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--c-line)]">
            <svg className="shrink-0 text-[var(--c-muted)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
              placeholder="Buscar por título, ID o proyecto..."
              className="flex-1 text-[13px] font-[inherit] text-[var(--c-text)] bg-transparent outline-none placeholder:text-[var(--c-muted)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* None option */}
            <button
              type="button"
              onClick={() => select(null)}
              className={
                'w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--c-text-sub)] ' +
                'hover:bg-[var(--c-hover)] transition-colors ' +
                (!value ? 'bg-[var(--c-hover)]' : '')
              }
              role="option"
              aria-selected={!value}
            >
              <svg className="shrink-0 text-[var(--c-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>— ninguna —</span>
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-[var(--c-muted)]">
                {query ? 'Sin resultados para esa búsqueda' : 'No hay tareas disponibles'}
              </p>
            ) : (
              filtered.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t)}
                  onMouseEnter={e => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const pc = projectColor(t.projectCode);
                    setTooltip({
                      title: t.title,
                      project: t.projectName,
                      color: pc.color,
                      top: rect.top + rect.height / 2,
                      left: rect.right + 10,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className={
                    'w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-left ' +
                    'hover:bg-[var(--c-hover)] transition-colors ' +
                    (t.id === value ? 'bg-[var(--c-active-pill)]' : '')
                  }
                  role="option"
                  aria-selected={t.id === value}
                >
                  <StatusIcon status={t.status} />
                  {/* Title — takes most of the space */}
                  <span className="text-[var(--c-text)] font-medium truncate" style={{ minWidth: 0, flex: '1 1 0' }}>{t.title}</span>
                  {/* Project chip — unique color per project */}
                  {(() => { const pc = projectColor(t.projectCode); return (
                    <span
                      className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 hidden sm:block max-w-[90px] truncate"
                      style={{ color: pc.color, background: pc.bg }}
                    >
                      {t.projectName}
                    </span>
                  ); })()}
                </button>
              ))
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-[var(--c-line)] text-[11px] text-[var(--c-muted)] text-right">
              {filtered.length} {filtered.length === 1 ? 'tarea' : 'tareas'}
            </div>
          )}
        </div>
      )}

      {/* ── Fixed tooltip ─────────────────────────────────────────── */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.top,
            left: tooltip.left + 16,
            transform: 'translateY(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="bg-[var(--c-bg)] border border-[var(--c-border)] text-[var(--c-text)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.14)] px-3 py-2.5 max-w-[240px]"
        >
          <p className="text-[12px] font-semibold leading-snug">{tooltip.title}</p>
          <p className="text-[11px] mt-1 font-medium" style={{ color: tooltip.color }}>{tooltip.project}</p>
          {/* arrow left */}
          <span
            style={{
              position: 'absolute',
              left: -6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '6px solid var(--c-border)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: -4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid var(--c-bg)',
            }}
          />
        </div>
      )}
    </div>
  );
}
