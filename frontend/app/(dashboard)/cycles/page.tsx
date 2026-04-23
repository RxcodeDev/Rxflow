'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { CycleSummary, ProjectSummary, TaskItem, ApiWrapped } from '@/types/api.types';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useUIDispatch, useUIState } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';
import { playSuccess, playDelete } from '@/hooks/useSound';

type EpicItem = { id: string; name: string; status: string };
type ViewMode = 'list' | 'timeline' | 'calendar';

const STATUS_ORDER = ['activo', 'planificado', 'completado'] as const;
const STATUS_LABEL: Record<string, string> = { activo: 'Activo', planificado: 'Planificado', completado: 'Completado' };

function sKey(status: string): 'active' | 'planned' | 'done' {
  if (status === 'activo') return 'active';
  if (status === 'planificado') return 'planned';
  return 'done';
}

function formatDate(raw: string | null): string {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function toDay(raw: string): Date {
  const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

// ── Improved list card ──────────────────────────────────────────────────────
function CycleCard({
  cycle,
  isExpanded,
  tasks,
  loadingTasks,
  onToggle,
  onManage,
  onEdit,
  onDelete,
  onStatusChange,
  onTaskClick,
  onRemoveTask,
}: {
  cycle: CycleSummary;
  isExpanded: boolean;
  tasks: TaskItem[];
  loadingTasks: boolean;
  onToggle: () => void;
  onManage: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: CycleSummary['status']) => void;
  onTaskClick: (taskId: string, projectId: string) => void;
  onRemoveTask: (taskId: string) => void;
}) {
  const pct = cycle.tasks_total > 0 ? Math.round((cycle.tasks_done / cycle.tasks_total) * 100) : 0;
  const sk = sKey(cycle.status);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const STATUSES: { value: CycleSummary['status']; label: string }[] = [
    { value: 'planificado', label: 'Planificado' },
    { value: 'activo',      label: 'Activo' },
    { value: 'completado',  label: 'Completado' },
  ];

  return (
    <div
      className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] transition-shadow hover:shadow-sm"
      style={{ borderLeft: `3px solid var(--c-cycle-${sk})` }}
    >
      <div
        className="px-4 pt-4 pb-3 cursor-pointer hover:bg-[var(--c-hover)] transition-colors"
        onClick={onToggle}
        role="button"
        aria-expanded={isExpanded}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-mono text-[10px] font-semibold rounded-md px-1.5 py-0.5 shrink-0"
                style={{
                  color: `var(--c-cycle-${sk})`,
                  background: `var(--c-cycle-${sk}-bg)`,
                }}
              >
                {cycle.project_code}
              </span>
              <span className="font-semibold text-sm text-[var(--c-text)] leading-snug">{cycle.name}</span>
            </div>
            <p className="text-[12px] text-[var(--c-muted)] mt-0.5">{cycle.project_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status pill — clickable */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setStatusOpen(v => !v); }}
                className="flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-0.5 transition-opacity hover:opacity-75 cursor-pointer bg-transparent border-none font-[inherit]"
                style={{
                  color: `var(--c-cycle-${sk})`,
                  background: `var(--c-cycle-${sk}-bg)`,
                }}
                aria-label="Cambiar estado"
              >
                {STATUS_LABEL[cycle.status] ?? cycle.status}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setStatusOpen(false); }} />
                  <div
                    className="absolute left-0 top-full mt-1 z-20 min-w-[10rem] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg overflow-hidden py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {STATUSES.map(s => {
                      const ssk = sKey(s.value);
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => { setStatusOpen(false); onStatusChange(s.value); }}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-[var(--c-hover)] transition-colors bg-transparent border-none cursor-pointer font-[inherit]"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: `var(--c-cycle-${ssk})` }}
                          />
                          <span style={{ color: cycle.status === s.value ? `var(--c-cycle-${ssk})` : 'var(--c-text)' }} className="font-medium">
                            {s.label}
                          </span>
                          {cycle.status === s.value && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className="ml-auto" style={{ color: `var(--c-cycle-${ssk})` }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {/* Three-dot menu */}
            <div className="relative">
              <button
                type="button"
                aria-label="Opciones del cycle"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                className="p-1 rounded-md text-[var(--c-muted)] hover:text-[var(--c-text-sub)] hover:bg-[var(--c-active-pill)] transition-colors bg-transparent border-none cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="5" r="1" fill="currentColor" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                  <circle cx="12" cy="19" r="1" fill="currentColor" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-20 min-w-[9rem] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg overflow-hidden py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors bg-transparent border-none cursor-pointer font-[inherit]"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--c-danger)] hover:bg-[var(--c-hover)] transition-colors bg-transparent border-none cursor-pointer font-[inherit]"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" aria-hidden="true"
              className={`text-[var(--c-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Date + days left */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-[var(--c-muted)] shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[12px] text-[var(--c-text-sub)]">
            {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
          </span>
          {cycle.days_left !== null && cycle.status === 'activo' && (
            <span
              className="ml-auto text-[11px] font-semibold rounded-full px-2 py-0.5"
              style={{ color: `var(--c-cycle-active)`, background: `var(--c-cycle-active-bg)` }}
            >
              {cycle.days_left}d restantes
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] text-[var(--c-muted)]">Progreso</span>
            <span className="text-[11px] font-semibold text-[var(--c-text-sub)] tabular-nums">
              {cycle.tasks_done}/{cycle.tasks_total} · {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--c-border)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: `var(--c-cycle-${sk})` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded task list */}
      {isExpanded && (
        <div className="border-t border-[var(--c-border)] bg-[var(--c-hover)] rounded-b-xl overflow-hidden">
          {loadingTasks ? (
            <div className="flex flex-col gap-2 p-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-[12px] text-[var(--c-muted)] px-4 py-3">Sin tareas en este ciclo</p>
          ) : (
            <ul className="divide-y divide-[var(--c-line)]">
              {tasks.map(t => (
                <li key={t.id} className="flex items-center group">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTaskClick(t.id, cycle.project_code); }}
                    className="flex-1 text-left px-4 py-2.5 hover:bg-[var(--c-bg)] transition-colors flex items-center gap-3 font-[inherit] cursor-pointer bg-transparent border-none min-w-0"
                  >
                    <span className="text-[11px] text-[var(--c-muted)] font-mono shrink-0">{t.identifier}</span>
                    <span className="flex-1 text-[13px] text-[var(--c-text)] truncate">{t.title}</span>
                    {t.epic_name && (
                      <span className="text-[10px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded px-1.5 py-0.5 shrink-0 hidden sm:block">{t.epic_name}</span>
                    )}
                    {t.assignee_initials && (
                      <span className="text-[11px] font-semibold w-6 h-6 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] flex items-center justify-center shrink-0">
                        {t.assignee_initials}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Quitar del cycle"
                    onClick={(e) => { e.stopPropagation(); onRemoveTask(t.id); }}
                    className="px-2 py-2.5 text-[var(--c-muted)] hover:text-[var(--c-danger)] transition-colors opacity-0 group-hover:opacity-100 bg-transparent border-none cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 py-2 border-t border-[var(--c-line)]">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onManage(); }}
              className="text-[12px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors bg-transparent border-none cursor-pointer font-[inherit]"
            >
              + Agregar tareas o épicas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timeline / Gantt view ───────────────────────────────────────────────────
function TimelineView({
  cycles,
  onCycleClick,
}: {
  cycles: CycleSummary[];
  onCycleClick: (c: CycleSummary) => void;
}) {
  const datedCycles = cycles.filter(c => c.start_date && c.end_date);
  const today = new Date();

  if (datedCycles.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="text-[var(--c-muted)]">
          <line x1="3" y1="12" x2="21" y2="12" /><polyline points="8 8 3 12 8 16" /><polyline points="16 8 21 12 16 16" />
        </svg>
        <p className="text-sm text-[var(--c-muted)]">Ningún cycle tiene fechas de inicio/fin para mostrar.</p>
      </div>
    );
  }

  const allMs = datedCycles.flatMap(c => [toDay(c.start_date!).getTime(), toDay(c.end_date!).getTime()]);
  const rangeStart = new Date(Math.min(...allMs));
  const rangeEnd   = new Date(Math.max(...allMs));
  // Pad a bit
  rangeStart.setDate(rangeStart.getDate() - 3);
  rangeEnd.setDate(rangeEnd.getDate() + 3);

  const totalMs  = rangeEnd.getTime() - rangeStart.getTime();
  const totalDays = Math.ceil(totalMs / 86400000);
  const PX_PER_DAY = 28;
  const chartW = totalDays * PX_PER_DAY;
  const LABEL_W = 180;

  function dayOffset(d: Date): number {
    return ((d.getTime() - rangeStart.getTime()) / 86400000) * PX_PER_DAY;
  }

  // Month markers
  const months: { label: string; x: number }[] = [];
  const m = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (m <= rangeEnd) {
    const x = dayOffset(m);
    if (x >= 0 && x <= chartW) {
      months.push({ label: m.toLocaleDateString('es', { month: 'short', year: '2-digit' }), x });
    }
    m.setMonth(m.getMonth() + 1);
  }

  const todayX = dayOffset(today);
  const showToday = todayX >= 0 && todayX <= chartW;

  const groups = STATUS_ORDER
    .map(s => ({ status: s, list: datedCycles.filter(c => c.status === s) }))
    .filter(g => g.list.length > 0);

  const ROW_H = 44;
  const HEADER_H = 36;
  const GROUP_GAP = 32;

  // Calculate total SVG height
  let totalH = HEADER_H;
  groups.forEach((g, gi) => {
    if (gi > 0) totalH += GROUP_GAP;
    totalH += 20; // group label
    totalH += g.list.length * ROW_H;
  });
  totalH += 16;

  return (
    <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden">
      {/* Scrollable area */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${LABEL_W + chartW + 32}px` }}>

          {/* ── Header row ── */}
          <div className="flex border-b border-[var(--c-border)] bg-[var(--c-hover)]">
            {/* Label column */}
            <div
              className="shrink-0 border-r border-[var(--c-border)] flex items-end px-4 pb-2"
              style={{ width: LABEL_W }}
            >
              <span className="text-[11px] font-semibold text-[var(--c-muted)] uppercase tracking-wider">Cycle</span>
            </div>
            {/* Month track */}
            <div className="flex-1 relative" style={{ height: HEADER_H }}>
              {months.map(mo => (
                <div
                  key={mo.label + mo.x}
                  className="absolute bottom-2 flex flex-col items-start gap-0.5"
                  style={{ left: mo.x + 16 }}
                >
                  <span className="text-[11px] font-semibold text-[var(--c-text-sub)] uppercase tracking-wide capitalize whitespace-nowrap">
                    {mo.label}
                  </span>
                </div>
              ))}
              {/* Today label */}
              {showToday && (
                <div
                  className="absolute bottom-1 flex flex-col items-center"
                  style={{ left: todayX + 16, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[10px] font-bold text-[var(--c-danger)] uppercase tracking-wide">hoy</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="relative">
            {/* Month grid lines + today line — full height */}
            <div className="absolute inset-0 pointer-events-none" style={{ left: LABEL_W + 16 }}>
              {months.map(mo => (
                <div
                  key={'line-' + mo.x}
                  className="absolute top-0 bottom-0 w-px bg-[var(--c-line)]"
                  style={{ left: mo.x }}
                />
              ))}
              {showToday && (
                <div
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: todayX, background: 'var(--c-danger)', opacity: 0.35 }}
                />
              )}
            </div>

            {/* Groups */}
            {groups.map((group, gi) => {
              const sk = sKey(group.status);
              return (
                <div key={group.status} className={gi > 0 ? 'border-t border-[var(--c-border)]' : ''}>
                  {/* Group label */}
                  <div className="flex items-center px-4 py-2 bg-[var(--c-hover)]">
                    <div style={{ width: LABEL_W - 16 }} />
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
                      style={{
                        color: `var(--c-cycle-${sk})`,
                        background: `var(--c-cycle-${sk}-bg)`,
                      }}
                    >
                      {STATUS_LABEL[group.status]}
                    </span>
                  </div>

                  {/* Rows */}
                  {group.list.map((c, ri) => {
                    const csk = sKey(c.status);
                    const startX = dayOffset(toDay(c.start_date!));
                    const endX   = dayOffset(toDay(c.end_date!));
                    const barW   = Math.max(endX - startX, 24);
                    const pct    = c.tasks_total > 0 ? Math.round((c.tasks_done / c.tasks_total) * 100) : 0;

                    return (
                      <div
                        key={c.id}
                        className={`flex items-center group ${ri < group.list.length - 1 ? 'border-b border-[var(--c-line)]' : ''}`}
                        style={{ height: ROW_H }}
                      >
                        {/* Label */}
                        <div
                          className="shrink-0 border-r border-[var(--c-border)] h-full flex flex-col justify-center px-4 gap-0.5"
                          style={{ width: LABEL_W }}
                        >
                          <span className="text-[12px] font-semibold text-[var(--c-text)] truncate leading-tight">{c.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[10px] font-mono font-semibold rounded px-1 py-0.5 leading-none"
                              style={{ color: `var(--c-cycle-${csk})`, background: `var(--c-cycle-${csk}-bg)` }}
                            >
                              {c.project_code}
                            </span>
                            <span className="text-[10px] text-[var(--c-muted)]">{c.tasks_done}/{c.tasks_total}</span>
                          </div>
                        </div>

                        {/* Chart row */}
                        <div className="flex-1 relative h-full" style={{ paddingLeft: 16, paddingRight: 16 }}>
                          <button
                            type="button"
                            onClick={() => onCycleClick(c)}
                            title={`${c.name} · ${formatDate(c.start_date)} → ${formatDate(c.end_date)}`}
                            className="absolute top-1/2 -translate-y-1/2 h-7 rounded-lg cursor-pointer border-none font-[inherit] overflow-hidden hover:brightness-95 transition-all focus:outline-none"
                            style={{ left: startX + 16, width: barW }}
                          >
                            {/* Background */}
                            <div
                              className="absolute inset-0"
                              style={{ background: `var(--c-cycle-${csk}-bg)`, border: `1.5px solid var(--c-cycle-${csk})`, borderRadius: 8, opacity: 0.7 }}
                            />
                            {/* Progress fill */}
                            <div
                              className="absolute inset-y-0 left-0 rounded-l-lg"
                              style={{ width: `${pct}%`, background: `var(--c-cycle-${csk})`, opacity: 0.5 }}
                            />
                            {/* Label */}
                            {barW > 48 && (
                              <span
                                className="relative z-10 px-2 text-[10px] font-bold leading-none flex items-center h-full gap-1 whitespace-nowrap"
                                style={{ color: `var(--c-cycle-${csk})` }}
                              >
                                {pct}%
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar view ───────────────────────────────────────────────────────────
function CalendarView({ cycles }: { cycles: CycleSummary[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const datedCycles = cycles.filter(c => c.start_date && c.end_date);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  function cyclesForDay(d: number): CycleSummary[] {
    const day = new Date(year, month, d);
    return datedCycles.filter(c => {
      const start = toDay(c.start_date!);
      const end = toDay(c.end_date!);
      return day >= start && day <= end;
    });
  }

  // On a given day, is it the first visible day of a cycle in this month?
  function showLabel(c: CycleSummary, d: number): boolean {
    const start = toDay(c.start_date!);
    // Show name if: it's the actual start day OR it's the 1st of the month (cycle started before)
    const monthStart = new Date(year, month, 1);
    return start >= monthStart ? start.getDate() === d : d === 1;
  }

  const visibleCycles = datedCycles.filter(c => {
    const start = toDay(c.start_date!);
    const end = toDay(c.end_date!);
    return start <= new Date(year, month, lastDay) && end >= new Date(year, month, 1);
  });

  const monthLabel = viewDate.toLocaleDateString('es', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Month nav ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-2 rounded-xl hover:bg-[var(--c-hover)] transition-colors bg-transparent border border-[var(--c-border)] cursor-pointer"
          aria-label="Mes anterior"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="text-[var(--c-text-sub)]">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-[var(--c-text)] capitalize">{monthLabel}</h2>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-2 rounded-xl hover:bg-[var(--c-hover)] transition-colors bg-transparent border border-[var(--c-border)] cursor-pointer"
          aria-label="Mes siguiente"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="text-[var(--c-text-sub)]">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ── Legend ── */}
      {visibleCycles.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {visibleCycles.slice(0, 8).map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: `var(--c-cycle-${sKey(c.status)})` }}
              />
              <span className="text-[11px] text-[var(--c-text-sub)]">{c.name}</span>
            </div>
          ))}
          {visibleCycles.length > 8 && (
            <span className="text-[11px] text-[var(--c-muted)]">+{visibleCycles.length - 8} más</span>
          )}
        </div>
      )}

      {/* ── Calendar grid ── */}
      <div className="rounded-2xl border border-[var(--c-border)] overflow-hidden">

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[var(--c-border)] bg-[var(--c-hover)]">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, i) => (
            <div
              key={day}
              className={`py-3 text-center text-[11px] font-semibold uppercase tracking-wider ${
                i >= 5 ? 'text-[var(--c-muted)]' : 'text-[var(--c-text-sub)]'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, week) => (
          <div key={week} className={`grid grid-cols-7 ${week < cells.length / 7 - 1 ? 'border-b border-[var(--c-border)]' : ''}`}>
            {cells.slice(week * 7, week * 7 + 7).map((d, col) => {
              const i = week * 7 + col;
              const isToday = d !== null && d === today.getDate() && isCurrentMonth;
              const isWeekend = col >= 5;
              const dayCycles = d !== null ? cyclesForDay(d) : [];
              const shown = dayCycles.slice(0, 3);
              const overflow = dayCycles.length - 3;

              return (
                <div
                  key={i}
                  className={`min-h-[7rem] flex flex-col ${col < 6 ? 'border-r border-[var(--c-border)]' : ''} ${
                    d === null ? 'bg-[var(--c-hover)]' : ''
                  }`}
                >
                  {d !== null && (
                    <>
                      {/* Day number */}
                      <div className="px-2.5 pt-2.5 pb-1.5">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-semibold leading-none select-none ${
                            isToday
                              ? 'bg-[var(--c-text)] text-[var(--c-bg)]'
                              : isWeekend
                                ? 'text-[var(--c-muted)]'
                                : 'text-[var(--c-text-sub)]'
                          }`}
                        >
                          {d}
                        </span>
                      </div>

                      {/* Cycle bars */}
                      <div className="flex flex-col gap-[3px] px-1.5 pb-2">
                        {shown.map(c => {
                          const sk = sKey(c.status);
                          const label = showLabel(c, d);
                          return (
                            <div
                              key={c.id}
                              title={c.name}
                              className="rounded-md px-1.5 py-[3px] text-[10px] font-medium leading-tight truncate"
                              style={{
                                background: `var(--c-cycle-${sk}-bg)`,
                                color: `var(--c-cycle-${sk})`,
                              }}
                            >
                              {label ? c.name : '\u00a0'}
                            </div>
                          );
                        })}
                        {overflow > 0 && (
                          <p className="text-[10px] text-[var(--c-muted)] px-1 font-medium">
                            +{overflow} más
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {datedCycles.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="text-[var(--c-muted)]">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-sm text-[var(--c-muted)]">Ningún cycle tiene fechas para mostrar en el calendario.</p>
        </div>
      )}
    </div>
  );
}

// ── Custom filter dropdown ──────────────────────────────────────────────────
function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  width = 160,
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

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-1.5 text-[12px] rounded-lg px-2.5 py-1.5 border border-[var(--c-border)] bg-[var(--c-bg)] cursor-pointer font-[inherit] transition-colors hover:border-[var(--c-accent)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
        style={{ color: selected ? 'var(--c-text)' : 'var(--c-muted)' }}
      >
        <span className="truncate">{loading ? 'Cargando…' : (selected?.label ?? placeholder)}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          aria-hidden="true"
          className="shrink-0 text-[var(--c-muted)] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg overflow-hidden py-1"
          style={{ minWidth: width, maxWidth: 260 }}
        >
          {/* Placeholder / clear option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer font-[inherit] border-none transition-colors hover:bg-[var(--c-hover)]"
            style={{ color: value === '' ? 'var(--c-accent)' : 'var(--c-muted)' }}
          >
            {placeholder}
          </button>

          {options.length > 0 && <div className="my-1 h-px bg-[var(--c-line)]" />}

          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer font-[inherit] border-none transition-colors hover:bg-[var(--c-hover)] flex items-center justify-between gap-2"
              style={{ color: 'var(--c-text)' }}
            >
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

// ── Main page ───────────────────────────────────────────────────────────────
export default function CyclesPage() {
  const [cycles,  setCycles]  = useState<CycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cycleTasks, setCycleTasks] = useState<Record<string, TaskItem[]>>({});
  const [tasksLoading, setTasksLoading] = useState<Record<string, boolean>>({});
  const dispatch = useUIDispatch();
  const { tasksVersion } = useUIState();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [projects,  setProjects]  = useState<ProjectSummary[]>([]);
  const [form, setForm] = useState({ project_code: '', name: '', status: 'planificado' as CycleSummary['status'], start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Manage tasks modal
  const [manageId,       setManageId]       = useState<string | null>(null);
  const [manageTab,      setManageTab]       = useState<'tasks' | 'epics'>('tasks');
  const [allProjTasks,   setAllProjTasks]    = useState<TaskItem[]>([]);
  const [projEpics,      setProjEpics]       = useState<EpicItem[]>([]);
  const [taskSearch,     setTaskSearch]      = useState('');
  const [pendingRemove,  setPendingRemove]   = useState<{ cycleId: string; taskId: string } | null>(null);

  // Edit & delete cycle state
  const [editCycle,       setEditCycle]       = useState<CycleSummary | null>(null);
  const [editForm,        setEditForm]        = useState({ name: '', status: 'planificado' as CycleSummary['status'], start_date: '', end_date: '' });
  const [editSaving,      setEditSaving]      = useState(false);
  const [editError,       setEditError]       = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Filters
  const [filterStatus,  setFilterStatus]  = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterEpic,    setFilterEpic]    = useState('');
  const [filterEpics,   setFilterEpics]   = useState<EpicItem[]>([]);
  const [epicLoading,   setEpicLoading]   = useState(false);

  const fetchCycles = useCallback(() => {
    setLoading(true);
    apiGet<ApiWrapped<CycleSummary[]>>('/cycles')
      .then((res) => setCycles(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles, tasksVersion]);

  function openModal() {
    setForm({ project_code: '', name: '', status: 'planificado' as CycleSummary['status'], start_date: '', end_date: '' });
    setFormError('');
    if (projects.length === 0) {
      apiGet<ApiWrapped<ProjectSummary[]>>('/projects')
        .then((res) => setProjects(res.data))
        .catch(console.error);
    }
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_code) { setFormError('Selecciona un proyecto'); return; }
    if (!form.name.trim())  { setFormError('El nombre es requerido'); return; }
    if (form.start_date && form.end_date && form.end_date <= form.start_date) {
      setFormError('La fecha de fin debe ser posterior a la de inicio'); return;
    }
    if ((form.start_date && !form.end_date) || (!form.start_date && form.end_date)) {
      setFormError('Debes indicar ambas fechas o ninguna'); return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, string | null> = {
        project_code: form.project_code,
        name: form.name.trim(),
        status: form.status,
      };
      if (form.start_date && form.end_date) {
        payload.start_date = form.start_date;
        payload.end_date = form.end_date;
      }
      await apiPost('/cycles', payload);
      playSuccess();
      setModalOpen(false);
      fetchCycles();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al crear el cycle');
    } finally {
      setSaving(false);
    }
  }

  function toggleCycle(cycleId: string) {
    if (expandedId === cycleId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(cycleId);
    if (cycleTasks[cycleId]) return; // already loaded
    setTasksLoading(prev => ({ ...prev, [cycleId]: true }));
    apiGet<ApiWrapped<TaskItem[]>>(`/tasks?cycleId=${cycleId}`)
      .then(res => setCycleTasks(prev => ({ ...prev, [cycleId]: res.data })))
      .catch(console.error)
      .finally(() => setTasksLoading(prev => ({ ...prev, [cycleId]: false })));
  }

  function openManage(cycle: CycleSummary) {
    setManageId(cycle.id);
    setManageTab('tasks');
    setTaskSearch('');
    setAllProjTasks([]);
    setProjEpics([]);
    Promise.all([
      apiGet<ApiWrapped<TaskItem[]>>(`/projects/${cycle.project_code}/tasks`),
      apiGet<ApiWrapped<EpicItem[]>>(`/projects/${cycle.project_code}/epics`),
    ])
      .then(([tRes, eRes]) => {
        setAllProjTasks(tRes.data);
        setProjEpics(eRes.data.filter(e => e.status === 'activa'));
      })
      .catch(console.error);
  }

  async function addTaskToCycle(cycleId: string, task: TaskItem) {
    await apiPatch(`/cycles/${cycleId}/tasks/${task.id}`, {}).catch(console.error);
    setCycleTasks(prev => ({
      ...prev,
      [cycleId]: [...(prev[cycleId] ?? []), task],
    }));
  }

  async function removeTaskFromCycle(cycleId: string, taskId: string) {
    await apiDelete(`/cycles/${cycleId}/tasks/${taskId}`).catch(console.error);
    setCycleTasks(prev => ({
      ...prev,
      [cycleId]: (prev[cycleId] ?? []).filter(t => t.id !== taskId),
    }));
    playDelete();
  }

  async function addEpicToCycle(cycleId: string, epicId: string, projectCode: string) {
    await apiPatch(`/cycles/${cycleId}/epics/${epicId}`, {}).catch(console.error);
    // Refresh cycle tasks from API
    apiGet<ApiWrapped<TaskItem[]>>(`/tasks?cycleId=${cycleId}`)
      .then(res => setCycleTasks(prev => ({ ...prev, [cycleId]: res.data })))
      .catch(console.error);
    // Also refresh all project tasks so counts are correct
    apiGet<ApiWrapped<TaskItem[]>>(`/projects/${projectCode}/tasks`)
      .then(res => setAllProjTasks(res.data))
      .catch(console.error);
  }

  function openEditModal(cycle: CycleSummary) {
    setEditCycle(cycle);
    setEditForm({
      name: cycle.name,
      status: cycle.status as CycleSummary['status'],
      start_date: cycle.start_date ? cycle.start_date.slice(0, 10) : '',
      end_date: cycle.end_date ? cycle.end_date.slice(0, 10) : '',
    });
    setEditError('');
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCycle) return;
    if (!editForm.name.trim()) { setEditError('El nombre es requerido'); return; }
    if (editForm.start_date && editForm.end_date && editForm.end_date <= editForm.start_date) {
      setEditError('La fecha de fin debe ser posterior a la de inicio'); return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      await apiPatch(`/cycles/${editCycle.id}`, {
        name: editForm.name.trim(),
        status: editForm.status,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      });
      playSuccess();
      setEditCycle(null);
      fetchCycles();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar el cycle');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    await apiDelete(`/cycles/${id}`).catch(console.error);
    playDelete();
    setPendingDeleteId(null);
    setCycles(prev => prev.filter(c => c.id !== id));
    setCycleTasks(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  const groups = useMemo(() =>
    STATUS_ORDER
      .map((s) => ({ status: s, cycles: cycles.filter((c) => c.status === s) }))
      .filter((g) => g.cycles.length > 0),
  [cycles]);

  // ── Filter helpers ──────────────────────────────────────────────────────
  const uniqueProjects = useMemo(() => {
    const map = new Map<string, string>();
    cycles.forEach(c => map.set(c.project_code, c.project_name));
    return [...map.entries()].map(([code, name]) => ({ code, name }));
  }, [cycles]);

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

  // Pre-load tasks for all cycles in project when epic filter is applied
  useEffect(() => {
    if (!filterEpic || !filterProject) return;
    const toLoad = cycles.filter(c => c.project_code === filterProject && !cycleTasks[c.id]);
    if (!toLoad.length) return;
    Promise.all(
      toLoad.map(c =>
        apiGet<ApiWrapped<TaskItem[]>>(`/tasks?cycleId=${c.id}`)
          .then(res => ({ id: c.id, tasks: res.data }))
      )
    ).then(results => {
      setCycleTasks(prev => {
        const next = { ...prev };
        results.forEach(r => { next[r.id] = r.tasks; });
        return next;
      });
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEpic, filterProject]);

  const filteredCycles = useMemo(() => {
    return cycles.filter(c => {
      if (filterStatus.length > 0 && !filterStatus.includes(c.status)) return false;
      if (filterProject && c.project_code !== filterProject) return false;
      if (filterEpic) {
        const tasks = cycleTasks[c.id];
        if (!tasks) return true; // not yet loaded → show tentatively
        return tasks.some(t => t.epic_id === filterEpic);
      }
      return true;
    });
  }, [cycles, filterStatus, filterProject, filterEpic, cycleTasks]);

  const filteredGroups = useMemo(() =>
    STATUS_ORDER
      .map((s) => ({ status: s, cycles: filteredCycles.filter((c) => c.status === s) }))
      .filter((g) => g.cycles.length > 0),
  [filteredCycles]);

  const hasFilter = filterStatus.length > 0 || !!filterProject || !!filterEpic;

  function clearFilters() {
    setFilterStatus([]);
    setFilterProject('');
    setFilterEpic('');
  }

  function toggleStatusFilter(s: string) {
    setFilterStatus(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  const viewButtons: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      id: 'list',
      label: 'Lista',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      id: 'timeline',
      label: 'Línea de tiempo',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="3" y1="12" x2="21" y2="12" />
          <polyline points="8 8 3 12 8 16" />
          <polyline points="16 8 21 12 16 16" />
        </svg>
      ),
    },
    {
      id: 'calendar',
      label: 'Calendario',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-[var(--c-text)] shrink-0 mr-auto">Cycles</h1>

        {/* ── Filters ── */}
        {!loading && cycles.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Status chips */}
            {STATUS_ORDER.map(s => {
              const sk = sKey(s);
              const active = filterStatus.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatusFilter(s)}
                  className="text-[11px] font-semibold rounded-full px-2.5 py-1 transition-all cursor-pointer font-[inherit] border-none"
                  style={{
                    color: active ? `var(--c-cycle-${sk})` : 'var(--c-text-sub)',
                    background: active ? `var(--c-cycle-${sk}-bg)` : 'var(--c-hover)',
                    outline: active ? `1.5px solid var(--c-cycle-${sk})` : '1.5px solid var(--c-border)',
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}

            <div className="w-px h-4 bg-[var(--c-border)]" />

            <FilterSelect
              value={filterProject}
              onChange={setFilterProject}
              options={uniqueProjects.map(p => ({ value: p.code, label: p.name }))}
              placeholder="Proyecto"
              width={140}
            />
            <FilterSelect
              value={filterEpic}
              onChange={setFilterEpic}
              options={filterEpics.map(e => ({ value: e.id, label: e.name }))}
              placeholder="Épica"
              disabled={!filterProject}
              loading={epicLoading}
              width={140}
            />

            {hasFilter && (
              <button
                type="button"
                onClick={clearFilters}
                title="Limpiar filtros"
                className="flex items-center gap-1 text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Limpiar
              </button>
            )}

            <div className="w-px h-4 bg-[var(--c-border)]" />
          </div>
        )}

        {/* View switcher */}
        <div className="flex items-center gap-1 border border-[var(--c-border)] rounded-lg p-0.5 bg-[var(--c-hover)] shrink-0">
          {viewButtons.map(btn => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setViewMode(btn.id)}
              aria-pressed={viewMode === btn.id}
              title={btn.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors border-none cursor-pointer font-[inherit] ${
                viewMode === btn.id
                  ? 'bg-[var(--c-bg)] text-[var(--c-text)] shadow-sm'
                  : 'bg-transparent text-[var(--c-muted)] hover:text-[var(--c-text-sub)]'
              }`}
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-1.5 text-sm font-semibold text-[var(--c-bg)] bg-[var(--c-text)] rounded-lg px-3 py-2 hover:opacity-80 transition-opacity cursor-pointer border-none font-[inherit] shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nuevo cycle</span>
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && cycles.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="text-[var(--c-border)]">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <p className="text-sm text-[var(--c-muted)]">No hay cycles todavía. Crea el primero.</p>
        </div>
      )}

      {/* Empty filtered state */}
      {!loading && cycles.length > 0 && filteredCycles.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="text-[var(--c-muted)]">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-sm text-[var(--c-muted)]">Ningún cycle coincide con los filtros.</p>
          <button type="button" onClick={clearFilters} className="text-[12px] text-[var(--c-accent)] cursor-pointer bg-transparent border-none font-[inherit] hover:underline">Limpiar filtros</button>
        </div>
      )}

      {/* ── List view ── */}
      {!loading && filteredCycles.length > 0 && viewMode === 'list' && (
        <div className="flex flex-col gap-8">
          {filteredGroups.map((group) => (
            <section key={group.status}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
                  style={{
                    color: `var(--c-cycle-${sKey(group.status)})`,
                    background: `var(--c-cycle-${sKey(group.status)}-bg)`,
                  }}
                >
                  {STATUS_LABEL[group.status]}
                </span>
                <span className="text-[11px] text-[var(--c-muted)]">{group.cycles.length}</span>
                <div className="flex-1 h-px bg-[var(--c-line)]" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {group.cycles.map((c) => (
                  <CycleCard
                    key={c.id}
                    cycle={c}
                    isExpanded={expandedId === c.id}
                    tasks={cycleTasks[c.id] ?? []}
                    loadingTasks={!!tasksLoading[c.id]}
                    onToggle={() => toggleCycle(c.id)}
                    onManage={() => openManage(c)}
                    onEdit={() => openEditModal(c)}
                    onDelete={() => setPendingDeleteId(c.id)}
                    onStatusChange={(status) => {
                      apiPatch(`/cycles/${c.id}`, { status }).catch(console.error);
                      setCycles(prev => prev.map(x => x.id === c.id ? { ...x, status } : x));
                    }}
                    onTaskClick={(taskId, projectId) => dispatch(openDrawer({ taskId, projectId }))}
                    onRemoveTask={(taskId) => setPendingRemove({ cycleId: c.id, taskId })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Timeline view ── */}
      {!loading && filteredCycles.length > 0 && viewMode === 'timeline' && (
        <TimelineView cycles={filteredCycles} onCycleClick={(c) => openManage(c)} />
      )}

      {/* ── Calendar view ── */}
      {!loading && filteredCycles.length > 0 && viewMode === 'calendar' && (
        <CalendarView cycles={filteredCycles} />
      )}

      {/* Manage tasks modal */}
      <Modal open={!!manageId} onClose={() => setManageId(null)} title="Agregar tareas al cycle">
        {manageId && (() => {
          const cycle = cycles.find(c => c.id === manageId);
          const inCycle = new Set((cycleTasks[manageId] ?? []).map(t => t.id));
          const available = allProjTasks.filter(t => !inCycle.has(t.id));
          const searchLow = taskSearch.toLowerCase();
          const filtered = available.filter(t =>
            t.title.toLowerCase().includes(searchLow) ||
            t.identifier.toLowerCase().includes(searchLow),
          );
          // Épicas ya agregadas: todas sus tareas están en el cycle
          const epicTotal = new Map<string, number>();
          const epicInC   = new Map<string, number>();
          for (const t of allProjTasks) {
            if (t.epic_id) {
              epicTotal.set(t.epic_id, (epicTotal.get(t.epic_id) ?? 0) + 1);
              if (inCycle.has(t.id)) epicInC.set(t.epic_id, (epicInC.get(t.epic_id) ?? 0) + 1);
            }
          }
          const availableEpics = projEpics.filter(ep => {
            const total = epicTotal.get(ep.id) ?? 0;
            return total === 0 || (epicInC.get(ep.id) ?? 0) < total;
          });
          return (
            <div className="flex flex-col gap-0">

              {/* Context: tasks already in cycle */}
              {inCycle.size > 0 && (
                <div className="flex items-center gap-1.5 mb-3 px-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-[var(--c-cycle-active)] shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[12px] text-[var(--c-text-sub)]">
                    {inCycle.size} tarea{inCycle.size !== 1 ? 's' : ''} ya {inCycle.size === 1 ? 'agregada' : 'agregadas'} a este cycle
                  </span>
                </div>
              )}

              {/* Tabs with count badges */}
              <div className="flex gap-0 border-b border-[var(--c-border)] mb-4">
                {([
                  { id: 'tasks' as const, label: 'Tareas', count: available.length },
                  { id: 'epics' as const, label: 'Por épica', count: availableEpics.length },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setManageTab(tab.id)}
                    className={`flex items-center gap-1.5 text-[13px] px-3 py-2 border-b-2 -mb-px transition-colors bg-transparent border-x-0 border-t-0 cursor-pointer font-[inherit] ${
                      manageTab === tab.id
                        ? 'border-b-[var(--c-text)] text-[var(--c-text)] font-semibold'
                        : 'border-b-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`text-[11px] font-semibold rounded-full px-1.5 py-0.5 leading-none ${
                        manageTab === tab.id
                          ? 'bg-[var(--c-hover)] text-[var(--c-text-sub)]'
                          : 'bg-[var(--c-hover)] text-[var(--c-muted)]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Tasks tab ── */}
              {manageTab === 'tasks' && (
                <div className="flex flex-col gap-3">
                  {/* Search with icon */}
                  <div className="relative">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Buscar por título o ID…"
                      value={taskSearch}
                      onChange={e => setTaskSearch(e.target.value)}
                      className="w-full border border-[var(--c-border)] rounded-lg pl-9 pr-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
                    />
                  </div>

                  {filtered.length === 0 ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="text-[var(--c-muted)]">
                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <p className="text-[13px] text-[var(--c-muted)]">
                        {available.length === 0
                          ? 'Todas las tareas del proyecto ya están en este cycle'
                          : 'Sin resultados para esa búsqueda'}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col divide-y divide-[var(--c-line)] max-h-72 overflow-y-auto -mx-1 px-1">
                      {filtered.map(t => (
                        <li key={t.id} className="flex items-center gap-3 py-2.5">
                          {/* Task info — 2 lines */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[var(--c-text)] leading-snug">{t.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] font-mono text-[var(--c-muted)]">{t.identifier}</span>
                              {t.epic_name && (
                                <span className="text-[10px] bg-[var(--c-hover)] text-[var(--c-text-sub)] rounded-md px-1.5 py-0.5 border border-[var(--c-line)]">{t.epic_name}</span>
                              )}
                            </div>
                          </div>
                          {/* Add button */}
                          <button
                            type="button"
                            onClick={() => addTaskToCycle(manageId, t)}
                            className="shrink-0 flex items-center gap-1 text-[12px] font-medium text-[var(--c-text-sub)] hover:text-[var(--c-text)] border border-[var(--c-border)] hover:border-[var(--c-text-sub)] bg-transparent rounded-lg px-2.5 py-1 transition-colors cursor-pointer font-[inherit]"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Agregar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── Epics tab ── */}
              {manageTab === 'epics' && (
                <div className="flex flex-col gap-2">
                  {availableEpics.length === 0 ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="text-[var(--c-muted)]">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <p className="text-[13px] text-[var(--c-muted)]">
                        {projEpics.length === 0
                          ? 'No hay épicas activas en este proyecto'
                          : 'Todas las épicas ya están en este cycle'}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                      {availableEpics.map(ep => (
                        <li key={ep.id} className="border border-[var(--c-border)] rounded-xl p-3.5 hover:bg-[var(--c-hover)] transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-[var(--c-text-sub)] shrink-0">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span className="text-[13px] font-semibold text-[var(--c-text)] leading-snug">{ep.name}</span>
                              </div>
                              <p className="text-[11px] text-[var(--c-muted)] mt-1 pl-5">
                                Agrega todas las tareas de esta épica al cycle
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => cycle && addEpicToCycle(manageId, ep.id, cycle.project_code)}
                              className="shrink-0 flex items-center gap-1 text-[12px] font-medium text-[var(--c-text-sub)] hover:text-[var(--c-text)] border border-[var(--c-border)] hover:border-[var(--c-text-sub)] bg-transparent rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer font-[inherit] whitespace-nowrap"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                              Agregar todas
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Create cycle modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo cycle">
        <form onSubmit={handleCreate} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Proyecto</label>
            <select
              value={form.project_code}
              onChange={(e) => setForm((f) => ({ ...f, project_code: e.target.value }))}
              className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
            >
              <option value="">Selecciona un proyecto…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.code}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Nombre</label>
            <input
              type="text"
              placeholder="Ej. Sprint 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Estado</label>
            <div className="flex gap-2">
              {(['planificado', 'activo', 'completado'] as CycleSummary['status'][]).map(s => {
                const sk = sKey(s);
                const active = form.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium border transition-colors cursor-pointer font-[inherit]"
                    style={active ? {
                      background: `var(--c-cycle-${sk}-bg)`,
                      color: `var(--c-cycle-${sk})`,
                      borderColor: `var(--c-cycle-${sk})`,
                    } : {
                      background: 'transparent',
                      color: 'var(--c-text-sub)',
                      borderColor: 'var(--c-border)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: active ? `var(--c-cycle-${sk})` : 'var(--c-muted)' }}
                    />
                    {STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
              />
            </div>
          </div>

          {formError && <p className="text-xs text-[var(--c-danger)]">{formError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-4 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm font-semibold text-[var(--c-bg)] bg-[var(--c-text)] rounded-lg px-4 py-2 hover:opacity-80 transition-opacity cursor-pointer font-[inherit] disabled:opacity-40"
            >
              {saving ? 'Creando…' : 'Crear cycle'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={pendingRemove !== null}
        title="Quitar tarea del cycle"
        message="La tarea se quitará de este cycle pero no se eliminará."
        confirmLabel="Quitar"
        onConfirm={() => { if (pendingRemove) removeTaskFromCycle(pendingRemove.cycleId, pendingRemove.taskId); setPendingRemove(null); }}
        onCancel={() => setPendingRemove(null)}
      />

      {/* Edit cycle modal */}
      <Modal open={!!editCycle} onClose={() => setEditCycle(null)} title="Editar cycle">
        <form onSubmit={handleEdit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Nombre</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Estado</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value as CycleSummary['status'] }))}
              className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
            >
              <option value="planificado">Planificado</option>
              <option value="activo">Activo</option>
              <option value="completado">Completado</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Inicio</label>
              <input
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">Fin</label>
              <input
                type="date"
                value={editForm.end_date}
                onChange={(e) => setEditForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
              />
            </div>
          </div>

          {editError && <p className="text-xs text-[var(--c-danger)]">{editError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditCycle(null)}
              className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg px-4 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="text-sm font-semibold text-[var(--c-bg)] bg-[var(--c-text)] rounded-lg px-4 py-2 hover:opacity-80 transition-opacity cursor-pointer font-[inherit] disabled:opacity-40"
            >
              {editSaving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete cycle confirm */}
      <ConfirmModal
        open={pendingDeleteId !== null}
        title="Eliminar cycle"
        message="Se eliminará el cycle y sus tareas se desvincularán. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
