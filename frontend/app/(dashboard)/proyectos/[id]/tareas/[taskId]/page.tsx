'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
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

  const statusMeta = STATUS_META[task?.status ?? ''] ?? STATUS_META.backlog;
  const prioMeta   = PRIO_META[task?.priority ?? ''] ?? PRIO_META.media;

  return (
    <>
      {/* ── 100dvh shell ── */}
      <div className="-m-6 flex flex-col bg-[var(--c-bg)]" style={{ height: '100dvh' }}>

        {/* ── Header ── */}
        <div className={s.header} style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
          {/* Back */}
          <button
            type="button"
            onClick={() => router.push(`/proyectos/${projectCode}/board`)}
            className={s.iconBtn}
            aria-label="Volver al proyecto"
            title="Volver al proyecto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={s.headerLeft}>
            {loading ? (
              <div className="flex items-center gap-2">
                <Skel w={48} h={20} />
                <Skel w={160} h={14} />
              </div>
            ) : task ? (
              <div className={s.headerTitleWrap}>
                <div className={s.headerTitleRow}>
                  <svg
                    className={s.headerTaskIcon}
                    style={{ color: STATUS_META[task.status]?.color ?? 'var(--c-muted)' }}
                    viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
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
            ) : null}
          </div>

          {/* Right: status + priority pills */}
          {task && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="hidden sm:flex items-center gap-1.5 text-[0.75rem] font-medium px-2 py-0.5 rounded-full border"
                style={{ color: statusMeta.color, borderColor: `${statusMeta.color}33`, background: `${statusMeta.color}11` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color }} aria-hidden="true" />
                {statusMeta.label}
              </span>
              <span
                className="hidden md:flex items-center gap-1 text-[0.75rem] font-medium px-2 py-0.5 rounded-full border"
                style={{ color: prioMeta.color, borderColor: `${prioMeta.color}33`, background: `${prioMeta.color}11` }}
              >
                <span style={{ fontSize: '0.4375rem' }} aria-hidden="true">▲</span>
                {prioMeta.label}
              </span>
            </div>
          )}
        </div>

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
                  <>
                    {/* Mobile pills row */}
                    {task && (
                      <div className="flex flex-wrap gap-1.5 mb-3 md:hidden">
                        <StatusPill value={task.status} onChange={v => patchTask({ status: v }, { status: v })} />
                        <PriorityPill value={task.priority} onChange={v => patchTask({ priority: v }, { priority: v })} />
                        <AssigneesPill
                          assignees={task.assignees ?? []}
                          users={users}
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
                      </div>
                    )}
                    <input
                      className={s.editableTitle}
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      placeholder="Título de la tarea"
                      aria-label="Título"
                    />
                  </>
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
                ) : !task?.description ? (
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
                    initialContent={task.description ?? null}
                    onSave={saveDesc}
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

          {/* ── Right: properties panel (desktop only) ── */}
          <aside className="hidden md:flex flex-col flex-shrink-0 w-[300px] overflow-y-auto border-l border-[var(--c-border)]">

            {loading ? (
              <div className={s.propsSection}>
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <Skel w={52} h={10} />
                      <Skel w={120} h={28} />
                    </div>
                  ))}
                </div>
              </div>
            ) : task ? (
              <div className={s.propsSection}>
                <div className={s.propList}>

                  {/* Estado / Prioridad */}
                  <div className={s.propRow}>
                    <span className={s.propRowLabel}>Estado</span>
                    <StatusPill value={task.status} onChange={v => patchTask({ status: v }, { status: v })} />
                  </div>
                  <div className={s.propRow}>
                    <span className={s.propRowLabel}>Prioridad</span>
                    <PriorityPill value={task.priority} onChange={v => patchTask({ priority: v }, { priority: v })} />
                  </div>

                  {/* Asignados / Épica */}
                  <div className={s.propRow}>
                    <span className={s.propRowLabel}>Asignados</span>
                    <AssigneesPill
                      assignees={task.assignees ?? []}
                      users={users}
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
                  </div>
                  <div className={s.propRow}>
                    <span className={s.propRowLabel}>Épica</span>
                    <EpicPill
                      value={task.epic_id}
                      epics={epics}
                      onChange={eid => {
                        const ep = epics.find(x => x.id === eid);
                        patchTask({ epic_id: eid, epic_name: ep?.name ?? null }, { epicId: eid });
                      }}
                    />
                  </div>

                  {/* Fecha / Identificador */}
                  <div className={s.propRow}>
                    <span className={s.propRowLabel}>Fecha límite</span>
                    <input
                      type="date"
                      className={s.propPill}
                      style={{ cursor: 'pointer', width: '100%' }}
                      value={task.due_date ? task.due_date.substring(0, 10) : ''}
                      onChange={e => {
                        const val = e.target.value || null;
                        patchTask({ due_date: val }, { dueDate: val });
                      }}
                    />
                  </div>
                  <div className={s.propRow}>
                    <span className={s.propRowLabel}>Identificador</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem', padding: '0.1875rem 0.4375rem', borderRadius: '0.3125rem', border: '1px solid var(--c-border)', background: 'var(--c-bg)', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: 'var(--c-accent)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
                        <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
                      </svg>
                      {task.identifier}
                    </span>
                  </div>

                  {/* Proyecto — full width */}
                  <div className={`${s.propRow} ${s.propRowFull}`}>
                    <span className={s.propRowLabel}>Proyecto</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em', padding: '0.1875rem 0.4375rem', borderRadius: '0.3125rem', border: '1.5px solid var(--c-accent)', color: 'var(--c-accent)', flexShrink: 0 }}>
                        {task.project_code}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.project_name}</span>
                    </div>
                  </div>

                  {/* Creado por — full width */}
                  <div className={`${s.propRow} ${s.propRowFull}`}>
                    <span className={s.propRowLabel}>Creado por</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <DrawerAvatar
                        initials={task.creator_initials}
                        avatarUrl={task.creator_avatar_url ?? null}
                        avatarColor={task.creator_avatar_color ?? null}
                        size={18}
                      />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.creator_name}</span>
                      <span className={s.propTime}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {timeAgo(task.created_at)}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            ) : null}
          </aside>

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
    </>
  );
}

