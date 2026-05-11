'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useUIDispatch } from '@/store/UIContext';
import { bumpTasks } from '@/store/slices/uiSlice';
import s from '@/components/features/tasks/TaskDrawer.module.css';
import {
  StatusPill, PriorityPill, AssigneesPill, EpicPill,
  DrawerAvatar, STATUS_META, PRIO_META, timeAgo,
} from '@/components/features/tasks/TaskDrawer';
import DescriptionEditor from '@/components/features/tasks/DescriptionEditor';
import CommentEditor, { type CommentDoc } from '@/components/features/tasks/CommentEditor';
import { TiptapViewer } from '@/components/features/wiki/WikiViewer';
import ConfirmModal from '@/components/ui/ConfirmModal';
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
  created_at: string;
  assignee_id: string | null;
  assignee_initials: string | null;
  assignee_name: string | null;
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
  comments: { id: string; body: string; created_at: string; initials: string; name: string; avatar_url: string | null; avatar_color: string | null }[];
  activity: { id: string; action: string; created_at: string; initials: string; name: string; avatar_url: string | null; avatar_color: string | null }[];
}

type EpicOpt = { id: string; name: string };
type UserOpt = { id: string; name: string; initials: string; avatarUrl: string | null; avatarColor: string | null };
type TabType = 'comments' | 'activity';

/* ── Calendar helpers ────────────────────────────────── */
const CALENDAR_MONTH = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
const CALENDAR_DAY   = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' });
const CALENDAR_WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}
function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function parseDateValue(value: string | null): Date | null {
  if (!value) return null;
  const [y, mo, d] = value.substring(0, 10).split('-').map(Number);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}
