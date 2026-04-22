'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import type { ProjectSummary, EpicItem, TaskItem, ApiWrapped } from '@/types/api.types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { playSuccess } from '@/hooks/useSound';
import ProjectViewTabs from '@/components/features/projects/ProjectViewTabs';
import TaskCreateModal from '@/components/features/projects/TaskCreateModal';
import { useUIDispatch } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';
import { STATUS_LABEL as TASK_STATUS_LABEL, PRIORITY_STYLE } from '@/components/features/projects/projectShared';

/* ── Helpers ─────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

const EPIC_STATUS_LABEL: Record<string, string> = {
  activa:     'Activa',
  completada: 'Completada',
  archivada:  'Archivada',
};

const EPIC_STATUS_STYLE: Record<string, string> = {
  activa:     'text-[var(--c-text)] border-[var(--c-text)]',
  completada: 'text-[var(--c-text-sub)] border-[var(--c-border)]',
  archivada:  'text-[var(--c-muted)] border-[var(--c-border)]',
};

const EPIC_STATUS_ORDER = ['activa', 'completada', 'archivada'] as const;

const fieldCls =
  'w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm ' +
  'bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] ' +
  'outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]';

/* ── Task row inside an epic ─────────────────────────── */
function EpicTaskRow({ task, onOpen }: { task: TaskItem; onOpen: (id: string) => void }) {
  const prio = (task.priority ?? 'media').toLowerCase();
  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--c-hover)] transition-colors border-t border-[var(--c-line)] cursor-pointer bg-transparent font-[inherit]"
    >
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'completada' ? 'bg-[#16a34a]' : task.status === 'bloqueado' ? 'bg-[var(--c-danger)]' : task.status === 'en_progreso' ? 'bg-[#7c3aed]' : 'bg-[var(--c-border)]'}`} />
      <span className="font-mono text-[11px] text-[var(--c-muted)] shrink-0 w-14">{task.identifier}</span>
      <span className={`flex-1 text-[13px] truncate ${task.status === 'completada' ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>
        {task.title}
      </span>
      <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize shrink-0 ${PRIORITY_STYLE[prio] ?? PRIORITY_STYLE.media}`}>
        {task.priority ?? 'media'}
      </span>
      {task.assignee_initials ? (
        <div className="w-5 h-5 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[9px] font-semibold flex items-center justify-center shrink-0">
          {task.assignee_initials}
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full border border-dashed border-[var(--c-border)] shrink-0" />
      )}
      {task.due_date && (
        <span className="text-[11px] text-[var(--c-text-sub)] shrink-0">
          {new Date(task.due_date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </button>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function EpicasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectCode } = use(params);
  const code = projectCode.toUpperCase();
  const dispatch = useUIDispatch();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [epics,   setEpics]   = useState<EpicItem[]>([]);
  const [tasks,   setTasks]   = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; initials: string }[]>([]);
  const [loading, setLoading] = useState(true);

  /* Expanded epics */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /* Create epic modal */
  const [epicModalOpen, setEpicModalOpen] = useState(false);
  const [epicName,      setEpicName]      = useState('');
  const [nameError,     setNameError]     = useState('');
  const [epicDesc,      setEpicDesc]      = useState('');
  const [epicSaving,    setEpicSaving]    = useState(false);
  const [epicSaveError, setEpicSaveError] = useState('');

  /* Create task modal */
  const [taskModalOpen,   setTaskModalOpen]   = useState(false);
  const [taskDefaultEpic, setTaskDefaultEpic] = useState('');

  const fetchTasks = useCallback(() => {
    apiGet<ApiWrapped<TaskItem[]>>(`/projects/${code}/tasks`)
      .then((r) => setTasks(r.data))
      .catch(console.error);
  }, [code]);

  useEffect(() => {
    Promise.all([
      apiGet<ApiWrapped<ProjectSummary>>(`/projects/${code}`),
      apiGet<ApiWrapped<EpicItem[]>>(`/projects/${code}/epics`),
      apiGet<ApiWrapped<TaskItem[]>>(`/projects/${code}/tasks`),
      apiGet<ApiWrapped<{ id: string; name: string; initials: string }[]>>(`/projects/${code}/members`)
        .catch(() => ({ data: [] as { id: string; name: string; initials: string }[] })),
    ])
      .then(([pRes, eRes, tRes, mRes]) => {
        setProject(pRes.data);
        setEpics(eRes.data);
        setTasks(tRes.data);
        setMembers(mRes.data);
        /* Auto-expand first 3 active epics */
        const firstActive = eRes.data.filter(e => e.status === 'activa').slice(0, 3);
        setExpanded(new Set(firstActive.map(e => e.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code]);

  function openEpicModal() {
    setEpicName(''); setEpicDesc(''); setNameError(''); setEpicSaveError('');
    setEpicModalOpen(true);
  }

  async function handleCreateEpic(e: React.FormEvent) {
    e.preventDefault();
    if (!epicName.trim()) { setNameError('El nombre es requerido'); return; }
    setEpicSaving(true);
    setEpicSaveError('');
    try {
      const res = await apiPost<ApiWrapped<EpicItem>>(`/projects/${code}/epics`, {
        name: epicName.trim(),
        description: epicDesc.trim() || undefined,
      });
      setEpics(prev => [...prev, res.data]);
      setExpanded(prev => new Set([...prev, res.data.id]));
      playSuccess();
      setEpicModalOpen(false);
    } catch (err) {
      setEpicSaveError(err instanceof Error ? err.message : 'Error al crear la épica');
    } finally {
      setEpicSaving(false);
    }
  }

  function openTaskForEpic(epicId: string) {
    setTaskDefaultEpic(epicId);
    setTaskModalOpen(true);
  }

  function toggleExpand(epicId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId); else next.add(epicId);
      return next;
    });
  }

  const grouped = EPIC_STATUS_ORDER
    .map(s => ({ status: s, items: epics.filter(e => e.status === s) }))
    .filter(g => g.items.length > 0);

  const tasksByEpic = (epicId: string) => tasks.filter(t => t.epic_id === epicId);
  const tasksWithoutEpic = tasks.filter(t => !t.epic_id);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px] text-[var(--c-muted)]" aria-label="Ruta">
        <Link href="/proyectos" className="hover:text-[var(--c-text)] transition-colors">Proyectos</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/proyectos/${projectCode}/board`} className="hover:text-[var(--c-text)] transition-colors">
          {project?.name ?? code}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--c-text)]">Épicas</span>
      </nav>

      {/* Header + tabs */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--c-text)]">
              {loading ? <Skeleton className="w-32 h-7 inline-block" /> : (project?.name ?? code)}
            </h1>
            <span className="font-mono text-[11px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5">
              {code}
            </span>
          </div>
          <p className="text-sm text-[var(--c-text-sub)] mt-0.5">
            {loading ? <Skeleton className="w-24 h-4 inline-block" /> : `${epics.length} épica${epics.length !== 1 ? 's' : ''} · ${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProjectViewTabs projectCode={projectCode} active="epicas" />
          <button
            type="button"
            onClick={openEpicModal}
            className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-3 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]"
          >
            + Nueva épica
          </button>
        </div>
      </div>

      {/* Skeletons */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && epics.length === 0 && (
        <div className="border border-dashed border-[var(--c-border)] rounded-xl py-12 text-center">
          <p className="text-sm text-[var(--c-muted)]">No hay épicas en este proyecto.</p>
          <button type="button" onClick={openEpicModal}
            className="mt-3 text-sm font-semibold text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]">
            + Crear la primera épica
          </button>
        </div>
      )}

      {/* Grouped epics with tasks */}
      {!loading && grouped.map(group => (
        <section key={group.status}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
              {EPIC_STATUS_LABEL[group.status]}
            </span>
            <div className="flex-1 h-px bg-[var(--c-line)] ml-1" />
          </div>
          <div className="flex flex-col gap-2">
            {group.items.map(epic => {
              const epicTasks = tasksByEpic(epic.id);
              const doneTasks = epicTasks.filter(t => t.status === 'completada').length;
              const isOpen = expanded.has(epic.id);
              return (
                <div key={epic.id} className="border border-[var(--c-border)] rounded-xl overflow-hidden">
                  {/* Epic header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Expand/collapse toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(epic.id)}
                      className="shrink-0 w-5 h-5 flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none"
                      aria-label={isOpen ? 'Colapsar' : 'Expandir'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                           strokeLinecap="round" strokeLinejoin="round" width={12} height={12}
                           style={{ transform: isOpen ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
                           aria-hidden="true">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>

                    {/* Epic name + desc */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-[var(--c-text)]">{epic.name}</p>
                      {epic.description && (
                        <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5 line-clamp-1">{epic.description}</p>
                      )}
                    </div>

                    {/* Progress */}
                    {epicTasks.length > 0 && (
                      <div className="shrink-0 flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[var(--c-hover)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--c-text)] rounded-full transition-all"
                            style={{ width: `${Math.round((doneTasks / epicTasks.length) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[var(--c-muted)] tabular-nums w-12 text-right">
                          {doneTasks}/{epicTasks.length}
                        </span>
                      </div>
                    )}

                    {/* Epic status badge */}
                    <span className={`shrink-0 text-[11px] border rounded px-2 py-0.5 ${EPIC_STATUS_STYLE[epic.status] ?? ''}`}>
                      {EPIC_STATUS_LABEL[epic.status] ?? epic.status}
                    </span>

                    {/* Add task to this epic */}
                    <button
                      type="button"
                      onClick={() => openTaskForEpic(epic.id)}
                      title="Agregar tarea a esta épica"
                      className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-text)] border border-[var(--c-border)] rounded-md hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                           strokeLinecap="round" strokeLinejoin="round" width={11} height={11} aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>

                  {/* Task list (collapsible) */}
                  {isOpen && (
                    <>
                      {epicTasks.length === 0 ? (
                        <div className="border-t border-[var(--c-line)] px-4 py-3 text-center">
                          <p className="text-[12px] text-[var(--c-muted)]">Sin tareas aún.</p>
                          <button
                            type="button"
                            onClick={() => openTaskForEpic(epic.id)}
                            className="mt-1 text-[12px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]"
                          >
                            + Agregar primera tarea
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Column headers */}
                          <div className="flex items-center gap-3 px-4 py-1.5 bg-[var(--c-hover)] border-t border-[var(--c-line)]">
                            <div className="w-2 shrink-0" />
                            <span className="font-mono text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0">ID</span>
                            <span className="flex-1 text-[10px] text-[var(--c-muted)] uppercase">Título</span>
                            <span className="text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0">Prioridad</span>
                            <div className="w-5 shrink-0" />
                            <span className="text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0 text-right">Vence</span>
                          </div>
                          {epicTasks.map(task => (
                            <EpicTaskRow
                              key={task.id}
                              task={task}
                              onOpen={(id) => dispatch(openDrawer({ taskId: id, projectId: projectCode }))}
                            />
                          ))}
                        </>
                      )}
                      {epicTasks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openTaskForEpic(epic.id)}
                          className="w-full text-left flex items-center gap-2 px-10 py-2 text-[12px] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors border-t border-[var(--c-line)] cursor-pointer bg-transparent font-[inherit]"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                               strokeLinecap="round" strokeLinejoin="round" width={11} height={11} aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Agregar tarea
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Tasks without epic */}
      {!loading && tasksWithoutEpic.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
              Sin épica
            </span>
            <div className="flex-1 h-px bg-[var(--c-line)] ml-1" />
          </div>
          <div className="border border-[var(--c-border)] rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-1.5 bg-[var(--c-hover)]">
              <div className="w-2 shrink-0" />
              <span className="font-mono text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0">ID</span>
              <span className="flex-1 text-[10px] text-[var(--c-muted)] uppercase">Título</span>
              <span className="text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0">Prioridad</span>
              <div className="w-5 shrink-0" />
              <span className="text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0 text-right">Vence</span>
            </div>
            {tasksWithoutEpic.map(task => (
              <EpicTaskRow
                key={task.id}
                task={task}
                onOpen={(id) => dispatch(openDrawer({ taskId: id, projectId: projectCode }))}
              />
            ))}
          </div>
        </section>
      )}

      {/* Create epic modal */}
      <Modal open={epicModalOpen} onClose={() => setEpicModalOpen(false)} title="Nueva épica">
        <form onSubmit={handleCreateEpic} noValidate className="flex flex-col gap-4">
          <Input
            id="ep-name"
            label="Nombre"
            placeholder="Ej. Auth & Onboarding"
            value={epicName}
            onChange={(e) => { setEpicName(e.target.value); if (e.target.value.trim()) setNameError(''); }}
            error={nameError}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            autoComplete="off"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ep-desc" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Descripción (opcional)
            </label>
            <textarea
              id="ep-desc"
              rows={3}
              placeholder="¿En qué consiste esta épica?"
              value={epicDesc}
              onChange={(e) => setEpicDesc(e.target.value)}
              className={`${fieldCls} resize-none`}
            />
          </div>
          {epicSaveError && <p className="text-[0.75rem] text-[var(--c-danger)]">{epicSaveError}</p>}
          <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-[var(--c-border)]">
            <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={() => setEpicModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={epicSaving}>Crear épica</Button>
          </div>
        </form>
      </Modal>

      {/* Create task modal (epic pre-selected) */}
      <TaskCreateModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onCreated={fetchTasks}
        projectCode={code}
        defaultEpicId={taskDefaultEpic}
        epics={epics}
        members={members}
      />
    </div>
  );
}
