'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useUIDispatch } from '@/store/UIContext';
import { bumpTasks, openCreateModal } from '@/store/slices/uiSlice';
import {
  StatusPill, PriorityPill, AssigneesPill,
  DrawerAvatar, STATUS_META, PRIO_META, timeAgo,
} from '@/components/features/tasks/TaskDrawer';
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
  project_code: string;
  project_name: string;
  epic_id: string | null;
  epic_name: string | null;
  cycle_id: string | null;
  subtasks: { id: string; identifier: string; title: string; status: string }[];
  comments: { id: string; body: string; created_at: string; initials: string; name: string }[];
  activity: { id: string; action: string; created_at: string; initials: string; name: string }[];
}

type EpicOpt  = { id: string; name: string };
type UserOpt  = { id: string; name: string; initials: string; avatarUrl: string | null; avatarColor: string | null };
type TabType  = 'comments' | 'activity';

/* ── Helpers ─────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center min-h-[34px] gap-2">
      <span className="text-[0.75rem] text-[var(--c-text-sub)] w-[96px] shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export default function TaskPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id: projectCode, taskId } = use(params);
  const router   = useRouter();
  const dispatch = useUIDispatch();

  const [task,      setTask]      = useState<TaskDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [users,     setUsers]     = useState<UserOpt[]>([]);
  const [epics,     setEpics]     = useState<EpicOpt[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc,  setEditDesc]  = useState('');
  const [tab,       setTab]       = useState<TabType>('comments');
  const [comment,   setComment]   = useState('');
  const [posting,   setPosting]   = useState(false);
  const [mentionOpen,  setMentionOpen]  = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIdx,   setMentionIdx]   = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Load task & supporting data */
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
        setEditDesc(t.description ?? '');
        setUsers(usersRes.data.map((u) => ({ id: u.id, name: u.name, initials: u.initials, avatarUrl: u.avatar_url, avatarColor: u.avatar_color })));
        return apiGet<{ ok: boolean; data: EpicOpt[] }>(`/projects/${t.project_code}/epics`);
      })
      .then((er) => setEpics(er.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [taskId]);

  /* Generic PATCH */
  function patchTask(localMerge: Partial<TaskDetail>, dto: Record<string, unknown>) {
    setTask((t) => t ? { ...t, ...localMerge } : t);
    apiPatch(`/tasks/${taskId}`, dto)
      .then(() => dispatch(bumpTasks()))
      .catch((err) => {
        console.error(err);
        apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${taskId}`)
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

  function toggleSubtask(sub: { id: string; status: string }) {
    const newStatus = sub.status === 'completada' ? 'backlog' : 'completada';
    setTask((t) => t ? {
      ...t,
      subtasks: t.subtasks.map((st) => st.id === sub.id ? { ...st, status: newStatus } : st),
    } : t);
    apiPatch(`/tasks/${sub.id}`, { status: newStatus })
      .then(() => dispatch(bumpTasks()))
      .catch(console.error);
  }

  /* Mention handling */
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
      setMentionStart(at); setMentionQuery(slice.slice(at + 1));
      setMentionOpen(true); setMentionIdx(0);
    } else { setMentionOpen(false); }
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
      ta.focus(); ta.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || !mentionFiltered.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % mentionFiltered.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + mentionFiltered.length) % mentionFiltered.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionFiltered[mentionIdx]); }
    else if (e.key === 'Escape') { setMentionOpen(false); }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await apiPost(`/tasks/${taskId}/comments`, { body: comment.trim() });
      setComment('');
      const r = await apiGet<{ ok: boolean; data: TaskDetail }>(`/tasks/${taskId}`);
      setTask(r.data);
    } catch (err) { console.error(err); }
    finally { setPosting(false); }
  }

  const doneSubs  = task?.subtasks.filter((s) => s.status === 'completada').length ?? 0;
  const totalSubs = task?.subtasks.length ?? 0;
  const progress  = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const statusMeta = STATUS_META[task?.status ?? ''] ?? STATUS_META.backlog;
  const prioMeta   = PRIO_META[task?.priority ?? ''] ?? PRIO_META.media;

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      {/* ── Top bar ──────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[var(--c-bg)] border-b border-[var(--c-border)] px-4 md:px-8 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/proyectos/${projectCode}/board`)}
          className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit] p-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al proyecto
        </button>

        <span className="text-[var(--c-border)]" aria-hidden="true">/</span>

        {loading ? (
          <Skeleton className="w-24 h-4" />
        ) : (
          <span className="font-mono text-[0.6875rem] text-[var(--c-muted)] bg-[var(--c-hover)] border border-[var(--c-border)] rounded px-1.5 py-0.5">
            {task?.identifier}
          </span>
        )}

        {/* Status + priority badges (read-only in header) */}
        {task && (
          <div className="flex items-center gap-2 ml-auto">
            <span
              className="flex items-center gap-1.5 text-[0.75rem] font-medium px-2 py-0.5 rounded-full border"
              style={{ color: statusMeta.color, borderColor: `${statusMeta.color}33`, background: `${statusMeta.color}11` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color }} aria-hidden="true" />
              {statusMeta.label}
            </span>
            <span
              className="text-[0.75rem] font-medium"
              style={{ color: prioMeta.color }}
            >
              ▲ {prioMeta.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Main layout ──────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 items-start">

        {/* ── Left: main content ────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Title & description */}
          <div>
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <>
                <input
                  className="w-full text-[1.375rem] font-bold text-[var(--c-text)] leading-tight bg-transparent border border-transparent rounded-lg px-1.5 py-1 outline-none hover:bg-[var(--c-hover)] hover:border-[var(--c-border)] focus:bg-[var(--c-bg)] focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] transition-all mb-3 block font-[inherit]"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  placeholder="Título de la tarea"
                  aria-label="Título"
                />
                <textarea
                  className="w-full text-[0.9375rem] text-[var(--c-text-sub)] leading-relaxed bg-transparent border border-transparent rounded-lg px-1.5 py-1 outline-none hover:bg-[var(--c-hover)] hover:border-[var(--c-border)] focus:bg-[var(--c-bg)] focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] transition-all resize-none block font-[inherit] whitespace-pre-wrap"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onBlur={saveDesc}
                  placeholder="Agrega una descripción..."
                  rows={4}
                  aria-label="Descripción"
                />
              </>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--c-muted)]">Subtareas</span>
              {totalSubs > 0 && (
                <span className="text-[0.6875rem] text-[var(--c-muted)]">{doneSubs}/{totalSubs}</span>
              )}
            </div>

            {totalSubs > 0 && (
              <div className="h-[3px] bg-[var(--c-border)] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[var(--c-text)] rounded-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="flex flex-col gap-1 mb-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
              ) : totalSubs === 0 ? (
                <p className="text-[0.8125rem] text-[var(--c-muted)] py-1">Sin subtareas</p>
              ) : (
                task?.subtasks.map((sub) => {
                  const done = sub.status === 'completada';
                  return (
                    <div key={sub.id} className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-[var(--c-hover)] -mx-2 transition-colors">
                      <button
                        type="button"
                        aria-label={done ? 'Marcar como pendiente' : 'Marcar como completada'}
                        className={`w-4 h-4 rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 cursor-pointer transition-all p-0 ${
                          done
                            ? 'bg-[var(--c-text)] border-[var(--c-text)]'
                            : 'bg-transparent border-[var(--c-border)] hover:border-[var(--c-text-sub)]'
                        }`}
                        onClick={() => toggleSubtask(sub)}
                      >
                        {done && (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
                            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="2 6 5 9 10 3" />
                          </svg>
                        )}
                      </button>
                      <span className="font-mono text-[0.6875rem] text-[var(--c-muted)] shrink-0">{sub.identifier}</span>
                      <span className={`text-[0.875rem] flex-1 min-w-0 truncate ${done ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
                        {sub.title}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--c-text-sub)] hover:text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors bg-transparent border-none font-[inherit] cursor-pointer px-2 py-1.5 rounded-lg w-full text-left"
              onClick={() => dispatch(openCreateModal('subtask'))}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Agregar subtarea
            </button>
          </div>

          {/* Comments & Activity */}
          <div>
            {/* Tabs */}
            <div className="flex border-b border-[var(--c-border)] mb-4">
              {(['comments', 'activity'] as TabType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 text-[0.8125rem] font-medium px-0 py-2.5 mr-5 border-b-2 -mb-px bg-transparent border-x-0 border-t-0 font-[inherit] cursor-pointer transition-colors ${
                    tab === t
                      ? 'text-[var(--c-text)] border-b-[var(--c-text)]'
                      : 'text-[var(--c-muted)] border-b-transparent hover:text-[var(--c-text-sub)]'
                  }`}
                >
                  {t === 'comments' ? 'Comentarios' : 'Actividad'}
                  {t === 'comments' && task && task.comments.length > 0 && (
                    <span className="text-[0.625rem] bg-[var(--c-hover)] text-[var(--c-text-sub)] rounded-full px-1.5 font-semibold">
                      {task.comments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'comments' && (
              <div className="flex flex-col gap-4">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    </div>
                  ))
                ) : task?.comments.length === 0 ? (
                  <p className="text-[0.875rem] text-[var(--c-muted)]">Sin comentarios aún</p>
                ) : (
                  task?.comments.map((c) => (
                    <div key={c.id} className="flex gap-3 items-start">
                      <DrawerAvatar initials={c.initials} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[0.875rem] font-semibold text-[var(--c-text)]">{c.name}</span>
                          <span className="text-[0.6875rem] text-[var(--c-muted)]">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-[0.875rem] text-[var(--c-text-sub)] leading-relaxed break-words">{c.body}</p>
                      </div>
                    </div>
                  ))
                )}

                {/* Comment form */}
                <form onSubmit={submitComment} className="flex gap-3 mt-1 items-end">
                  <div className="relative flex-1">
                    {mentionOpen && mentionFiltered.length > 0 && (
                      <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto p-1">
                        {mentionFiltered.map((u, i) => (
                          <button
                            key={u.id} type="button" role="option" aria-selected={i === mentionIdx}
                            className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-[0.8125rem] text-[var(--c-text)] font-[inherit] border-none transition-colors cursor-pointer ${i === mentionIdx ? 'bg-[var(--c-hover)]' : 'bg-transparent'} hover:bg-[var(--c-hover)]`}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                          >
                            <DrawerAvatar initials={u.initials} size={22} />
                            {u.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      className="w-full resize-none font-[inherit] text-[0.875rem] text-[var(--c-text)] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl px-3 py-2.5 outline-none transition-[border-color,box-shadow] focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] block"
                      placeholder="Escribe un comentario... (@nombre para mencionar)"
                      value={comment}
                      onChange={handleCommentChange}
                      onKeyDown={handleCommentKeyDown}
                      aria-label="Nuevo comentario"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={posting || !comment.trim()}
                    className="text-[0.875rem] font-semibold font-[inherit] text-[var(--c-bg)] bg-[var(--c-text)] border-none rounded-xl px-4 py-2.5 cursor-pointer whitespace-nowrap shrink-0 transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
                  >
                    {posting ? '...' : 'Comentar'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'activity' && (
              <div className="flex flex-col gap-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  ))
                ) : task?.activity.length === 0 ? (
                  <p className="text-[0.875rem] text-[var(--c-muted)]">Sin actividad registrada</p>
                ) : (
                  task?.activity.map((ev) => (
                    <div key={ev.id} className="flex gap-3 items-start">
                      <DrawerAvatar initials={ev.initials} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.875rem] text-[var(--c-text-sub)] leading-snug">{ev.action}</p>
                        <span className="text-[0.6875rem] text-[var(--c-muted)]">{timeAgo(ev.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: properties sidebar ─────────────── */}
        <div className="flex flex-col gap-1 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl p-4 sticky top-20">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--c-muted)] mb-2 block">Propiedades</span>

          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <Skeleton className="h-3 w-20 shrink-0" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))
          ) : task ? (
            <>
              <PropRow label="Estado">
                <StatusPill
                  value={task.status}
                  onChange={(v) => patchTask({ status: v }, { status: v })}
                />
              </PropRow>

              <PropRow label="Prioridad">
                <PriorityPill
                  value={task.priority}
                  onChange={(v) => patchTask({ priority: v }, { priority: v })}
                />
              </PropRow>

              <PropRow label="Asignados">
                <AssigneesPill
                  assignees={task.assignees ?? []}
                  users={users}
                  onChange={(uids) => {
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
              </PropRow>

              <PropRow label="Proyecto">
                <span className="font-mono text-[0.6875rem] text-[var(--c-muted)] bg-[var(--c-hover)] border border-[var(--c-border)] rounded px-1.5 py-0.5 shrink-0">
                  {task.project_code}
                </span>
                <span className="text-[0.8125rem] text-[var(--c-text)] truncate">{task.project_name}</span>
              </PropRow>

              <PropRow label="Épica">
                <select
                  className="text-[0.8125rem] font-[inherit] text-[var(--c-text)] bg-transparent border border-[var(--c-border)] rounded-md px-2 py-1 cursor-pointer outline-none transition-[border-color] hover:border-[var(--c-text-sub)] focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] max-w-full"
                  value={task.epic_id ?? ''}
                  onChange={(e) => {
                    const eid = e.target.value || null;
                    const ep = epics.find((x) => x.id === eid);
                    patchTask({ epic_id: eid, epic_name: ep?.name ?? null }, { epicId: eid });
                  }}
                >
                  <option value="">Sin épica</option>
                  {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
                </select>
              </PropRow>

              <PropRow label="Fecha límite">
                <input
                  type="date"
                  className="text-[0.8125rem] font-[inherit] text-[var(--c-text)] bg-transparent border border-[var(--c-border)] rounded-md px-2 py-1 cursor-pointer outline-none transition-[border-color] hover:border-[var(--c-text-sub)] focus:border-[var(--c-text-sub)]"
                  value={task.due_date ? task.due_date.substring(0, 10) : ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    patchTask({ due_date: val }, { dueDate: val });
                  }}
                />
              </PropRow>

              <div className="border-t border-[var(--c-line)] mt-2 pt-3">
                <PropRow label="Creado por">
                  <DrawerAvatar initials={task.creator_initials} size={20} />
                  <span className="text-[0.8125rem] text-[var(--c-text)] truncate">{task.creator_name}</span>
                  <span className="text-[0.6875rem] text-[var(--c-muted)] shrink-0">· {timeAgo(task.created_at)}</span>
                </PropRow>
              </div>
            </>
          ) : null}
        </div>

      </div>
    </div>
  );
}