function buildCalendarDays(viewDate: Date) {
  const firstDay = startOfMonth(viewDate);
  const monthIndex = firstDay.getMonth();
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekday);
  return Array.from({ length: 42 }).map((_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return { key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`, date, inMonth: date.getMonth() === monthIndex };
  });
}

/* ── Helpers ─────────────────────────────────────────── */
function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return (
    <div
      className="bg-[var(--c-hover)] rounded animate-pulse"
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: h, flexShrink: 0 }}
    />
  );
}

function CommentBody({ body, users, onLightbox }: {
  body: string;
  users: UserOpt[];
  onLightbox: (src: string) => void;
}) {
  let doc: Record<string, unknown> | null = null;
  try {
    const p = JSON.parse(body) as Record<string, unknown>;
    if (p.type === 'doc') doc = p;
  } catch { /* plain text */ }

  if (doc) return <TiptapViewer content={doc} onLightbox={onLightbox} />;

  const safe = body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  let highlighted = safe;
  if (users.length > 0) {
    const escaped = [...users].sort((a, b) => b.name.length - a.name.length)
      .map(u => u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    highlighted = safe.replace(new RegExp(`@(${escaped.join('|')})`, 'g'), '<span style="color:#22c55e;font-weight:500">$&</span>');
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

/* ── Page ─────────────────────────────────────────────── */
export default function TaskPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id: projectCode, taskId } = use(params);
  const router   = useRouter();
  const dispatch = useUIDispatch();

  const [task,        setTask]       = useState<TaskDetail | null>(null);
  const [loading,     setLoading]    = useState(true);
  const [users,       setUsers]      = useState<UserOpt[]>([]);
  const [epics,       setEpics]      = useState<EpicOpt[]>([]);
  const [editTitle,   setEditTitle]  = useState('');
  const [tab,         setTab]        = useState<TabType>('comments');
  const [posting,     setPosting]    = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isEditing,    setIsEditing]    = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [dateView,     setDateView]     = useState<Date>(() => startOfMonth(new Date()));
  const menuBtnRef  = useRef<HTMLButtonElement>(null);
  const menuRef     = useRef<HTMLDivElement>(null);
  const dateWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${taskId}`),
      apiGet<ApiWrapped<MemberItem[]>>('/users'),
    ])
      .then(([taskRes, usersRes]) => {
        const t = taskRes.data;
        setTask(t);
        setEditTitle(t.title);
        setUsers(usersRes.data.map(u => ({
          id: u.id, name: u.name, initials: u.initials,
          avatarUrl: u.avatar_url, avatarColor: u.avatar_color,
        })));
        return apiGet<{ ok: boolean; data: EpicOpt[] }>(`/projects/${t.project_code}/epics`);
      })
      .then(er => setEpics(er.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [taskId]);

  function patchTask(localMerge: Partial<TaskDetail>, dto: Record<string, unknown>) {
    setTask(t => t ? { ...t, ...localMerge } : t);
    apiPatch(`/tasks/${taskId}`, dto)
      .then(() => dispatch(bumpTasks()))
      .catch(err => {
        console.error(err);
        apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${taskId}`)
          .then(r => setTask(r.data)).catch(console.error);
      });
  }

  function saveTitle() {
    const trimmed = editTitle.trim();
    if (!task || !trimmed || trimmed === task.title) return;
    patchTask({ title: trimmed }, { title: trimmed });
  }

  function saveDesc(content: string | null) {
    if (!task || content === task.description) return;
    patchTask({ description: content }, { description: content });
  }

  async function submitComment(doc: CommentDoc) {
    setPosting(true);
    try {
      await apiPost(`/tasks/${taskId}/comments`, { body: JSON.stringify(doc) });
      const r = await apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${taskId}`);
      setTask(r.data);
    } catch (err) { console.error(err); }
    finally { setPosting(false); }
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !menuBtnRef.current?.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!dateMenuOpen) return;
    function handler(e: MouseEvent) {
      if (!dateWrapRef.current?.contains(e.target as Node)) setDateMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dateMenuOpen]);

  function applyDueDate(value: string | null) {
    patchTask({ due_date: value }, { dueDate: value });
  }

  async function deleteTask() {
    if (!task) return;
    setDeleting(true);
    try {
      await apiDelete(`/tasks/${task.id}`);
      router.push(`/proyectos/${projectCode}/board`);
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  }

  const statusMeta = STATUS_META[task?.status ?? ''] ?? STATUS_META.backlog;
  const prioMeta   = PRIO_META[task?.priority ?? ''] ?? PRIO_META.media;

  return (
    <>
      {/* ── 100dvh shell ── */}
      <div className="-m-6 flex flex-col bg-[var(--c-bg)]" style={{ height: '100dvh' }}>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ── Left: main content ── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pb-[calc(var(--nav-h)+2rem)] md:pb-0">

              {/* Title */}
              <div className={s.titleSection}>
                {loading ? (
                  <div className="flex flex-col gap-2.5">
                    <Skel w="75%" h={22} />
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* Save + 3-dots menu */}
                    <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', zIndex: 10 }}>
                      {isEditing && (
                        <button type="button" className={s.iconBtnSave} onClick={() => setIsEditing(false)} title="Guardar cambios">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17 21 17 13 7 13 7 21"/>
                            <polyline points="7 3 7 8 15 8"/>
                          </svg>
                        </button>
                      )}
                      <div style={{ position: 'relative' }}>
                        <button
                          ref={menuBtnRef}
                          type="button"
                          className={`${s.iconBtn} ${menuOpen ? s.iconBtnActive : ''}`}
                          onClick={() => setMenuOpen(v => !v)}
                          title="Más opciones"
                          disabled={!task}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                          </svg>
                        </button>
                        {menuOpen && task && (
                          <div ref={menuRef} className={s.headerMenu}>
                            {!isEditing && (
                              <button className={s.headerMenuItem} onClick={() => { setIsEditing(true); setMenuOpen(false); }}>
                                Editar tarea
                              </button>
                            )}
                            <button className={`${s.headerMenuItem} ${s.headerMenuItemDanger}`} onClick={() => { setDeleteOpen(true); setMenuOpen(false); }}>
                              Eliminar tarea
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      className={`${s.editableTitle} ${!isEditing ? s.headerTitleLocked : ''}`}
                      readOnly={!isEditing}
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      placeholder="Título de la tarea"
                      aria-label="Título"
                    />

                    {/* Breadcrumb + all properties row */}
                    {task && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 pb-1">

                        {/* Back + breadcrumb */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/proyectos/${projectCode}/board`)}
                            className={s.iconBtn}
                            aria-label="Volver al proyecto"
                            title="Volver al proyecto"
                            style={{ width: 24, height: 24 }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="15 18 9 12 15 6" />
                            </svg>
                          </button>
                          <div className={s.headerTitleRow}>
                            <svg
                              className={s.headerTaskIcon}
                              style={{ color: STATUS_META[task.status]?.color ?? 'var(--c-muted)' }}
                              viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <path d="M9 9h6M9 12h6M9 15h4"/>
                            </svg>
                            <span className={s.headerId}>{task.identifier}</span>
                            <span className={s.headerSep} aria-hidden="true">/</span>
                            <span className={s.headerProject}>{task.project_name}</span>
                          </div>
                        </div>

                        {/* Separator */}
                        <span aria-hidden="true" style={{ color: 'var(--c-border)' }}>·</span>

                        {/* Estado */}
                        <StatusPill value={task.status} onChange={v => patchTask({ status: v }, { status: v })} />

                        {/* Prioridad */}
                        <PriorityPill value={task.priority} onChange={v => patchTask({ priority: v }, { priority: v })} disabled={!isEditing} />

                        {/* Asignados */}
                        <AssigneesPill
                          assignees={task.assignees ?? []}
                          users={users}
                          disabled={!isEditing}
                          onChange={uids => {
                            const u0 = users.find(x => x.id === uids[0]);
                            const newAssignees = uids.map(uid => {
                              const u = users.find(x => x.id === uid);
                              return { id: uid, name: u?.name ?? '', initials: u?.initials ?? '', avatar_color: u?.avatarColor ?? null, avatar_url: u?.avatarUrl ?? null };
                            });
                            patchTask(
                              { assignees: newAssignees, assignee_id: uids[0] ?? null, assignee_name: u0?.name ?? null, assignee_initials: u0?.initials ?? null },
                              { assigneeIds: uids },
                            );
                          }}
                        />

                        {/* Épica */}
                        <EpicPill
                          value={task.epic_id}
                          epics={epics}
                          disabled={!isEditing}
                          onChange={eid => {
                            const ep = epics.find(x => x.id === eid);
                            patchTask({ epic_id: eid, epic_name: ep?.name ?? null }, { epicId: eid });
                          }}
                        />

                        {/* Fecha límite */}
                        <div ref={dateWrapRef} className={s.dateFieldWrap} style={{ flex: 'none' }}>
                          <button
                            type="button"
                            className={`${s.propPill} ${!isEditing ? s.propPillStatic : ''}`}
                            style={{ cursor: isEditing ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (!isEditing) return;
                              setDateView(startOfMonth(parseDateValue(task.due_date) ?? new Date()));
                              setDateMenuOpen(o => !o);
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
                                <button type="button" className={s.dateNavBtn} onClick={() => setDateView(c => addMonths(c, -1))} aria-label="Mes anterior">
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
                                </button>
                                <span className={s.datePopoverTitle}>{CALENDAR_MONTH.format(dateView).replace(/^\w/, c => c.toUpperCase())}</span>
                                <button type="button" className={s.dateNavBtn} onClick={() => setDateView(c => addMonths(c, 1))} aria-label="Mes siguiente">
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                                </button>
                              </div>
                              <div className={s.dateWeekdays}>
                                {CALENDAR_WEEKDAYS.map((label, idx) => (
                                  <span key={`wd-${idx}`} className={s.dateWeekday}>{label}</span>
                                ))}
                              </div>
                              <div className={s.dateGrid}>
                                {buildCalendarDays(dateView).map(({ key, date, inMonth }) => {
                                  const cur = task.due_date ? task.due_date.substring(0, 10) : null;
                                  const next = toDateInputValue(date);
                                  const isSelected = cur === next;
                                  const isToday = next === toDateInputValue(new Date());
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      className={`${s.dateCell} ${!inMonth ? s.dateCellMuted : ''} ${isSelected ? s.dateCellSelected : ''} ${isToday ? s.dateCellToday : ''}`}
                                      onClick={() => { applyDueDate(next); setDateMenuOpen(false); }}
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

                        {/* Identificador */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem', padding: '0.1875rem 0.4375rem', borderRadius: '0.3125rem', border: '1px solid var(--c-border)', background: 'var(--c-bg)', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: 'var(--c-accent)' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
                            <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
                          </svg>
                          {task.identifier}
                        </span>

                        {/* Creado por */}
                        <div className="flex items-center gap-1.5">
                          <DrawerAvatar initials={task.creator_initials} avatarUrl={task.creator_avatar_url ?? null} avatarColor={task.creator_avatar_color ?? null} size={18} />
                          <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-sub)' }}>{task.creator_name}</span>
                          <span className={s.propTime}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {timeAgo(task.created_at)}
                          </span>
                        </div>

                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className={s.descSection}>
                <div className={s.sectionHeader}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
                  </svg>
                  Descripción
                </div>
                {loading ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <Skel w="90%" h={13} />
                    <Skel w="70%" h={13} />
                    <Skel w="55%" h={13} />
                  </div>
) : !isEditing && !task?.description ? (
                  <div className={s.descEmpty}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <span>Sin descripción</span>
                  </div>
                ) : (
                  <DescriptionEditor
                    initialContent={task?.description ?? null}
                    onSave={saveDesc}
                    disabled={!isEditing}
                    onLightbox={setLightboxSrc}
                  />
                )}
              </div>

              {/* Comments / Activity */}
              <div className={s.commentsSection}>
                {/* Tabs */}
                <div className={s.tabs}>
                  <button
                    type="button"
                    className={`${s.tab} ${tab === 'comments' ? s.tabActive : ''}`}
                    onClick={() => setTab('comments')}
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    Comentarios
                    {task && task.comments.length > 0 && (
                      <span className={`${s.tabBadge} ${tab === 'comments' ? 'bg-[var(--c-text)] text-[var(--c-bg)] border-[var(--c-text)]' : ''}`}>
                        {task.comments.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`${s.tab} ${tab === 'activity' ? s.tabActive : ''}`}
                    onClick={() => setTab('activity')}
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Actividad
                  </button>
                </div>

                {tab === 'comments' && (
                  <>
                    <div className={s.commentList}>
                      {loading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className={s.commentRow}>
                            <Skel w={32} h={32} />
                            <div className="flex flex-col gap-1.5 flex-1">
                              <Skel w={100} h={11} />
                              <Skel w="85%" h={11} />
                            </div>
                          </div>
                        ))
                      ) : task?.comments.length === 0 ? (
                        <div className={s.emptyState}>
                          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                          </svg>
                          <p>Sin comentarios aún</p>
                          <span>Sé el primero en comentar</span>
                        </div>
                      ) : (
                        task?.comments.map(c => (
                          <div key={c.id} className={s.commentRow}>
                            <DrawerAvatar initials={c.initials} avatarUrl={c.avatar_url} avatarColor={c.avatar_color} size={32} />
                            <div className={s.commentBubble}>
                              <div className={s.commentMeta}>
                                <span className={s.commentAuthor}>{c.name}</span>
                                <span className={s.commentTime}>{timeAgo(c.created_at)}</span>
                              </div>
                              <CommentBody body={c.body} users={users} onLightbox={setLightboxSrc} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className={s.commentForm}>
                      <CommentEditor users={users} onSubmit={submitComment} disabled={posting} />
                    </div>
                  </>
                )}

                {tab === 'activity' && (
                  <div className={s.commentList}>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={s.commentRow}>
                          <Skel w={28} h={28} />
                          <Skel w="65%" h={11} />
                        </div>
                      ))
                    ) : task?.activity.length === 0 ? (
                      <div className={s.emptyState}>
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                        <p>Sin actividad registrada</p>
                      </div>
                    ) : (
                      task?.activity.map(ev => (
                        <div key={ev.id} className={s.commentRow}>
                          <DrawerAvatar initials={ev.initials} avatarUrl={ev.avatar_url} avatarColor={ev.avatar_color} size={28} />
                          <div className={s.commentBubble}>
                            <p className={s.commentText}>{ev.action}</p>
                            <span className={s.commentTime}>{timeAgo(ev.created_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>{/* /left */}

        </div>{/* /body */}
      </div>{/* /shell */}

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', cursor: 'zoom-out' }}
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
        >
          <button
            type="button"
            style={{ position: 'fixed', top: '1rem', right: '1rem', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10001 }}
            onClick={() => setLightboxSrc(null)}
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Imagen ampliada"
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '0.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', cursor: 'default', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <ConfirmModal
        open={deleteOpen}
        title="Eliminar tarea"
        message={`¿Eliminar "${task?.title}"? Esta acción es irreversible.`}
        confirmLabel="Eliminar"
        onConfirm={deleteTask}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

