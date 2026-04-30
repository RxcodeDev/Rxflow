'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useUIDispatch, useUIState } from '@/store/UIContext';
import { openDrawer, bumpTasks } from '@/store/slices/uiSlice';
import type { TaskItem, ApiWrapped } from '@/types/api.types';

/* ── Types ───────────────────────────────────────────── */
type ViewMode = 'projects' | 'calendar';
type CalMode  = 'day' | 'week' | 'month';

const STATUS_GROUPS = ['en_progreso', 'en_revision', 'backlog', 'bloqueado', 'completada'] as const;
type StatusKey = typeof STATUS_GROUPS[number];

/* ── Constants ───────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  en_progreso: 'En progreso', en_revision: 'En revisión',
  backlog: 'Backlog', bloqueado: 'Bloqueado', completada: 'Completada',
};
const STATUS_DOT: Record<string, string> = {
  en_progreso: '#3b82f6', en_revision: '#f59e0b',
  backlog: '#94a3b8', bloqueado: '#ef4444', completada: '#22c55e',
};
const PRIORITY_LABEL: Record<string, string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Media', baja: 'Baja',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgente: '#ef4444', alta: '#f97316', media: '#f59e0b', baja: '#94a3b8',
};
const PROJECT_ACCENTS = [
  '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#3b82f6', '#ec4899', '#0d9488', '#64748b', '#d946ef',
];
const WEEK_DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── Date helpers ────────────────────────────────────── */
function dueDateLabel(raw: string | null): { label: string; danger: boolean } | null {
  if (!raw) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(raw); d.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: 'Vencida',  danger: true  };
  if (diff === 0) return { label: 'Hoy',     danger: false };
  if (diff === 1) return { label: 'Mañana',  danger: false };
  return { label: d.toLocaleDateString('es', { day: 'numeric', month: 'short' }), danger: false };
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
function startOfWeek(date: Date): Date {
  const d = new Date(date); d.setHours(0,0,0,0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function taskDate(t: TaskItem): Date | null {
  if (!t.due_date) return null;
  const d = new Date(t.due_date); d.setHours(0,0,0,0); return d;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

/* ── StatusMenu ──────────────────────────────────────── */
function StatusMenu({ current, onSelect }: { current: string; onSelect: (s: StatusKey) => void }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(v => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--c-border)] hover:bg-[var(--c-hover)] transition-colors text-[11px] text-[var(--c-text-sub)] cursor-pointer bg-transparent font-[inherit]">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[current] ?? STATUS_DOT.backlog }} aria-hidden="true" />
        <span className="hidden sm:inline">{STATUS_LABEL[current] ?? current}</span>
        <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="min-w-[160px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg py-1 text-sm"
          onClick={e => e.stopPropagation()}>
          {STATUS_GROUPS.map(s => (
            <button key={s} type="button" onClick={() => { setOpen(false); onSelect(s); }}
              className={'w-full text-left flex items-center gap-2.5 px-3 py-2 cursor-pointer font-[inherit] border-none bg-transparent transition-colors hover:bg-[var(--c-hover)] ' +
                (s === current ? 'text-[var(--c-text)] font-semibold' : 'text-[var(--c-text-sub)]')}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[s] }} aria-hidden="true" />
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── TaskRow ─────────────────────────────────────────── */
function TaskRow({ task, onStatusChange, onOpen }: {
  task: TaskItem;
  onStatusChange: (id: string, s: StatusKey) => void;
  onOpen: (id: string, code: string) => void;
}) {
  const due  = dueDateLabel(task.due_date);
  const done = task.status === 'completada';
  return (
    <div onClick={() => onOpen(task.id, task.project_code.toLowerCase())}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--c-hover)] transition-colors cursor-pointer">
      <button type="button" onClick={e => { e.stopPropagation(); onStatusChange(task.id, done ? 'en_progreso' : 'completada'); }}
        className={'shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ' +
          (done ? 'bg-[var(--c-text)] border-[var(--c-text)]' : 'bg-transparent border-[var(--c-border)] hover:border-[var(--c-text-sub)]')}
        aria-label={done ? 'Marcar incompleta' : 'Marcar completada'}>
        {done && (
          <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="white" strokeWidth="1.8" aria-hidden="true">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
          </svg>
        )}
      </button>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[task.priority] ?? '#94a3b8' }} aria-hidden="true" />
      <span className="font-mono text-[11px] text-[var(--c-muted)] shrink-0 w-14 hidden sm:block">{task.identifier}</span>
      <span className={`flex-1 min-w-0 text-sm truncate ${done ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
        {task.title}
      </span>
      {task.epic_name && (
        <span className="hidden lg:inline shrink-0 text-[11px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded px-1.5 py-0.5 max-w-[110px] truncate">
          {task.epic_name}
        </span>
      )}
      {due && (
        <span className={`shrink-0 text-[11px] hidden sm:inline ${due.danger ? 'text-[var(--c-danger)]' : 'text-[var(--c-text-sub)]'}`}>
          {due.label}
        </span>
      )}
      <StatusMenu current={task.status} onSelect={s => onStatusChange(task.id, s)} />
    </div>
  );
}

/* ── TaskChip (for calendar cells) ──────────────────── */
function TaskChip({ task, projectCodes, compact = false, onOpen }: {
  task: TaskItem;
  projectCodes: string[];
  compact?: boolean;
  onOpen: (id: string, code: string) => void;
}) {
  const accent = PROJECT_ACCENTS[projectCodes.indexOf(task.project_code) % PROJECT_ACCENTS.length] ?? PROJECT_ACCENTS[0];
  const done = task.status === 'completada';
  return (
    <button type="button" onClick={() => onOpen(task.id, task.project_code.toLowerCase())}
      className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer border-none font-[inherit] transition-all hover:opacity-75 text-[11px]"
      style={{ backgroundColor: `${accent}18`, color: accent }}
      title={task.title}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[task.status] ?? '#94a3b8' }} aria-hidden="true" />
      {!compact && <span className="font-mono opacity-70 shrink-0">{task.identifier}</span>}
      <span className={`flex-1 min-w-0 truncate ${done ? 'line-through opacity-50' : ''}`}>{task.title}</span>
    </button>
  );
}

/* ── ProjectsView ────────────────────────────────────── */
function ProjectsView({ tasks, projectCodes, onStatusChange, onOpen, filterStatus, filterPriority }: {
  tasks: TaskItem[];
  projectCodes: string[];
  onStatusChange: (id: string, s: StatusKey) => void;
  onOpen: (id: string, code: string) => void;
  filterStatus: string;
  filterPriority: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let t = tasks;
    if (filterStatus)   t = t.filter(x => x.status === filterStatus);
    if (filterPriority) t = t.filter(x => x.priority === filterPriority);
    return t;
  }, [tasks, filterStatus, filterPriority]);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; code: string; tasks: TaskItem[] }>();
    filtered.forEach(t => {
      if (!map.has(t.project_code)) map.set(t.project_code, { name: t.project_name, code: t.project_code, tasks: [] });
      map.get(t.project_code)!.tasks.push(t);
    });
    return [...map.values()].sort((a, b) => {
      const aA = a.tasks.filter(t => t.status !== 'completada').length;
      const bA = b.tasks.filter(t => t.status !== 'completada').length;
      return bA - aA;
    });
  }, [filtered]);

  function toggle(code: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  }

  if (groups.length === 0) return (
    <div className="py-16 flex flex-col items-center gap-3 text-center">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--c-muted)]" aria-hidden="true">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
      <p className="text-sm text-[var(--c-muted)]">No hay tareas que coincidan</p>
    </div>
  );

  const anyCollapsed = collapsed.size > 0;

  function renderCard(g: typeof groups[number]) {
    const accent    = PROJECT_ACCENTS[projectCodes.indexOf(g.code) % PROJECT_ACCENTS.length] ?? PROJECT_ACCENTS[0];
    const isOpen    = !collapsed.has(g.code);
    const done      = g.tasks.filter(t => t.status === 'completada').length;
    const pct       = g.tasks.length > 0 ? Math.round(done * 100 / g.tasks.length) : 0;
    const active    = g.tasks.filter(t => t.status !== 'completada').length;
    const subGroups = STATUS_GROUPS
      .map(s => ({ status: s, tasks: g.tasks.filter(t => t.status === s) }))
      .filter(sg => sg.tasks.length > 0);

    // Collapsed → narrow vertical strip (only in flex/row mode)
    if (!isOpen) {
      return (
        <button key={g.code} type="button" onClick={() => toggle(g.code)}
          className="shrink-0 w-10 flex flex-col items-center justify-start pt-4 pb-4 gap-3 border border-[var(--c-border)] rounded-xl hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-[var(--c-bg)] font-[inherit] h-full"
          style={{ borderLeft: `3px solid ${accent}` }}>
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${accent}18`, color: accent }}>
            {g.code}
          </span>
          <span className="text-[11px] text-[var(--c-muted)] flex-1"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {g.name}
          </span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
            className="text-[var(--c-muted)]" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      );
    }

    // Open card — grid mode: fills cell; flex mode: flex-1
    const cardClass = anyCollapsed
      ? 'flex-1 border border-[var(--c-border)] rounded-xl overflow-hidden flex flex-col min-w-0 min-h-0'
      : 'border border-[var(--c-border)] rounded-xl overflow-hidden flex flex-col min-h-0';

    return (
      <div key={g.code} className={cardClass} style={{ borderTop: `3px solid ${accent}` }}>
        <button type="button" onClick={() => toggle(g.code)}
          className="w-full shrink-0 flex items-center gap-3 px-4 py-3 hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent border-none font-[inherit] text-left">
          <span className="shrink-0 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md"
            style={{ backgroundColor: `${accent}18`, color: accent }}>
            {g.code}
          </span>
          <span className="flex-1 text-sm font-semibold text-[var(--c-text)] truncate">{g.name}</span>
          <span className="shrink-0 text-[11px] text-[var(--c-muted)] hidden sm:block">
            {active} activa{active !== 1 ? 's' : ''} · {done}/{g.tasks.length}
          </span>
          <div className="shrink-0 w-16 h-1.5 bg-[var(--c-line)] rounded-full overflow-hidden hidden md:block">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: accent }} />
          </div>
          <span className="shrink-0 text-[11px] font-bold" style={{ color: accent }}>{pct}%</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
            className="shrink-0 text-[var(--c-muted)] transition-transform"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div className="border-t border-[var(--c-border)] overflow-y-auto flex-1 min-h-0">
          {subGroups.map(sg => (
            <div key={sg.status}>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--c-hover)]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[sg.status] }} aria-hidden="true" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                  {STATUS_LABEL[sg.status]}
                </span>
                <span className="text-[10px] text-[var(--c-text-sub)]">({sg.tasks.length})</span>
              </div>
              <div className="divide-y divide-[var(--c-line)]">
                {sg.tasks.map(task => (
                  <TaskRow key={task.id} task={task} onStatusChange={onStatusChange} onOpen={onOpen} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid mode when all open, flex row when any collapsed
  if (!anyCollapsed) {
    const cols = groups.length <= 2 ? 1 : 2;
    return (
      <div className="grid gap-3 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: '1fr' }}>
        {groups.map(renderCard)}
      </div>
    );
  }

  return (
    <div className="flex gap-3 h-full min-h-0">
      {groups.map(renderCard)}
    </div>
  );
}

/* ── CalendarView ────────────────────────────────────── */
function CalendarView({ tasks, calMode, setCalMode, projectCodes, onStatusChange, onOpen, filterStatus, filterPriority }: {
  tasks: TaskItem[];
  calMode: CalMode;
  setCalMode: (m: CalMode) => void;
  projectCodes: string[];
  onStatusChange: (id: string, s: StatusKey) => void;
  onOpen: (id: string, code: string) => void;
  filterStatus: string;
  filterPriority: string;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const filtered = useMemo(() => {
    let t = tasks;
    if (filterStatus)   t = t.filter(x => x.status === filterStatus);
    if (filterPriority) t = t.filter(x => x.priority === filterPriority);
    return t;
  }, [tasks, filterStatus, filterPriority]);

  const noDateTasks = useMemo(() => filtered.filter(t => !t.due_date), [filtered]);
  const accentFor = (code: string) => PROJECT_ACCENTS[projectCodes.indexOf(code) % PROJECT_ACCENTS.length] ?? PROJECT_ACCENTS[0];

  function NavBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-border)] hover:bg-[var(--c-hover)] hover:border-[var(--c-text-sub)] cursor-pointer bg-[var(--c-bg)] text-[var(--c-text-sub)] transition-all">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          {dir === 'prev' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
        </svg>
      </button>
    );
  }

  function DayTaskCard({ task }: { task: TaskItem }) {
    const col  = accentFor(task.project_code);
    const done = task.status === 'completada';
    const due  = dueDateLabel(task.due_date);
    return (
      <div onClick={() => onOpen(task.id, task.project_code.toLowerCase())}
        className="flex rounded-xl overflow-hidden border border-[var(--c-border)] hover:shadow-md transition-all cursor-pointer"
        style={{ borderLeftColor: col, borderLeftWidth: 4 }}>
        <div className="flex-1 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={e => { e.stopPropagation(); onStatusChange(task.id, done ? 'en_progreso' : 'completada'); }}
            className={'shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ' +
              (done ? 'bg-[var(--c-text)] border-[var(--c-text)]' : 'bg-transparent border-[var(--c-border)] hover:border-[var(--c-text-sub)]')}
            aria-label={done ? 'Marcar incompleta' : 'Completar'}>
            {done && <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="white" strokeWidth="1.8" aria-hidden="true"><path d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[var(--c-muted)]">{task.identifier}</span>
              {task.epic_name && <span className="hidden sm:inline text-[10px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded px-1.5 py-0.5 max-w-[100px] truncate">{task.epic_name}</span>}
            </div>
            <p className={`text-sm font-medium mt-0.5 truncate ${done ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>{task.title}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md hidden sm:inline"
              style={{ backgroundColor: `${col}18`, color: col }}>{task.project_code}</span>
            <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] ?? '#94a3b8' }} title={PRIORITY_LABEL[task.priority]} />
            {due && <span className={`text-[11px] hidden md:inline ${due.danger ? 'text-[var(--c-danger)] font-semibold' : 'text-[var(--c-text-sub)]'}`}>{due.label}</span>}
            <StatusMenu current={task.status} onSelect={s => onStatusChange(task.id, s)} />
          </div>
        </div>
      </div>
    );
  }

  function renderDay() {
    const dayTasks = filtered.filter(t => { const d = taskDate(t); return d && isSameDay(d, cursor); });
    const isToday  = isSameDay(cursor, today);
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <NavBtn dir="prev" onClick={() => setCursor(addDays(cursor, -1))} />
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-lg font-black text-[var(--c-text)] capitalize">
              {cursor.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              <span className="ml-2 text-base font-light text-[var(--c-text-sub)]">{cursor.getFullYear()}</span>
            </span>
            {isToday && <span className="text-[11px] font-semibold px-3 py-0.5 rounded-full" style={{ backgroundColor: '#06b6d420', color: '#06b6d4' }}>Hoy</span>}
          </div>
          <NavBtn dir="next" onClick={() => setCursor(addDays(cursor, 1))} />
          {!isToday && (
            <button type="button" onClick={() => setCursor(new Date(today))}
              className="text-[12px] px-3 h-8 rounded-lg border border-[var(--c-border)] hover:bg-[var(--c-hover)] cursor-pointer bg-transparent font-[inherit] text-[var(--c-text-sub)] transition-colors">
              Hoy
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 18rem)' }}>
          {dayTasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 border-2 border-dashed border-[var(--c-border)] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#06b6d412' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#06b6d4" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--c-text-sub)]">No hay tareas para este día</p>
              {isToday && <p className="text-[12px] text-[var(--c-muted)]">Tienes el día libre 🎉</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                  {dayTasks.length} tarea{dayTasks.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-[var(--c-line)]" />
              </div>
              {dayTasks.map(t => <DayTaskCard key={t.id} task={t} />)}
            </div>
          )}

          {noDateTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Sin fecha · {noDateTasks.length}</span>
                <div className="flex-1 h-px bg-[var(--c-line)]" />
              </div>
              <div className="flex flex-col gap-2">
                {noDateTasks.slice(0, 8).map(t => <DayTaskCard key={t.id} task={t} />)}
                {noDateTasks.length > 8 && <p className="text-[12px] text-[var(--c-muted)] pl-2">+{noDateTasks.length - 8} más sin fecha</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderWeek() {
    const weekStart = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <NavBtn dir="prev" onClick={() => setCursor(addDays(cursor, -7))} />
          <div className="flex-1 text-center">
            <span className="text-base font-black text-[var(--c-text)]">
              {days[0].toLocaleDateString('es', { day: 'numeric', month: 'short' })}
            </span>
            <span className="mx-2 text-[var(--c-muted)]">—</span>
            <span className="text-base font-black text-[var(--c-text)]">
              {days[6].toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <NavBtn dir="next" onClick={() => setCursor(addDays(cursor, 7))} />
          <button type="button" onClick={() => setCursor(new Date(today))}
            className="text-[12px] px-3 h-8 rounded-lg border border-[var(--c-border)] hover:bg-[var(--c-hover)] cursor-pointer bg-transparent font-[inherit] text-[var(--c-text-sub)] transition-colors">
            Esta semana
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const dayTasks = filtered.filter(t => { const d = taskDate(t); return d && isSameDay(d, day); });
            const isToday  = isSameDay(day, today);
            const isWeekend = i >= 5;
            return (
              <div key={i} className={`flex flex-col rounded-2xl overflow-hidden border transition-shadow ${
                isToday ? 'border-[#06b6d4] shadow-sm ring-1 ring-[#06b6d430]' : 'border-[var(--c-border)]'
              }`}>
                {/* Column header */}
                <div className={`flex flex-col items-center py-3 px-1 ${isToday ? 'bg-[#06b6d4]' : isWeekend ? 'bg-[var(--c-line)]' : 'bg-[var(--c-hover)]'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isToday ? 'text-white opacity-80' : 'text-[var(--c-muted)]'}`}>
                    {WEEK_DAYS_SHORT[i]}
                  </span>
                  <span className={`text-2xl font-black leading-none mt-0.5 ${isToday ? 'text-white' : isWeekend ? 'text-[var(--c-text-sub)]' : 'text-[var(--c-text)]'}`}>
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className={`text-[9px] mt-1 font-semibold px-1.5 py-0.5 rounded-full ${isToday ? 'bg-white/20 text-white' : 'bg-[var(--c-border)] text-[var(--c-text-sub)]'}`}>
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                {/* Tasks */}
                <div className="flex flex-col gap-1 p-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 22rem)', minHeight: '8rem' }}>
                  {dayTasks.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center opacity-30">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                      </svg>
                    </div>
                  ) : dayTasks.map(t => (
                    <TaskChip key={t.id} task={t} projectCodes={projectCodes} compact onOpen={onOpen} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {noDateTasks.length > 0 && (
          <div className="border-2 border-dashed border-[var(--c-border)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--c-muted)]" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">Sin fecha · {noDateTasks.length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {noDateTasks.slice(0, 14).map(t => (
                <div key={t.id} style={{ width: 'calc(50% - 3px)', minWidth: 140, maxWidth: 260 }}>
                  <TaskChip task={t} projectCodes={projectCodes} compact onOpen={onOpen} />
                </div>
              ))}
              {noDateTasks.length > 14 && <span className="text-[11px] text-[var(--c-muted)] self-center">+{noDateTasks.length - 14} más</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMonth() {
    const year  = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay   = new Date(year, month, 1);
    const lastDay    = new Date(year, month + 1, 0);
    const gridStart  = startOfWeek(firstDay);
    const offset     = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalCells = Math.ceil((lastDay.getDate() + offset) / 7) * 7;
    const cells      = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));

    const tasksByDay = new Map<string, number>();
    filtered.forEach(t => {
      if (!t.due_date) return;
      const key = t.due_date.slice(0, 10);
      tasksByDay.set(key, (tasksByDay.get(key) ?? 0) + 1);
    });
    const maxCount = Math.max(1, ...tasksByDay.values());

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <NavBtn dir="prev" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); }} />
          <div className="flex-1 text-center">
            <span className="text-2xl font-black text-[var(--c-text)] capitalize">{MONTHS_ES[month]}</span>
            <span className="ml-2 text-xl font-light text-[var(--c-text-sub)]">{year}</span>
          </div>
          <NavBtn dir="next" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); }} />
          <button type="button" onClick={() => setCursor(new Date(today))}
            className="text-[12px] px-3 h-8 rounded-lg border border-[var(--c-border)] hover:bg-[var(--c-hover)] cursor-pointer bg-transparent font-[inherit] text-[var(--c-text-sub)] transition-colors">
            Este mes
          </button>
        </div>

        <div className="border border-[var(--c-border)] rounded-2xl overflow-hidden">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-[var(--c-border)] bg-[var(--c-hover)]">
            {WEEK_DAYS_SHORT.map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-black uppercase tracking-wider py-2.5 ${i >= 5 ? 'text-[var(--c-muted)]' : 'text-[var(--c-text-sub)]'}`}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const inMonth  = day.getMonth() === month;
              const isToday  = isSameDay(day, today);
              const isWeekend = i % 7 >= 5;
              const isLastRow = i >= totalCells - 7;
              const isLastCol = i % 7 === 6;
              const dayTasks = filtered.filter(t => { const d = taskDate(t); return d && isSameDay(d, day); });
              const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
              const count = tasksByDay.get(key) ?? 0;
              const heatAlpha = count > 0 && inMonth ? Math.max(0.06, (count / maxCount) * 0.18) : 0;

              return (
                <div key={i}
                  onClick={() => { setCursor(day); setCalMode('day'); }}
                  className={`relative flex flex-col min-h-[100px] cursor-pointer transition-colors group
                    ${!isLastRow ? 'border-b border-[var(--c-border)]' : ''}
                    ${!isLastCol ? 'border-r border-[var(--c-border)]' : ''}
                    ${isToday ? 'bg-[#06b6d408]' : isWeekend && inMonth ? 'bg-[var(--c-hover)]' : 'hover:bg-[var(--c-hover)]'}
                    ${!inMonth ? 'opacity-35' : ''}
                  `}
                  style={undefined}>
                  {/* Day number row */}
                  <div className="flex items-center justify-between px-2 pt-2 pb-1">
                    <span className={`text-[12px] font-black w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isToday
                        ? 'text-white'
                        : 'text-[var(--c-text)] group-hover:scale-110'
                    }`} style={isToday ? { backgroundColor: '#06b6d4' } : {}}>
                      {day.getDate()}
                    </span>
                    {count > 0 && inMonth && !isToday && (
                      <span className="text-[9px] font-bold text-[var(--c-muted)]">{count}</span>
                    )}
                    {isToday && count > 0 && (
                      <span className="text-[9px] font-bold" style={{ color: '#06b6d4' }}>{count}</span>
                    )}
                  </div>
                  {/* Task chips */}
                  <div className="flex flex-col gap-0.5 px-1.5 pb-2 flex-1">
                    {dayTasks.slice(0, 3).map(t => (
                      <TaskChip key={t.id} task={t} projectCodes={projectCodes} compact onOpen={onOpen} />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[9px] text-[var(--c-muted)] pl-1 font-semibold">+{dayTasks.length - 3} más</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {noDateTasks.length > 0 && (
          <div className="border-2 border-dashed border-[var(--c-border)] rounded-2xl p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-3">Sin fecha · {noDateTasks.length}</p>
            <div className="flex flex-wrap gap-1.5">
              {noDateTasks.slice(0, 10).map(t => (
                <div key={t.id} style={{ minWidth: 140, maxWidth: 220 }}>
                  <TaskChip task={t} projectCodes={projectCodes} compact onOpen={onOpen} />
                </div>
              ))}
              {noDateTasks.length > 10 && <span className="text-[11px] text-[var(--c-muted)]">+{noDateTasks.length - 10} más</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 p-1 bg-[var(--c-hover)] rounded-xl self-start">
        {(['day', 'week', 'month'] as CalMode[]).map(m => (
          <button key={m} type="button" onClick={() => setCalMode(m)}
            className={'text-[12px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-[inherit] border-none ' +
              (calMode === m ? 'bg-[var(--c-bg)] text-[var(--c-text)] font-semibold shadow-sm' : 'bg-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]')}>
            {m === 'day' ? 'Día' : m === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>
      {calMode === 'day'   && renderDay()}
      {calMode === 'week'  && renderWeek()}
      {calMode === 'month' && renderMonth()}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function MisTareasPage() {
  const dispatch   = useUIDispatch();
  const { tasksVersion } = useUIState();

  const [tasks,          setTasks]          = useState<TaskItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [view,           setView]           = useState<ViewMode>('projects');
  const [calMode,        setCalMode]        = useState<CalMode>('week');
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProject,  setFilterProject]  = useState('');

  useEffect(() => {
    setLoading(true);
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
      // revert on error — re-fetch on next poll
    }
  }, [dispatch]);

  const handleOpen = useCallback((taskId: string, projectId: string) => {
    dispatch(openDrawer({ taskId, projectId }));
  }, [dispatch]);

  const projectCodes = useMemo(() => {
    return [...new Set(tasks.map(t => t.project_code))];
  }, [tasks]);

  const uniqueProjects = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => map.set(t.project_code, t.project_name));
    return [...map.entries()].map(([code, name]) => ({ code, name }));
  }, [tasks]);

  const searchLower = search.toLowerCase();
  const filteredBySearch = useMemo(() => tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(searchLower) && !t.identifier?.toLowerCase().includes(searchLower)) return false;
    if (filterStatus   && t.status   !== filterStatus)   return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterProject  && t.project_code !== filterProject) return false;
    return true;
  }), [tasks, search, searchLower, filterStatus, filterPriority, filterProject]);

  const hasFilter = !!search || !!filterStatus || !!filterPriority || !!filterProject;

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Mis tareas</h1>
          <p className="text-[13px] text-[var(--c-text-sub)] mt-0.5">
            {loading ? '...' : `${tasks.filter(t => t.status !== 'completada').length} tareas activas`}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-[var(--c-hover)] rounded-xl">
          {(['projects', 'calendar'] as ViewMode[]).map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={'text-[12px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-[inherit] border-none ' +
                (view === v ? 'bg-[var(--c-bg)] text-[var(--c-text)] font-semibold shadow-sm' : 'bg-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]')}>
              {v === 'projects' ? 'Proyectos' : 'Calendario'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-col gap-2">
        {/* Row 1: search + project select */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none"
                 width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título o ID..."
              className="pl-8 pr-3 h-8 text-[13px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg text-[var(--c-text)] placeholder-[var(--c-muted)] outline-none focus:border-[var(--c-text-sub)] w-52 transition-colors"
            />
          </div>

          {/* Project select */}
          {uniqueProjects.length > 0 && (
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none"
                   width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 3h18v4l-7 7v7l-4-2v-5L3 7z"/>
              </svg>
              <select
                value={filterProject} onChange={e => setFilterProject(e.target.value)}
                className={"pl-8 pr-6 h-8 text-[13px] border rounded-lg outline-none appearance-none cursor-pointer transition-colors font-[inherit] " +
                  (filterProject
                    ? 'bg-[var(--c-text)] text-[var(--c-bg)] border-[var(--c-text)]'
                    : 'bg-[var(--c-bg)] text-[var(--c-text-sub)] border-[var(--c-border)] hover:border-[var(--c-text-sub)]')}
              >
                <option value="">Todos los proyectos</option>
                {uniqueProjects.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                   width="10" height="10" viewBox="0 0 24 24" fill="none"
                   stroke={filterProject ? 'var(--c-bg)' : 'var(--c-muted)'} strokeWidth="2.5" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          )}

          {/* Clear */}
          {hasFilter && (
            <button type="button" onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterProject(''); }}
              className="h-8 px-2.5 flex items-center gap-1.5 text-[11px] text-[var(--c-muted)] hover:text-[var(--c-danger)] border border-[var(--c-border)] hover:border-[var(--c-danger)] rounded-lg transition-colors cursor-pointer bg-transparent font-[inherit]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Limpiar
            </button>
          )}
        </div>

        {/* Row 2: status + priority pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Status label */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-muted)] mr-0.5">Estado</span>
          {(['en_progreso','en_revision','backlog','bloqueado','completada'] as StatusKey[]).map(s => (
            <button key={s} type="button" onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={'text-[11px] px-2.5 h-7 rounded-full border transition-all cursor-pointer font-[inherit] ' +
                (filterStatus === s
                  ? 'text-white border-transparent font-semibold shadow-sm'
                  : 'bg-transparent text-[var(--c-text-sub)] border-[var(--c-border)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)]')}
              style={filterStatus === s ? { background: STATUS_DOT[s] } : {}}>
              <span className="flex items-center gap-1.5">
                {filterStatus !== s && <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block" style={{ background: STATUS_DOT[s] }} />}
                {STATUS_LABEL[s]}
              </span>
            </button>
          ))}

          {/* Divider */}
          <span className="w-px h-4 bg-[var(--c-border)] mx-1" aria-hidden="true" />

          {/* Priority label */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-muted)] mr-0.5">Prioridad</span>
          {(['urgente','alta','media','baja']).map(p => (
            <button key={p} type="button" onClick={() => setFilterPriority(filterPriority === p ? '' : p)}
              className={'text-[11px] px-2.5 h-7 rounded-full border transition-all cursor-pointer font-[inherit] ' +
                (filterPriority === p
                  ? 'text-white border-transparent font-semibold shadow-sm'
                  : 'bg-transparent text-[var(--c-text-sub)] border-[var(--c-border)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)]')}
              style={filterPriority === p ? { background: PRIORITY_COLOR[p] } : {}}>
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        )}
        {!loading && view === 'projects' && (
          <ProjectsView
            tasks={filteredBySearch}
            projectCodes={projectCodes}
            onStatusChange={handleStatusChange}
            onOpen={handleOpen}
            filterStatus={filterStatus}
            filterPriority={filterPriority}
          />
        )}
        {!loading && view === 'calendar' && (
          <CalendarView
            tasks={filteredBySearch}
            calMode={calMode}
            setCalMode={setCalMode}
            projectCodes={projectCodes}
            onStatusChange={handleStatusChange}
            onOpen={handleOpen}
            filterStatus={filterStatus}
            filterPriority={filterPriority}
          />
        )}
      </div>
    </div>
  );
}
