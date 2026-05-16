'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import s from './TaskDrawer.module.css';
import { useUIState, useUIDispatch } from '@/store/UIContext';
import { closeDrawer, bumpTasks } from '@/store/slices/uiSlice';
import { apiDelete, apiGet, apiPost, apiPatch } from '@/lib/api';
import type { MemberItem, ApiWrapped } from '@/types/api.types';
import CommentEditor, { type CommentDoc } from './CommentEditor';
import { TiptapViewer } from '../wiki/WikiViewer';
import DescriptionEditor from './DescriptionEditor';
import ConfirmModal from '@/components/ui/ConfirmModal';

/* ── Types ───────────────────────────────────────────── */
interface TaskDetail {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  blocked_reason: string | null;
  created_at: string;
  assignee_id: string | null;
  assignee_initials: string | null;
  assignee_name: string | null;
  assignee_avatar_url: string | null;
  assignee_avatar_color: string | null;
  assignees: { id: string; name: string; initials: string; avatar_color: string | null; avatar_url?: string | null }[];
  creator_initials: string;
  creator_name: string;
  creator_avatar_url: string | null;
  creator_avatar_color: string | null;
  project_code: string;
  project_name: string;
  epic_id: string | null;
  epic_name: string | null;
  cycle_id: string | null;
  comments: { id: string; body: string; created_at: string; author_id: string; initials: string; name: string; avatar_url: string | null; avatar_color: string | null }[];
  activity: { id: string; action: string; created_at: string; initials: string; name: string; avatar_url: string | null; avatar_color: string | null }[];
}

type EpicOpt = { id: string; name: string };
type UserOpt = { id: string; name: string; initials: string; avatarUrl: string | null; avatarColor: string | null };

/* ── Status & priority meta ──────────────────────────── */
export const STATUS_META: Record<string, { label: string; color: string }> = {
  backlog:     { label: 'Backlog',      color: '#94a3b8' },
  en_progreso: { label: 'En progreso',  color: '#3b82f6' },
  en_revision: { label: 'En revisión',  color: '#f59e0b' },
  bloqueado:   { label: 'Bloqueado',    color: '#ef4444' },
  completada:  { label: 'Completada',   color: '#22c55e' },
};

export const PRIO_META: Record<string, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: '#ef4444' },
  alta:    { label: 'Alta',    color: '#f97316' },
  media:   { label: 'Media',   color: '#f59e0b' },
  baja:    { label: 'Baja',    color: '#22c55e' },
};

