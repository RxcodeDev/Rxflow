'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import s from './TaskDrawer.module.css';
import { useUIState, useUIDispatch } from '@/store/UIContext';
import { closeDrawer, bumpTasks } from '@/store/slices/uiSlice';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { MemberItem, ApiWrapped } from '@/types/api.types';

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
  creator_initials: string;
  creator_name: string;
  creator_avatar_url: string | null;
  creator_avatar_color: string | null;
  project_code: string;
  project_name: string;
  epic_id: string | null;
  epic_name: string | null;
  cycle_id: string | null;
  subtasks: { id: string; identifier: string; title: string; status: string }[];
  comments: { id: string; body: string; created_at: string; initials: string; name: string; avatar_url: string | null; avatar_color: string | null }[];
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
function avatarBg(initials: string): string {
  const i = ((initials.charCodeAt(0) ?? 0) + (initials.charCodeAt(1) ?? 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
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

/* ── Mirror HTML for @mention highlighting ──────────── */
function buildMirrorHtml(text: string, knownNames: string[] = []): string {
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  let pattern: RegExp;
  if (knownNames.length > 0) {
    // Sort longest first so "Michelle Ramirez" matches before "Michelle"
    const escaped = [...knownNames]
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    pattern = new RegExp(`@(${escaped.join('|')})`, 'g');
  } else {
    pattern = /@\S+/g;
  }
  return safe.replace(pattern, '<span style="color:#22c55e;font-weight:500">$&</span>') + '\u00a0';
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
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
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
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
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
        <div ref={menuRef} className={s.propMenu} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}>
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
export function PriorityPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
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
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} className={s.propPill}>
        <span style={{ color: meta.color, fontSize: '0.5rem', lineHeight: 1 }} aria-hidden="true">▲</span>
        {meta.label}
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} className={s.propMenu} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}>
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

