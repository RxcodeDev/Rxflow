'use client';

import { useState, useEffect, useRef } from 'react';
import s from './TaskDrawer.module.css';
import { useUIState, useUIDispatch } from '@/store/UIContext';
import { closeDrawer, openCreateModal } from '@/store/slices/uiSlice';
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
  creator_initials: string;
  creator_name: string;
  project_code: string;
  project_name: string;
  epic_id: string | null;
  epic_name: string | null;
  cycle_id: string | null;
  subtasks: { id: string; identifier: string; title: string; status: string }[];
  comments: { id: string; body: string; created_at: string; initials: string; name: string }[];
  activity: { id: string; action: string; created_at: string; initials: string; name: string }[];
}

type EpicOpt = { id: string; name: string };

type UserOpt = { id: string; name: string; initials: string };

/* ── Helpers ─────────────────────────────────────────── */
function timeAgo(iso: string): string {
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

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', en_progreso: 'En progreso',
  en_revision: 'En revisión', bloqueado: 'Bloqueado', completada: 'Completada',
};

const PRIO_LABELS: Record<string, string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Media', baja: 'Baja',
};

/* ── Sub-components ──────────────────────────────────── */
function Avatar({ initials, large }: { initials: string; large?: boolean }) {
  return (
    <div className={`${s.avatar} ${large ? s.avatar32 : ''}`} aria-hidden="true">
      {initials}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.metaRow}>
      <span className={s.metaLabel}>{label}</span>
      <div className={s.metaValue}>{children}</div>
    </div>
  );
}

function Skel({ w, h = 16 }: { w: number | string; h?: number }) {
  return (
    <div
      className="bg-[var(--c-hover)] rounded animate-pulse"
      style={{ width: typeof w === 'number' ? w : w, height: h }}
    />
  );
}