/* ── Helpers ─────────────────────────────────────────── */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `hace ${days}d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#0ea5e9','#14b8a6','#10b981','#f59e0b'];
const CALENDAR_MONTH = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
const CALENDAR_DAY = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' });
const CALENDAR_WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function avatarBg(initials: string): string {
  const i = ((initials.charCodeAt(0) ?? 0) + (initials.charCodeAt(1) ?? 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.substring(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function buildCalendarDays(viewDate: Date) {
  const firstDay = startOfMonth(viewDate);
  const monthIndex = firstDay.getMonth();
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekday);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date,
      inMonth: date.getMonth() === monthIndex,
    };
  });
}

/* ── Avatar ─────────────────────────────────────────── */
export function DrawerAvatar({
  initials, size = 24, avatarUrl, avatarColor,
}: {
  initials: string;
  size?: number;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}) {
  const bg = avatarColor ?? avatarBg(initials);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: avatarUrl ? undefined : bg,
        color: '#fff',
        fontSize: size <= 24 ? 9 : 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, userSelect: 'none', overflow: 'hidden',
      }}
    >
      {avatarUrl
        ? <img src={avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  );
}

/* ── CommentBody — renders Tiptap JSON or plain text ─── */
function CommentBody({ body, users, onLightbox }: { body: string; users: { name: string }[]; onLightbox: (src: string) => void }) {
  // Try to parse as Tiptap JSON doc
  let doc: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (parsed.type === 'doc') doc = parsed;
  } catch {
    // plain text fallback
  }

  if (doc) {
    return (
      <div className={s.commentTiptap}>
        <TiptapViewer content={doc} onLightbox={onLightbox} />
      </div>
    );
  }

  // Plain text legacy: highlight @mentions
  const safe = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  let highlighted = safe;
  if (users.length > 0) {
    const escaped = [...users]
      .sort((a, b) => b.name.length - a.name.length)
      .map((u) => u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`@(${escaped.join('|')})`, 'g');
    highlighted = safe.replace(pattern, '<span style="color:#22c55e;font-weight:500">$&</span>');
  } else {
    highlighted = safe.replace(/@\S+/g, '<span style="color:#22c55e;font-weight:500">$&</span>');
  }

  return (
    <p
      className={s.commentText}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

/* ── Helper: extract plain text from Tiptap JSON body ─ */
function extractCommentText(body: string): string {
  try {
    const doc = JSON.parse(body) as { type: string; content?: unknown[] };
    if (doc.type === 'doc') {
      function collect(node: unknown): string {
        if (!node || typeof node !== 'object') return '';
        const n = node as { type?: string; text?: string; content?: unknown[] };
        if (n.type === 'text') return n.text ?? '';
        if (n.content) return n.content.map(collect).join(n.type === 'paragraph' ? '\n' : '');
        return '';
      }
      return collect(doc).trim();
    }
  } catch { /* plain text */ }
  return body;
}

/* ── Skeleton ───────────────────────────────────────── */
function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return (
    <div
      className="bg-[var(--c-hover)] rounded animate-pulse"
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: h, flexShrink: 0 }}
    />
  );
}

/* ── StatusPill ─────────────────────────────────────── */
export function StatusPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0, minWidth: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[value] ?? STATUS_META.backlog;

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
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right, minWidth: Math.max(r.width, 160) });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} className={s.propPill}>
        <span className={s.propDot} style={{ background: meta.color }} aria-hidden="true" />
        {meta.label}
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} className={s.propMenu} style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: pos.minWidth, zIndex: 9999 }}>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <button key={k} type="button"
              className={`${s.propMenuItem} ${k === value ? s.propMenuItemActive : ''}`}
              onClick={() => { setOpen(false); onChange(k); }}>
              <span className={s.propDot} style={{ background: v.color }} aria-hidden="true" />
              {v.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── PriorityPill ───────────────────────────────────── */
export function PriorityPill({ value, onChange, disabled = false }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0, minWidth: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = PRIO_META[value] ?? PRIO_META.media;

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
    if (disabled) return;
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right, minWidth: Math.max(r.width, 160) });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} className={`${s.propPill} ${disabled ? s.propPillStatic : ''}`} disabled={disabled}>
        <span style={{ color: meta.color, fontSize: '0.5rem', lineHeight: 1 }} aria-hidden="true">▲</span>
        {meta.label}
        {!disabled && (
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 3.5l3 3 3-3" />
          </svg>
        )}
      </button>
      {open && !disabled && (
        <div ref={menuRef} className={s.propMenu} style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: pos.minWidth, zIndex: 9999 }}>
          {Object.entries(PRIO_META).map(([k, v]) => (
            <button key={k} type="button"
              className={`${s.propMenuItem} ${k === value ? s.propMenuItemActive : ''}`}
              onClick={() => { setOpen(false); onChange(k); }}>
              <span style={{ color: v.color, fontSize: '0.5rem' }} aria-hidden="true">▲</span>
              {v.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── AssigneesPill (multi) ──────────────────────────── */
export function AssigneesPill({
  assignees, users, onChange, disabled = false, btnClassName,
}: {
  assignees: { id: string; name: string; initials: string; avatar_color?: string | null; avatar_url?: string | null }[];
  users: UserOpt[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  btnClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0, minWidth: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ids = assignees.map(a => a.id);

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
    if (disabled) return;
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right, minWidth: Math.max(r.width, 200) });
    }
    setOpen((v) => !v);
  }

  function toggle(uid: string) {
    const next = ids.includes(uid) ? ids.filter(x => x !== uid) : [...ids, uid];
    onChange(next);
  }

  const label = assignees.length === 0
    ? 'Sin asignar'
    : assignees.length === 1
      ? assignees[0].name
      : `${assignees.length} asignados`;

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} className={btnClassName ?? `${s.propPill} ${disabled ? s.propPillStatic : ''}`} disabled={disabled}>
        {assignees.length === 0 ? (
          <span className={s.propDot} style={{ background: 'var(--c-border)' }} aria-hidden="true" />
        ) : assignees.length === 1 ? (
          <DrawerAvatar initials={assignees[0].initials} avatarUrl={assignees[0].avatar_url} avatarColor={assignees[0].avatar_color} size={18} />
        ) : (
          <div style={{ display: 'flex', marginRight: 2 }}>
            {assignees.slice(0, 3).map((a, i) => (
              <div key={a.id} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i }}>
                <DrawerAvatar initials={a.initials} avatarUrl={a.avatar_url} avatarColor={a.avatar_color} size={18} />
              </div>
            ))}
          </div>
        )}
        <span className={s.propPillText}>{label}</span>
        {!disabled && (
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 3.5l3 3 3-3" />
          </svg>
        )}
      </button>
      {open && !disabled && (
        <div ref={menuRef} className={s.propMenu}
          style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: pos.minWidth, zIndex: 9999 }}>
          <button type="button"
            className={`${s.propMenuItem} ${ids.length === 0 ? s.propMenuItemActive : ''}`}
            onClick={() => { onChange([]); }}>
            <span className={s.propDot} style={{ background: 'var(--c-muted)' }} aria-hidden="true" />
            Sin asignar
          </button>
          {users.map((u) => {
            const sel = ids.includes(u.id);
            return (
              <button key={u.id} type="button"
                className={`${s.propMenuItem} ${sel ? s.propMenuItemActive : ''}`}
                onClick={() => toggle(u.id)}>
                <DrawerAvatar initials={u.initials} avatarUrl={u.avatarUrl} avatarColor={u.avatarColor} size={20} />
                <span style={{ flex: 1 }}>{u.name}</span>
                {sel && (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── EpicPill ───────────────────────────────────────── */
export function EpicPill({
  value, epics, onChange, disabled = false,
}: {
  value: string | null;
  epics: { id: string; name: string }[];
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0, minWidth: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = epics.find((e) => e.id === value);

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
    if (disabled) return;
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right, minWidth: Math.max(r.width, 180) });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} className={`${s.propPill} ${disabled ? s.propPillStatic : ''}`} disabled={disabled}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span className={s.propPillText}>{current?.name ?? 'Sin épica'}</span>
        {!disabled && (
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 3.5l3 3 3-3" />
          </svg>
        )}
      </button>
      {open && !disabled && (
        <div ref={menuRef} className={s.propMenu} style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: pos.minWidth, zIndex: 9999 }}>
          <button type="button"
            className={`${s.propMenuItem} ${!value ? s.propMenuItemActive : ''}`}
            onClick={() => { setOpen(false); onChange(null); }}>
            Sin épica
          </button>
          {epics.map((ep) => (
            <button key={ep.id} type="button"
              className={`${s.propMenuItem} ${ep.id === value ? s.propMenuItemActive : ''}`}
              onClick={() => { setOpen(false); onChange(ep.id); }}>
              {ep.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Main export ─────────────────────────────────────── */
export default function TaskDrawer() {
  const router = useRouter();
  const { isDrawerOpen, activeTaskId, tasksVersion } = useUIState();
  const dispatch = useUIDispatch();
  const [task,      setTask]      = useState<TaskDetail | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [tab,       setTab]       = useState<'comments' | 'activity'>('comments');
  const [posting,   setPosting]   = useState(false);
  const [users,     setUsers]     = useState<UserOpt[]>([]);
  const [epics,     setEpics]     = useState<EpicOpt[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc,  setEditDesc]  = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [dateView, setDateView] = useState<Date>(() => startOfMonth(new Date()));
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const drawerRef   = useRef<HTMLDivElement>(null);
  const menuBtnRef  = useRef<HTMLButtonElement>(null);
  const menuRef     = useRef<HTMLDivElement>(null);
  const dateWrapRef = useRef<HTMLDivElement>(null);
  const lastFetchId = useRef<string | null>(null);

  /* Fetch user list once */
  useEffect(() => {
    apiGet<ApiWrapped<MemberItem[]>>('/users')
      .then((r) => setUsers(r.data.map((u) => ({ id: u.id, name: u.name, initials: u.initials, avatarUrl: u.avatar_url, avatarColor: u.avatar_color }))))
      .catch(console.error);
  }, []);

  /* Fetch task when drawer opens or tasksVersion bumps */
  useEffect(() => {
    if (!isDrawerOpen || !activeTaskId) {
      setTask(null);
      setEpics([]);
      setIsEditing(false);
      setMenuOpen(false);
      setDeleteOpen(false);
      setDateMenuOpen(false);
      lastFetchId.current = null;
      return;
    }

    const isNewTask = lastFetchId.current !== activeTaskId;
    if (isNewTask) {
      setLoading(true);
      setTab('comments');
      lastFetchId.current = activeTaskId;
    }

    apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${activeTaskId}`)
      .then((r) => {
        setTask(r.data);
        if (isNewTask) {
          setIsEditing(false);
          setMenuOpen(false);
          setDeleteOpen(false);
          setDateMenuOpen(false);
          setCommentMenuId(null);
          setEditingCommentId(null);
          setEditTitle(r.data.title);
          setEditDesc(r.data.description ?? null);
          setDateView(startOfMonth(parseDateValue(r.data.due_date) ?? new Date()));
          apiGet<{ ok: boolean; data: EpicOpt[] }>(`/projects/${r.data.project_code}/epics`)
            .then((er) => setEpics(er.data))
            .catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen, activeTaskId, tasksVersion]);

  const handleClose = () => dispatch(closeDrawer());

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !menuBtnRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!dateMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!dateWrapRef.current?.contains(target)) {
        setDateMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dateMenuOpen]);

  /* Esc key */
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen]);

  /* Generic PATCH with optimistic update */
  function patchTask(localMerge: Partial<TaskDetail>, dto: Record<string, unknown>) {
    if (!activeTaskId) return;
    setTask((t) => t ? { ...t, ...localMerge } : t);
    apiPatch(`/tasks/${activeTaskId}`, dto)
      .then(() => dispatch(bumpTasks()))
      .catch((err) => {
        console.error(err);
        apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${activeTaskId}`)
          .then((r) => setTask(r.data)).catch(console.error);
      });
  }

  function saveTitle() {
    if (!isEditing) return;
    const trimmed = editTitle.trim();
    if (!task || !trimmed || trimmed === task.title) return;
    patchTask({ title: trimmed }, { title: trimmed });
  }

  function saveDesc(content: string | null) {
    if (!isEditing) return;
    if (!task) return;
    patchTask({ description: content }, { description: content });
  }

  async function handleDeleteTask() {
    if (!task) return;
    setDeleting(true);
    try {
      await apiDelete(`/tasks/${task.id}`);
      setDeleteOpen(false);
      setMenuOpen(false);
      setIsEditing(false);
      dispatch(bumpTasks());
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  function applyDueDate(value: string | null) {
    patchTask({ due_date: value }, { dueDate: value });
  }

  /* ── Comment edit / delete ──────────────────────── */
  async function deleteComment(commentId: string) {
    if (!activeTaskId) return;
    setDeletingCommentId(commentId);
    try {
      await apiDelete(`/tasks/${activeTaskId}/comments/${commentId}`);
      const r = await apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${activeTaskId}`);
      setTask(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function saveEditComment(commentId: string, doc: CommentDoc) {
    if (!activeTaskId) return;
    try {
      await apiPatch(`/tasks/${activeTaskId}/comments/${commentId}`, { body: JSON.stringify(doc) });
      const r = await apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${activeTaskId}`);
      setTask(r.data);
      setEditingCommentId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function submitComment(doc: CommentDoc) {
    if (!activeTaskId) return;
    setPosting(true);
    try {
      await apiPost(`/tasks/${activeTaskId}/comments`, { body: JSON.stringify(doc) });
      const r = await apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${activeTaskId}`);
      setTask(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      {isDrawerOpen && (
        <div className={s.overlay} onClick={handleClose} aria-hidden="true" />
      )}

      <div
        ref={drawerRef}
        className={`${s.drawer} ${isDrawerOpen ? s.drawerOpen : ''} ${isEditing ? s.drawerEditing : ''}`}
        role="complementary"
        aria-label="Detalle de tarea"
      >
        {/* ── HEADER ─────────────────────────────────── */}
        <div className={s.header}>
          <div className={s.headerLeft}>
            {loading && !task ? (
              <div className="flex items-center gap-2">
                <Skel w={48} h={20} />
                <Skel w={160} h={16} />
              </div>
            ) : task ? (
              <div className={s.headerTitleWrap}>
                <div className={s.headerTitleRow}>
                  <svg className={s.headerTaskIcon} style={{ color: STATUS_META[task.status]?.color ?? 'var(--c-muted)' }} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
                  <input
                    className={`${s.headerTitle} ${!isEditing ? s.headerTitleLocked : ''}`}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="Título de la tarea"
                    aria-label="Título"
                    readOnly={!isEditing}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className={s.headerActions}>
            {isEditing && task && (
              <button
                type="button"
                className={s.iconBtnSave}
                aria-label="Guardar cambios"
                title="Guardar y salir del modo edición"
                onClick={() => setIsEditing(false)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              </button>
            )}
            <div className={s.headerMenuWrap}>
              <button
                ref={menuBtnRef}
                className={`${s.iconBtn} ${menuOpen ? s.iconBtnActive : ''}`}
                aria-label="Acciones de tarea"
                type="button"
                title="Acciones"
                onClick={() => setMenuOpen((open) => !open)}
                disabled={!task}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {menuOpen && task && (
                <div ref={menuRef} className={s.headerMenu} role="menu" aria-label="Acciones de tarea">
                  {!isEditing && (
                    <button
                      type="button"
                      className={s.headerMenuItem}
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      Editar tarea
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${s.headerMenuItem} ${s.headerMenuItemDanger}`}
                    onClick={() => {
                      setDeleteOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                    Eliminar tarea
                  </button>
                </div>
              )}
            </div>
            <button
              className={s.iconBtn}
              aria-label="Ver página completa"
              type="button"
              title="Abrir en página completa"
              onClick={() => {
                if (!task) return;
                dispatch(closeDrawer());
                router.push(`/proyectos/${task.project_code.toLowerCase()}/tareas/${task.id}`);
              }}
              disabled={!task}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button className={s.iconBtn} onClick={handleClose} aria-label="Cerrar panel" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────── */}
        <div className={s.body}>

          <div className={s.bodyTop}>
            {/* ─── 1. Propiedades / selects ─────────────── */}
            <div className={s.propsSection}>
            {loading && !task ? (
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skel w={72} h={11} />
                    <Skel w={120} h={28} />
                  </div>
                ))}
              </div>
            ) : task ? (
              <div className={s.propList}>

                {/* Row 1 */}
                <div className={s.propRow}>
                  <span className={s.propRowLabel}>Estado</span>
                  <StatusPill value={task.status} onChange={(v) => patchTask({ status: v }, { status: v })} />
                </div>
                <div className={s.propRow}>
                  <span className={s.propRowLabel}>Prioridad</span>
                  <PriorityPill value={task.priority} onChange={(v) => patchTask({ priority: v }, { priority: v })} disabled={!isEditing} />
                </div>

                {/* Row 2 */}
                <div className={s.propRow}>
                  <span className={s.propRowLabel}>Asignados</span>
                  <AssigneesPill
                    assignees={task.assignees ?? []}
                    users={users}
                    disabled={!isEditing}
                    onChange={(uids) => {
                      const newAssignees = uids.map(uid => {
                        const u = users.find(x => x.id === uid);
                        return { id: uid, name: u?.name ?? '', initials: u?.initials ?? '', avatar_color: u?.avatarColor ?? null, avatar_url: u?.avatarUrl ?? null };
                      });
                      patchTask(
                        { assignees: newAssignees, assignee_id: uids[0] ?? null, assignee_name: newAssignees[0]?.name ?? null, assignee_initials: newAssignees[0]?.initials ?? null, assignee_avatar_url: newAssignees[0]?.avatar_url ?? null, assignee_avatar_color: newAssignees[0]?.avatar_color ?? null },
                        { assigneeIds: uids },
                      );
                    }}
                  />
                </div>
                <div className={`${s.propRow} ${s.propRowDate}`}>
                  <span className={s.propRowLabel}>Fecha límite</span>
                  <div ref={dateWrapRef} className={s.dateFieldWrap}>
                    <button
                      type="button"
                      className={`${s.propPill} ${!isEditing ? s.propPillStatic : ''}`}
                      style={{ cursor: isEditing ? 'pointer' : 'default', width: '100%' }}
                      onClick={() => {
                        if (!isEditing) return;
                        setDateView(startOfMonth(parseDateValue(task.due_date) ?? new Date()));
                        setDateMenuOpen((open) => !open);
                      }}
                      disabled={!isEditing}
                      aria-expanded={dateMenuOpen}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span className={s.propPillText}>
                        {task.due_date
                          ? CALENDAR_DAY.format(parseDateValue(task.due_date) ?? new Date(task.due_date))
                          : 'Sin fecha'}
                      </span>
                    </button>
                    {isEditing && dateMenuOpen && (
                      <div className={s.datePopover}>
                        <div className={s.datePopoverHeader}>
                          <button type="button" className={s.dateNavBtn} onClick={() => setDateView((current) => addMonths(current, -1))} aria-label="Mes anterior">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                          </button>
                          <span className={s.datePopoverTitle}>{CALENDAR_MONTH.format(dateView).replace(/^\w/, c => c.toUpperCase())}</span>
                          <button type="button" className={s.dateNavBtn} onClick={() => setDateView((current) => addMonths(current, 1))} aria-label="Mes siguiente">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                          </button>
                        </div>
                        <div className={s.dateWeekdays}>
                          {CALENDAR_WEEKDAYS.map((label, index) => (
                            <span key={`${label}-${index}`} className={s.dateWeekday}>{label}</span>
                          ))}
                        </div>
                        <div className={s.dateGrid}>
                          {buildCalendarDays(dateView).map(({ key, date, inMonth }) => {
                            const currentValue = task.due_date ? task.due_date.substring(0, 10) : null;
                            const nextValue = toDateInputValue(date);
                            const isSelected = currentValue === nextValue;
                            const isToday = toDateInputValue(date) === toDateInputValue(new Date());
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`${s.dateCell} ${!inMonth ? s.dateCellMuted : ''} ${isSelected ? s.dateCellSelected : ''} ${isToday ? s.dateCellToday : ''}`}
                                onClick={() => {
                                  applyDueDate(nextValue);
                                  setDateMenuOpen(false);
                                }}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>
                        <div className={s.datePopoverFooter}>
                          <button type="button" className={s.dateFooterBtn} onClick={() => setDateView(startOfMonth(new Date()))}>Hoy</button>
                          <button type="button" className={s.dateFooterBtn} onClick={() => { applyDueDate(null); setDateMenuOpen(false); }}>Borrar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3 */}
                <div className={s.propRow}>
                  <span className={s.propRowLabel}>Épica</span>
                  <EpicPill
                    value={task.epic_id}
                    epics={epics}
                    disabled={!isEditing}
                    onChange={(eid) => {
                      const ep = epics.find((x) => x.id === eid);
                      patchTask({ epic_id: eid, epic_name: ep?.name ?? null }, { epicId: eid });
                    }}
                  />
                </div>
                <div className={s.propRow}>
                  <span className={s.propRowLabel}>Identificador</span>
                  <span className={s.propIdentifierBadge}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                    {task.identifier}
                  </span>
                </div>

                {/* Proyecto — full width */}
                <div className={`${s.propRow} ${s.propRowFull}`}>
                  <span className={s.propRowLabel}>Proyecto</span>
                  <div className={s.propProjectValue}>
                    <span className={s.propCodeColor}>{task.project_code}</span>
                    <span className={s.propProjectName}>{task.project_name}</span>
                  </div>
                </div>

                {/* Creator — full width */}
                <div className={`${s.propRow} ${s.propRowFull}`}>
                  <span className={s.propRowLabel}>Creado por</span>
                  <div className={s.propCreatorValue}>
                    <DrawerAvatar initials={task.creator_initials} avatarUrl={task.creator_avatar_url} avatarColor={task.creator_avatar_color} size={18} />
                    <span>{task.creator_name}</span>
                    <span className={s.propTime}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {timeAgo(task.created_at)}
                    </span>
                  </div>
                </div>

              </div>
            ) : null}
            </div>
          </div>

          <div className={s.bodyContent}>
            <div className={s.bodyScroll}>
              {/* ─── 3. Descripción ───────────────────────── */}
              <div className={s.descSection}>
                <div className={s.sectionHeader}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                  Descripción
                </div>
                {loading && !task ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <Skel w="90%" h={13} />
                    <Skel w="70%" h={13} />
                  </div>
                ) : !isEditing && !editDesc ? (
                  <div className={s.descEmpty}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <span>Sin descripción</span>
                  </div>
                ) : (
                  <DescriptionEditor
                    initialContent={editDesc}
                    onSave={saveDesc}
                    disabled={!isEditing}
                    onLightbox={setLightboxSrc}
                  />
                )}
              </div>

              {/* ─── 4. Comentarios / Actividad ───────────── */}
              <div className={s.commentsSection}>
                <div className={s.tabs}>
                  <button type="button" className={`${s.tab} ${tab === 'comments' ? s.tabActive : ''}`}
                    onClick={() => setTab('comments')}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    Comentarios
                    {task && task.comments.length > 0 && (
                      <span className={s.tabBadge}>{task.comments.length}</span>
                    )}
                  </button>
                  <button type="button" className={`${s.tab} ${tab === 'activity' ? s.tabActive : ''}`}
                    onClick={() => setTab('activity')}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Actividad
                  </button>
                </div>

                {tab === 'comments' && (
                  <div className={s.commentList}>
                    {loading && !task ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className={s.commentRow}>
                          <Skel w={32} h={32} />
                          <div className="flex flex-col gap-1.5 flex-1">
                            <Skel w={100} h={11} />
                            <Skel w="90%" h={11} />
                          </div>
                        </div>
                      ))
                    ) : task?.comments.length === 0 ? (
                      <div className={s.emptyState}>
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        <p>Sin comentarios aún</p>
                        <span>Sé el primero en comentar</span>
                      </div>
                    ) : (
                      task?.comments.map((c) => (
                        <div key={c.id} className={s.commentRow}>
                          <DrawerAvatar initials={c.initials} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} size={32} />
                          <div className={s.commentBubble}>
                            <div className={s.commentMeta}>
                              <span className={s.commentAuthor}>{c.name}</span>
                              <span className={s.commentTime}>{timeAgo(c.created_at)}</span>
                              <div className={s.commentActions}>
                                <button
                                  type="button"
                                  className={s.commentMenuBtn}
                                  aria-label="Opciones de comentario"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCommentMenuId((prev) => (prev === c.id ? null : c.id));
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none" aria-hidden="true">
                                    <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                                  </svg>
                                </button>
                                {commentMenuId === c.id && (
                                  <div className={s.commentMenuDrop}>
                                    <button
                                      type="button"
                                      className={s.commentMenuItem}
                                      onClick={() => {
                                        setEditingCommentId(c.id);
                                        setCommentMenuId(null);
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      className={`${s.commentMenuItem} ${s.commentMenuItemDanger}`}
                                      disabled={deletingCommentId === c.id}
                                      onClick={() => { setCommentMenuId(null); void deleteComment(c.id); }}
                                    >
                                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                      {deletingCommentId === c.id ? 'Eliminando…' : 'Eliminar'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {editingCommentId === c.id ? (
                              <CommentEditor
                                users={users}
                                initialContent={(() => {
                                  try { return JSON.parse(c.body) as CommentDoc; } catch { return null; }
                                })()}
                                submitLabel="Guardar"
                                onSubmit={async (doc) => { await saveEditComment(c.id, doc); }}
                                onCancel={() => setEditingCommentId(null)}
                              />
                            ) : (
                              <CommentBody body={c.body} users={users} onLightbox={setLightboxSrc} />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {tab === 'activity' && (
                  <div className={s.activityList}>
                    {loading && !task ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={s.activityRow}>
                          <Skel w={28} h={28} />
                          <Skel w="70%" h={12} />
                        </div>
                      ))
                    ) : task?.activity.length === 0 ? (
                      <div className={s.emptyState}>
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        <p>Sin actividad registrada</p>
                      </div>
                    ) : (
                      task?.activity.map((ev) => (
                        <div key={ev.id} className={s.activityRow}>
                          <div className={s.activityDot} aria-hidden="true" />
                          <DrawerAvatar initials={ev.initials} avatarUrl={ev.avatar_url} avatarColor={ev.avatar_color} size={24} />
                          <div className={s.activityContent}>
                            <span className={s.activityText}>{ev.action}</span>
                            <span className={s.activityTime}>{timeAgo(ev.created_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {tab === 'comments' && (
              <div className={s.commentForm}>
                <CommentEditor users={users} onSubmit={submitComment} disabled={posting} />
              </div>
            )}
          </div>

        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Eliminar tarea"
        message={deleting ? 'Eliminando tarea…' : 'Se eliminará la tarea permanentemente. Esta acción no se puede deshacer.'}
        confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
        onConfirm={handleDeleteTask}
        onCancel={() => { if (!deleting) setDeleteOpen(false); }}
      />

      {/* ── Lightbox ──────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          className={s.lightboxOverlay}
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
        >
          <button
            type="button"
            className={s.lightboxClose}
            onClick={() => setLightboxSrc(null)}
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Imagen ampliada"
            className={s.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