/* ── AssigneePill ───────────────────────────────────── */
export function AssigneePill({
  assigneeId, assigneeName, assigneeInitials, assigneeAvatarUrl, assigneeAvatarColor, users, onChange,
}: {
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  assigneeAvatarUrl?: string | null;
  assigneeAvatarColor?: string | null;
  users: UserOpt[];
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
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
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} className={s.propPill}>
        {assigneeInitials
          ? <DrawerAvatar initials={assigneeInitials} avatarUrl={assigneeAvatarUrl} avatarColor={assigneeAvatarColor} size={18} />
          : <span className={s.propDot} style={{ background: 'var(--c-border)' }} aria-hidden="true" />
        }
        <span className={s.propPillText}>{assigneeName ?? 'Sin asignar'}</span>
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} className={s.propMenu} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}>
          <button type="button"
            className={`${s.propMenuItem} ${!assigneeId ? s.propMenuItemActive : ''}`}
            onClick={() => { setOpen(false); onChange(null); }}>
            <span className={s.propDot} style={{ background: 'var(--c-muted)' }} aria-hidden="true" />
            Sin asignar
          </button>
          {users.map((u) => (
            <button key={u.id} type="button"
              className={`${s.propMenuItem} ${u.id === assigneeId ? s.propMenuItemActive : ''}`}
              onClick={() => { setOpen(false); onChange(u.id); }}>
              <DrawerAvatar initials={u.initials} avatarUrl={u.avatarUrl} avatarColor={u.avatarColor} size={20} />
              {u.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── EpicPill ───────────────────────────────────────── */
export function EpicPill({
  value, epics, onChange,
}: {
  value: string | null;
  epics: { id: string; name: string }[];
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
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
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} className={s.propPill}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span className={s.propPillText}>{current?.name ?? 'Sin épica'}</span>
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} className={s.propMenu} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}>
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
  const [comment,   setComment]   = useState('');
  const [posting,   setPosting]   = useState(false);
  const [users,     setUsers]     = useState<UserOpt[]>([]);
  const [epics,     setEpics]     = useState<EpicOpt[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc,  setEditDesc]  = useState('');
  const [mentionOpen,  setMentionOpen]  = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIdx,   setMentionIdx]   = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const drawerRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFetchId = useRef<string | null>(null);

  /* Fetch user list once */
  useEffect(() => {
    apiGet<ApiWrapped<MemberItem[]>>('/users')
      .then((r) => setUsers(r.data.map((u) => ({ id: u.id, name: u.name, initials: u.initials, avatarUrl: u.avatar_url, avatarColor: u.avatar_color }))))
      .catch(console.error);
  }, []);

  /* Fetch task when drawer opens or tasksVersion bumps */
  useEffect(() => {
    if (!isDrawerOpen || !activeTaskId) { setTask(null); setEpics([]); lastFetchId.current = null; return; }

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
          setEditTitle(r.data.title);
          setEditDesc(r.data.description ?? '');
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
    const trimmed = editTitle.trim();
    if (!task || !trimmed || trimmed === task.title) return;
    patchTask({ title: trimmed }, { title: trimmed });
  }

  function saveDesc() {
    const newDesc = editDesc.trim() || null;
    if (!task || newDesc === task.description) return;
    patchTask({ description: newDesc }, { description: newDesc });
  }

  const mentionFiltered = mentionOpen
    ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setComment(val);
    const cursor = e.target.selectionStart ?? val.length;
    const slice  = val.slice(0, cursor);
    const at     = slice.lastIndexOf('@');
    if (at !== -1 && !/\s/.test(slice.slice(at + 1))) {
      setMentionStart(at);
      setMentionQuery(slice.slice(at + 1));
      setMentionOpen(true);
      setMentionIdx(0);
    } else {
      setMentionOpen(false);
    }
  }

  function insertMention(user: UserOpt) {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = comment.slice(0, mentionStart);
    const after  = comment.slice(ta.selectionStart ?? comment.length);
    const next   = `${before}@${user.name} ${after}`;
    setComment(next);
    setMentionOpen(false);
    setTimeout(() => {
      const pos = (before + `@${user.name} `).length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || mentionFiltered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIdx((i) => (i + 1) % mentionFiltered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIdx((i) => (i - 1 + mentionFiltered.length) % mentionFiltered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(mentionFiltered[mentionIdx]);
    } else if (e.key === 'Escape') {
      setMentionOpen(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !activeTaskId) return;
    setPosting(true);
    try {
      await apiPost(`/tasks/${activeTaskId}/comments`, { body: comment.trim() });
      setComment('');
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
        className={`${s.drawer} ${isDrawerOpen ? s.drawerOpen : ''}`}
        role="complementary"
        aria-label="Detalle de tarea"
      >
        {/* ── HEADER ─────────────────────────────────── */}
        <div className={s.header}>
          <div className={s.headerLeft}>
            {loading && !task ? <Skel w={80} h={20} /> : (
              <>
                <span className={s.headerId}>{task?.identifier ?? '—'}</span>
                <span className={s.headerSep} aria-hidden="true">·</span>
                <span className={s.headerProject}>{task?.project_name ?? ''}</span>
              </>
            )}
          </div>
          <div className={s.headerActions}>
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

          {/* ─── Title & Description ──────────────────── */}
          <div className={s.titleSection}>
            {loading && !task ? (
              <div className="flex flex-col gap-2">
                <Skel w="85%" h={22} />
                <Skel w="65%" h={14} />
                <Skel w="75%" h={14} />
              </div>
            ) : (
              <>
                <input
                  className={s.editableTitle}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  placeholder="Título de la tarea"
                  aria-label="Título"
                />
                <textarea
                  className={s.editableDesc}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onBlur={saveDesc}
                  placeholder="Agrega una descripción..."
                  rows={3}
                  aria-label="Descripción"
                />
              </>
            )}
          </div>

          {/* ─── Properties ───────────────────────────── */}
          <div className={s.propsSection}>
            {loading && !task ? (
              <div className={s.propGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={s.propCell}>
                    <Skel w={55} h={10} />
                    <Skel w={100} h={28} />
                  </div>
                ))}
              </div>
            ) : task ? (
              <div className={s.propGrid}>

                <div className={s.propCell}>
                  <span className={s.propCellLabel}>Estado</span>
                  <StatusPill
                    value={task.status}
                    onChange={(v) => patchTask({ status: v }, { status: v })}
                  />
                </div>

                <div className={s.propCell}>
                  <span className={s.propCellLabel}>Prioridad</span>
                  <PriorityPill
                    value={task.priority}
                    onChange={(v) => patchTask({ priority: v }, { priority: v })}
                  />
                </div>

                <div className={s.propCell}>
                  <span className={s.propCellLabel}>Asignado</span>
                  <AssigneePill
                    assigneeId={task.assignee_id}
                    assigneeName={task.assignee_name}
                    assigneeInitials={task.assignee_initials}
                    assigneeAvatarUrl={users.find(u => u.id === task.assignee_id)?.avatarUrl ?? task.assignee_avatar_url}
                    assigneeAvatarColor={users.find(u => u.id === task.assignee_id)?.avatarColor ?? task.assignee_avatar_color}
                    users={users}
                    onChange={(uid) => {
                      const u = users.find((x) => x.id === uid);
                      patchTask(
                        { assignee_id: uid, assignee_name: u?.name ?? null, assignee_initials: u?.initials ?? null, assignee_avatar_url: u?.avatarUrl ?? null, assignee_avatar_color: u?.avatarColor ?? null },
                        { assigneeId: uid },
                      );
                    }}
                  />
                </div>

                <div className={s.propCell}>
                  <span className={s.propCellLabel}>Épica</span>
                  <EpicPill
                    value={task.epic_id}
                    epics={epics}
                    onChange={(eid) => {
                      const ep = epics.find((x) => x.id === eid);
                      patchTask({ epic_id: eid, epic_name: ep?.name ?? null }, { epicId: eid });
                    }}
                  />
                </div>

                <div className={s.propCell}>
                  <span className={s.propCellLabel}>Fecha límite</span>
                  <input
                    type="date"
                    className={s.propDateInput}
                    value={task.due_date ? task.due_date.substring(0, 10) : ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      patchTask({ due_date: val }, { dueDate: val });
                    }}
                  />
                </div>

                <div className={s.propCell}>
                  <span className={s.propCellLabel}>Proyecto</span>
                  <div className={s.propProjectValue}>
                    <span className={s.propCode}>{task.project_code}</span>
                    <span className={s.propProjectName}>{task.project_name}</span>
                  </div>
                </div>

                <div className={`${s.propCell} ${s.propCellFull}`}>
                  <span className={s.propCellLabel}>Creado por</span>
                  <div className={s.propCreatorValue}>
                    <DrawerAvatar initials={task.creator_initials} avatarUrl={task.creator_avatar_url} avatarColor={task.creator_avatar_color} size={20} />
                    <span>{task.creator_name}</span>
                    <span className={s.propTime}>· {timeAgo(task.created_at)}</span>
                  </div>
                </div>

              </div>
            ) : null}
          </div>

          {/* ─── Tabs: Comments / Activity ─────────────── */}
          <div className={s.commentsSection}>
            <div className={s.tabs}>
              <button type="button" className={`${s.tab} ${tab === 'comments' ? s.tabActive : ''}`}
                onClick={() => setTab('comments')}>
                Comentarios
                {task && task.comments.length > 0 && (
                  <span className={s.tabBadge}>{task.comments.length}</span>
                )}
              </button>
              <button type="button" className={`${s.tab} ${tab === 'activity' ? s.tabActive : ''}`}
                onClick={() => setTab('activity')}>
                Actividad
              </button>
            </div>

            {tab === 'comments' && (
              <div className={s.commentList}>
                {loading && !task ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={s.commentRow}>
                      <Skel w={28} h={28} />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <Skel w={100} h={11} />
                        <Skel w="90%" h={11} />
                      </div>
                    </div>
                  ))
                ) : task?.comments.length === 0 ? (
                  <p className={s.emptyText}>Sin comentarios aún</p>
                ) : (
                  task?.comments.map((c) => (
                    <div key={c.id} className={s.commentRow}>
                      <DrawerAvatar initials={c.initials} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} size={28} />
                      <div className={s.commentContent}>
                        <div className={s.commentMeta}>
                          <span className={s.commentAuthor}>{c.name}</span>
                          <span className={s.commentTime}>{timeAgo(c.created_at)}</span>
                        </div>
                        <p className={s.commentText}
                          // eslint-disable-next-line react/no-danger
                          dangerouslySetInnerHTML={{ __html: buildMirrorHtml(c.body, users.map(u => u.name)) }}
                        />
                      </div>
                    </div>
                  ))
                )}

              </div>
            )}

            {tab === 'comments' && (
              <form onSubmit={submitComment} className={s.commentForm}>
                <div className={s.commentInputWrap}>
                  {mentionOpen && mentionFiltered.length > 0 && (
                    <div className={s.mentionList} role="listbox">
                      {mentionFiltered.map((u, i) => (
                        <button
                          key={u.id}
                          type="button"
                          role="option"
                          aria-selected={i === mentionIdx}
                          className={`${s.mentionItem} ${i === mentionIdx ? s.mentionItemActive : ''}`}
                          onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                        >
                          <DrawerAvatar initials={u.initials} avatarUrl={u.avatarUrl} avatarColor={u.avatarColor} size={22} />
                          {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className={s.commentTextarea}
                    placeholder=""
                    value={comment}
                    onChange={handleCommentChange}
                    onKeyDown={handleCommentKeyDown}
                    aria-label="Nuevo comentario"
                  />
                  <div
                    className={s.commentMirror}
                    aria-hidden="true"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: buildMirrorHtml(comment, users.map(u => u.name)) }}
                  />
                </div>
                <button type="submit" className={s.commentBtn} disabled={posting || !comment.trim()}>
                  {posting ? '...' : 'Comentar'}
                </button>
              </form>
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
                  <p className={s.emptyText}>Sin actividad registrada</p>
                ) : (
                  task?.activity.map((ev) => (
                    <div key={ev.id} className={s.activityRow}>
                      <DrawerAvatar initials={ev.initials} avatarUrl={ev.avatar_url} avatarColor={ev.avatar_color} size={28} />
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
      </div>
    </>
  );
}