/* ── Main export ─────────────────────────────────────── */
export default function TaskDrawer() {
  const { isDrawerOpen, activeTaskId } = useUIState();
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
  const drawerRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Fetch user list once */
  useEffect(() => {
    apiGet<ApiWrapped<MemberItem[]>>('/users')
      .then((r) => setUsers(r.data.map((u) => ({ id: u.id, name: u.name, initials: u.initials }))))
      .catch(console.error);
  }, []);

  /* Fetch task when drawer opens */
  useEffect(() => {
    if (!isDrawerOpen || !activeTaskId) { setTask(null); setEpics([]); return; }
    setLoading(true);
    setTab('comments');
    apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${activeTaskId}`)
      .then((r) => {
        setTask(r.data);
        setEditTitle(r.data.title);
        setEditDesc(r.data.description ?? '');
        /* Load epics for this project */
        apiGet<{ ok: boolean; data: EpicOpt[] }>(`/projects/${r.data.project_code}/epics`)
          .then((er) => setEpics(er.data))
          .catch(console.error);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isDrawerOpen, activeTaskId]);

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
    apiPatch(`/tasks/${activeTaskId}`, dto).catch((err) => {
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

  const doneSubs  = task?.subtasks.filter((sub) => sub.status === 'completada').length ?? 0;
  const totalSubs = task?.subtasks.length ?? 0;
  const progress  = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

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
        {/* ── HEADER ────────────────────────────────────── */}
        <div className={s.header}>
          {loading ? <Skel w={60} /> : (
            <span className={s.headerId}>{task?.identifier ?? '—'}</span>
          )}
          <button className={s.iconBtn} aria-label="Abrir página completa" type="button">
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

        {/* ── BODY ─────────────────────────────────────── */}
        <div className={s.body}>

          {/* Título y descripción */}
          <div className={s.block}>
            {loading ? (
              <div className="flex flex-col gap-2">
                <Skel w="90%" h={24} />
                <Skel w="70%" h={16} />
                <Skel w="80%" h={16} />
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

          <hr className={s.divider} />

          {/* Metadatos */}
          <div className={s.metaGrid}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={s.metaRow}>
                  <Skel w={64} />
                  <Skel w={100} />
                </div>
              ))
            ) : task ? (
              <>
                <MetaRow label="Estado">
                  <select
                    className={s.metaSelect}
                    value={task.status}
                    onChange={(e) => patchTask({ status: e.target.value }, { status: e.target.value })}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </MetaRow>

                <MetaRow label="Prioridad">
                  <select
                    className={s.metaSelect}
                    value={task.priority}
                    onChange={(e) => patchTask({ priority: e.target.value }, { priority: e.target.value })}
                  >
                    {Object.entries(PRIO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </MetaRow>

                <MetaRow label="Asignado">
                  <select
                    className={s.metaSelect}
                    value={task.assignee_id ?? ''}
                    onChange={(e) => {
                      const uid = e.target.value || null;
                      const u = users.find((x) => x.id === uid);
                      patchTask(
                        { assignee_id: uid, assignee_name: u?.name ?? null, assignee_initials: u?.initials ?? null },
                        { assigneeId: uid },
                      );
                    }}
                  >
                    <option value="">Sin asignar</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </MetaRow>

                <MetaRow label="Proyecto">
                  <span className="font-mono text-[0.6875rem] text-[var(--c-muted)]">{task.project_code}</span>
                  {task.project_name}
                </MetaRow>

                <MetaRow label="Épica">
                  <select
                    className={s.metaSelect}
                    value={task.epic_id ?? ''}
                    onChange={(e) => {
                      const eid = e.target.value || null;
                      const ep = epics.find((x) => x.id === eid);
                      patchTask(
                        { epic_id: eid, epic_name: ep?.name ?? null },
                        { epicId: eid },
                      );
                    }}
                  >
                    <option value="">Sin épica</option>
                    {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
                  </select>
                </MetaRow>

                <MetaRow label="Fecha">
                  <input
                    type="date"
                    className={s.metaDateInput}
                    value={task.due_date ? task.due_date.substring(0, 10) : ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      patchTask({ due_date: val }, { dueDate: val });
                    }}
                  />
                </MetaRow>

                <MetaRow label="Creado por">
                  <Avatar initials={task.creator_initials} />
                  {task.creator_name}
                  <span className="text-[var(--c-muted)] text-[0.6875rem]">
                    · {timeAgo(task.created_at)}
                  </span>
                </MetaRow>
              </>
            ) : null}
          </div>

          <hr className={s.divider} />

          {/* Subtareas */}
          <div className={s.block}>
            <span className={s.blockTitle}>
              Subtareas ({doneSubs}/{totalSubs} completadas)
            </span>

            {totalSubs > 0 && (
              <div className={s.progressBar}>
                <div className={s.progressFill} style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className={s.subtaskList}>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => <Skel key={i} w="100%" h={24} />)
              ) : totalSubs === 0 ? (
                <p className="text-[13px] text-[var(--c-muted)]">Sin subtareas</p>
              ) : (
                task?.subtasks.map((sub) => {
                  const done = sub.status === 'completada';
                  return (
                    <div key={sub.id} className={s.subtaskRow}>
                      <div className={`${s.checkbox} ${done ? s.checkboxDone : ''}`} aria-hidden="true">
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
                            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="2 6 5 9 10 3" />
                          </svg>
                        )}
                      </div>
                      <span className={s.subtaskId}>{sub.identifier}</span>
                      <span className={`${s.subtaskLabel} ${done ? s.subtaskLabelDone : ''}`}>
                        {sub.title}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              className={s.addSubtaskBtn}
              onClick={() => dispatch(openCreateModal('subtask'))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Agregar subtarea
            </button>
          </div>

          <hr className={s.divider} />

          {/* Tabs: Comentarios / Actividad */}
          <div className={s.block}>
            <div className={s.tabs}>
              <button type="button" className={`${s.tab} ${tab === 'comments' ? s.tabActive : ''}`}
                onClick={() => setTab('comments')}>
                Comentarios {task && task.comments.length > 0 && `(${task.comments.length})`}
              </button>
              <button type="button" className={`${s.tab} ${tab === 'activity' ? s.tabActive : ''}`}
                onClick={() => setTab('activity')}>
                Actividad
              </button>
            </div>

            {tab === 'comments' && (
              <div className={s.commentList}>
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={s.commentRow}>
                      <Skel w={32} h={32} />
                      <div className="flex flex-col gap-1 flex-1">
                        <Skel w={100} h={12} />
                        <Skel w="90%" h={12} />
                      </div>
                    </div>
                  ))
                ) : task?.comments.length === 0 ? (
                  <p className="text-[13px] text-[var(--c-muted)] py-2">Sin comentarios aún</p>
                ) : (
                  task?.comments.map((c) => (
                    <div key={c.id} className={s.commentRow}>
                      <Avatar initials={c.initials} large />
                      <div>
                        <div className={s.commentMeta}>
                          <span className={s.commentAuthor}>{c.name}</span>
                          <span className={s.commentTime}>{timeAgo(c.created_at)}</span>
                        </div>
                        <p className={s.commentText}>{c.body}</p>
                      </div>
                    </div>
                  ))
                )}

                <form onSubmit={submitComment} className={s.commentInput}>
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
                            <Avatar initials={u.initials} />
                            {u.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      className={s.commentTextarea}
                      placeholder="Escribe un comentario... (@nombre para mencionar)"
                      value={comment}
                      onChange={handleCommentChange}
                      onKeyDown={handleCommentKeyDown}
                      aria-label="Nuevo comentario"
                    />
                  </div>
                  <button type="submit" className={s.commentBtn} disabled={posting || !comment.trim()}>
                    {posting ? '...' : 'Comentar'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'activity' && (
              <div className={s.activityList}>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={s.activityRow}>
                      <Skel w={32} h={32} />
                      <Skel w="70%" h={12} />
                    </div>
                  ))
                ) : task?.activity.length === 0 ? (
                  <p className="text-[13px] text-[var(--c-muted)] py-2">Sin actividad registrada</p>
                ) : (
                  task?.activity.map((ev) => (
                    <div key={ev.id} className={s.activityRow}>
                      <Avatar initials={ev.initials} large />
                      <span className={s.activityText}>{ev.action}</span>
                      <span className={s.activityTime}>{timeAgo(ev.created_at)}</span>
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
