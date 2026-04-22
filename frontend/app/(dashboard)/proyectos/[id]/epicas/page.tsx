'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { ProjectSummary, EpicItem, TaskItem, ApiWrapped } from '@/types/api.types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { playSuccess } from '@/hooks/useSound';
import ProjectViewTabs from '@/components/features/projects/ProjectViewTabs';
import TaskCreateModal from '@/components/features/projects/TaskCreateModal';
import { useUIDispatch, useUIState } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';
import { PRIORITY_STYLE } from '@/components/features/projects/projectShared';

/* ── Helpers ─────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

export const EPIC_STATUS_LABEL: Record<string, string> = {
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

/* ── Returns all descendant IDs of an epic ───────────── */
function getDescendantIds(epicId: string, allEpics: EpicItem[]): Set<string> {
  const result = new Set<string>();
  const queue = [epicId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const e of allEpics) {
      if (e.parent_epic_id === current && !result.has(e.id)) {
        result.add(e.id);
        queue.push(e.id);
      }
    }
  }
  return result;
}

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
        <div className="w-5 h-5 rounded-full bg-[var(--c-avatar-bg,#eee)] text-[var(--c-avatar-fg,#333)] text-[9px] font-semibold flex items-center justify-center shrink-0">
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

/* ── Epic card (recursive — supports children) ────────── */
interface EpicCardProps {
  epic: EpicItem;
  allEpics: EpicItem[];
  tasks: TaskItem[];
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddTask: (epicId: string) => void;
  onEditEpic: (epic: EpicItem) => void;
  onOpenTask: (taskId: string) => void;
  projectCode: string;
  depth?: number;
}

function EpicCard({
  epic, allEpics, tasks, expanded,
  onToggleExpand, onAddTask, onEditEpic, onOpenTask,
  projectCode: _projectCode, depth = 0,
}: EpicCardProps) {
  const children  = allEpics.filter(e => e.parent_epic_id === epic.id);
  const epicTasks = tasks.filter(t => t.epic_id === epic.id);
  const doneTasks = epicTasks.filter(t => t.status === 'completada').length;
  const isOpen    = expanded.has(epic.id);

  return (
    <div
      className="border border-[var(--c-border)] rounded-xl overflow-hidden"
      style={depth > 0 ? { marginLeft: `${depth * 1.5}rem` } : undefined}
    >
      {/* Epic header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Expand/collapse */}
        <button
          type="button"
          onClick={() => onToggleExpand(epic.id)}
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

        {/* Name + breadcrumb */}
        <div className="min-w-0 flex-1">
          {depth > 0 && epic.parent_epic_name && (
            <p className="text-[10px] text-[var(--c-muted)] mb-0.5 flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                   strokeLinecap="round" strokeLinejoin="round" width={10} height={10} aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {epic.parent_epic_name}
            </p>
          )}
          <p className="font-semibold text-sm text-[var(--c-text)]">{epic.name}</p>
          {epic.description && (
            <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5 line-clamp-1">{epic.description}</p>
          )}
          {children.length > 0 && (
            <p className="text-[10px] text-[var(--c-muted)] mt-0.5">
              {children.length} sub-épica{children.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Progress bar */}
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

        {/* Status badge */}
        <span className={`shrink-0 text-[11px] border rounded px-2 py-0.5 ${EPIC_STATUS_STYLE[epic.status] ?? ''}`}>
          {EPIC_STATUS_LABEL[epic.status] ?? epic.status}
        </span>

        {/* Edit */}
        <button
          type="button"
          onClick={() => onEditEpic(epic)}
          title="Editar épica"
          className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-text)] border border-[var(--c-border)] rounded-md hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent"
          aria-label="Editar épica"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round" width={11} height={11} aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {/* Add task */}
        <button
          type="button"
          onClick={() => onAddTask(epic.id)}
          title="Agregar tarea a esta épica"
          className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-text)] border border-[var(--c-border)] rounded-md hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent"
          aria-label="Agregar tarea"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
               strokeLinecap="round" strokeLinejoin="round" width={11} height={11} aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Expanded content */}
      {isOpen && (
        <>
          {epicTasks.length === 0 && children.length === 0 ? (
            <div className="border-t border-[var(--c-line)] px-4 py-3 text-center">
              <p className="text-[12px] text-[var(--c-muted)]">Sin tareas aún.</p>
              <button
                type="button"
                onClick={() => onAddTask(epic.id)}
                className="mt-1 text-[12px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]"
              >
                + Agregar primera tarea
              </button>
            </div>
          ) : (
            <>
              {epicTasks.length > 0 && (
                <>
                  <div className="flex items-center gap-3 px-4 py-1.5 bg-[var(--c-hover)] border-t border-[var(--c-line)]">
                    <div className="w-2 shrink-0" />
                    <span className="font-mono text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0">ID</span>
                    <span className="flex-1 text-[10px] text-[var(--c-muted)] uppercase">Título</span>
                    <span className="text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0">Prioridad</span>
                    <div className="w-5 shrink-0" />
                    <span className="text-[10px] text-[var(--c-muted)] uppercase w-14 shrink-0 text-right">Vence</span>
                  </div>
                  {epicTasks.map(task => (
                    <EpicTaskRow key={task.id} task={task} onOpen={onOpenTask} />
                  ))}
                  <button
                    type="button"
                    onClick={() => onAddTask(epic.id)}
                    className="w-full text-left flex items-center gap-2 px-10 py-2 text-[12px] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors border-t border-[var(--c-line)] cursor-pointer bg-transparent font-[inherit]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                         strokeLinecap="round" strokeLinejoin="round" width={11} height={11} aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Agregar tarea
                  </button>
                </>
              )}

              {/* Sub-epics */}
              {children.length > 0 && (
                <div className="border-t border-[var(--c-line)] p-3 flex flex-col gap-2 bg-[var(--c-hover)]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)] px-1 mb-1">
                    Sub-épicas
                  </p>
                  {children.map(child => (
                    <EpicCard
                      key={child.id}
                      epic={child}
                      allEpics={allEpics}
                      tasks={tasks}
                      expanded={expanded}
                      onToggleExpand={onToggleExpand}
                      onAddTask={onAddTask}
                      onEditEpic={onEditEpic}
                      onOpenTask={onOpenTask}
                      projectCode={_projectCode}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function EpicasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectCode } = use(params);
  const code = projectCode.toUpperCase();
  const dispatch = useUIDispatch();
  const { tasksVersion } = useUIState();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [epics,   setEpics]   = useState<EpicItem[]>([]);
  const [tasks,   setTasks]   = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; initials: string }[]>([]);
  const [loading, setLoading] = useState(true);

  /* Expanded state */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /* ── Create epic modal ── */
  const [epicModalOpen,  setEpicModalOpen]  = useState(false);
  const [epicName,       setEpicName]       = useState('');
  const [nameError,      setNameError]      = useState('');
  const [epicDesc,       setEpicDesc]       = useState('');
  const [epicParentId,   setEpicParentId]   = useState('');
  const [epicChildIds,   setEpicChildIds]   = useState<Set<string>>(new Set());
  const [epicSaving,     setEpicSaving]     = useState(false);
  const [epicSaveError,  setEpicSaveError]  = useState('');

  /* ── Edit epic modal ── */
  const [editingEpic,    setEditingEpic]    = useState<EpicItem | null>(null);
  const [editName,       setEditName]       = useState('');
  const [editNameError,  setEditNameError]  = useState('');
  const [editDesc,       setEditDesc]       = useState('');
  const [editStatus,     setEditStatus]     = useState('activa');
  const [editParentId,   setEditParentId]   = useState('');
  const [editChildIds,   setEditChildIds]   = useState<Set<string>>(new Set());
  const [editSaving,     setEditSaving]     = useState(false);
  const [editSaveError,  setEditSaveError]  = useState('');

  /* ── Create task modal ── */
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
        const firstActive = eRes.data.filter(e => e.status === 'activa' && !e.parent_epic_id).slice(0, 3);
        setExpanded(new Set(firstActive.map(e => e.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code, tasksVersion]);

  /* ── Create epic handlers ── */
  function openEpicModal(defaultParentId = '') {
    setEpicName(''); setEpicDesc(''); setNameError('');
    setEpicSaveError(''); setEpicParentId(defaultParentId);
    setEpicChildIds(new Set());
    setEpicModalOpen(true);
  }

  function toggleCreateChild(id: string) {
    setEpicChildIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
        parent_epic_id: epicParentId || null,
      });
      const newEpic = res.data;
      // Assign selected children
      const patched = await Promise.all(
        [...epicChildIds].map(childId =>
          apiPatch<ApiWrapped<EpicItem>>(`/projects/${code}/epics/${childId}`, {
            parent_epic_id: newEpic.id,
          }).then(r => r.data),
        ),
      );
      setEpics(prev => {
        const updated = prev.map(ep => {
          const p = patched.find(x => x.id === ep.id);
          return p ?? ep;
        });
        return [...updated, newEpic];
      });
      setExpanded(prev => new Set([...prev, newEpic.id]));
      playSuccess();
      setEpicModalOpen(false);
    } catch (err) {
      setEpicSaveError(err instanceof Error ? err.message : 'Error al crear la épica');
    } finally {
      setEpicSaving(false);
    }
  }

  /* ── Edit epic handlers ── */
  function openEditModal(epic: EpicItem) {
    setEditingEpic(epic);
    setEditName(epic.name);
    setEditDesc(epic.description ?? '');
    setEditStatus(epic.status);
    setEditParentId(epic.parent_epic_id ?? '');
    setEditChildIds(new Set(epics.filter(e => e.parent_epic_id === epic.id).map(e => e.id)));
    setEditNameError('');
    setEditSaveError('');
  }

  function toggleEditChild(id: string) {
    setEditChildIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleUpdateEpic(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) { setEditNameError('El nombre es requerido'); return; }
    if (!editingEpic) return;
    setEditSaving(true);
    setEditSaveError('');
    try {
      // Save main epic
      const res = await apiPatch<ApiWrapped<EpicItem>>(
        `/projects/${code}/epics/${editingEpic.id}`,
        {
          name:           editName.trim(),
          description:    editDesc.trim() || null,
          status:         editStatus,
          parent_epic_id: editParentId || null,
        },
      );
      // Compute child diff
      const prevChildren = new Set(epics.filter(e => e.parent_epic_id === editingEpic.id).map(e => e.id));
      const toAdd    = [...editChildIds].filter(id => !prevChildren.has(id));
      const toRemove = [...prevChildren].filter(id => !editChildIds.has(id));
      const childPatches = await Promise.all([
        ...toAdd.map(id    => apiPatch<ApiWrapped<EpicItem>>(`/projects/${code}/epics/${id}`, { parent_epic_id: editingEpic.id }).then(r => r.data)),
        ...toRemove.map(id => apiPatch<ApiWrapped<EpicItem>>(`/projects/${code}/epics/${id}`, { parent_epic_id: null }).then(r => r.data)),
      ]);
      setEpics(prev => prev.map(ep => {
        if (ep.id === editingEpic.id) return res.data;
        const p = childPatches.find(x => x.id === ep.id);
        return p ?? ep;
      }));
      playSuccess();
      setEditingEpic(null);
    } catch (err) {
      setEditSaveError(err instanceof Error ? err.message : 'Error al guardar la épica');
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Task modal ── */
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

  /* ── Derived data ── */
  const rootEpics = epics.filter(e => !e.parent_epic_id);
  const grouped   = EPIC_STATUS_ORDER
    .map(s => ({ status: s, items: rootEpics.filter(e => e.status === s) }))
    .filter(g => g.items.length > 0);
  const tasksWithoutEpic = tasks.filter(t => !t.epic_id);

  /* Valid parent options (excludes self + descendants) */
  const parentOptions = (excludeId?: string) => {
    if (!excludeId) return epics;
    const descendants = getDescendantIds(excludeId, epics);
    return epics.filter(e => e.id !== excludeId && !descendants.has(e.id));
  };

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
            {loading
              ? <Skeleton className="w-24 h-4 inline-block" />
              : `${epics.length} épica${epics.length !== 1 ? 's' : ''} · ${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProjectViewTabs projectCode={projectCode} active="epicas" />
          <button
            type="button"
            onClick={() => openEpicModal()}
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
          <button
            type="button"
            onClick={() => openEpicModal()}
            className="mt-3 text-sm font-semibold text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]"
          >
            + Crear la primera épica
          </button>
        </div>
      )}

      {/* Grouped root epics */}
      {!loading && grouped.map(group => (
        <section key={group.status}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
              {EPIC_STATUS_LABEL[group.status]}
            </span>
            <div className="flex-1 h-px bg-[var(--c-line)] ml-1" />
          </div>
          <div className="flex flex-col gap-2">
            {group.items.map(epic => (
              <EpicCard
                key={epic.id}
                epic={epic}
                allEpics={epics}
                tasks={tasks}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onAddTask={openTaskForEpic}
                onEditEpic={openEditModal}
                onOpenTask={(id) => dispatch(openDrawer({ taskId: id, projectId: projectCode }))}
                projectCode={projectCode}
              />
            ))}
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

      {/* ── Create epic modal ───────────────────────────── */}
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
          {/* Parent epic selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ep-parent" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Épica padre (opcional)
            </label>
            <select
              id="ep-parent"
              value={epicParentId}
              onChange={(e) => setEpicParentId(e.target.value)}
              className={fieldCls}
            >
              <option value="">— Sin épica padre —</option>
              {epics.map(ep => (
                <option key={ep.id} value={ep.id}>{ep.name}</option>
              ))}
            </select>
          </div>
          {/* Child epics picker */}
          {epics.filter(e => !e.parent_epic_id).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
                Épicas hijas (opcional)
              </span>
              <p className="text-[11px] text-[var(--c-muted)] -mt-0.5">
                Estas épicas quedarán como sub-épicas de la nueva.
              </p>
              <div className="max-h-36 overflow-y-auto border border-[var(--c-border)] rounded-lg divide-y divide-[var(--c-line)]">
                {epics.filter(e => !e.parent_epic_id).map(ep => (
                  <label
                    key={ep.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--c-hover)] cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={epicChildIds.has(ep.id)}
                      onChange={() => toggleCreateChild(ep.id)}
                      className="w-3.5 h-3.5 accent-[var(--c-text)] cursor-pointer shrink-0"
                    />
                    <span className="text-[13px] text-[var(--c-text)] truncate">{ep.name}</span>
                    <span className={`ml-auto text-[10px] border rounded px-1.5 py-0.5 shrink-0 ${EPIC_STATUS_STYLE[ep.status] ?? ''}`}>
                      {EPIC_STATUS_LABEL[ep.status] ?? ep.status}
                    </span>
                  </label>
                ))}
              </div>
              {epicChildIds.size > 0 && (
                <p className="text-[11px] text-[var(--c-text-sub)]">
                  {epicChildIds.size} épica{epicChildIds.size !== 1 ? 's' : ''} seleccionada{epicChildIds.size !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
          {epicSaveError && <p className="text-[0.75rem] text-[var(--c-danger)]">{epicSaveError}</p>}
          <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-[var(--c-border)]">
            <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={() => setEpicModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={epicSaving}>Crear épica</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit epic modal ─────────────────────────────── */}
      <Modal open={!!editingEpic} onClose={() => setEditingEpic(null)} title="Editar épica">
        <form onSubmit={handleUpdateEpic} noValidate className="flex flex-col gap-4">
          <Input
            id="edit-ep-name"
            label="Nombre"
            placeholder="Nombre de la épica"
            value={editName}
            onChange={(e) => { setEditName(e.target.value); if (e.target.value.trim()) setEditNameError(''); }}
            error={editNameError}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            autoComplete="off"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-ep-desc" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Descripción (opcional)
            </label>
            <textarea
              id="edit-ep-desc"
              rows={3}
              placeholder="¿En qué consiste esta épica?"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className={`${fieldCls} resize-none`}
            />
          </div>
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-ep-status" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Estado
            </label>
            <select
              id="edit-ep-status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className={fieldCls}
            >
              <option value="activa">Activa</option>
              <option value="completada">Completada</option>
              <option value="archivada">Archivada</option>
            </select>
          </div>
          {/* Parent epic */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-ep-parent" className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
              Épica padre (opcional)
            </label>
            <select
              id="edit-ep-parent"
              value={editParentId}
              onChange={(e) => setEditParentId(e.target.value)}
              className={fieldCls}
            >
              <option value="">— Sin épica padre —</option>
              {editingEpic && parentOptions(editingEpic.id).map(ep => (
                <option key={ep.id} value={ep.id}>{ep.name}</option>
              ))}
            </select>
            {editingEpic && epics.filter(e => e.parent_epic_id === editingEpic.id).length > 0 && (
              <p className="text-[11px] text-[var(--c-muted)]">
                Esta épica tiene sub-épicas. Asignarle un padre la convierte en sub-épica de otro nivel.
              </p>
            )}
          </div>
          {/* Child epics picker */}
          {editingEpic && (() => {
            // Epics eligible to be children: no parent OR already a child of this epic
            const eligible = epics.filter(e =>
              e.id !== editingEpic.id &&
              !getDescendantIds(editingEpic.id, epics).has(e.id) &&
              (e.parent_epic_id === null || e.parent_epic_id === editingEpic.id),
            );
            if (eligible.length === 0) return null;
            return (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]">
                  Épicas hijas
                </span>
                <p className="text-[11px] text-[var(--c-muted)] -mt-0.5">
                  Marca las épicas que serán sub-épicas de esta.
                </p>
                <div className="max-h-36 overflow-y-auto border border-[var(--c-border)] rounded-lg divide-y divide-[var(--c-line)]">
                  {eligible.map(ep => (
                    <label
                      key={ep.id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--c-hover)] cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={editChildIds.has(ep.id)}
                        onChange={() => toggleEditChild(ep.id)}
                        className="w-3.5 h-3.5 accent-[var(--c-text)] cursor-pointer shrink-0"
                      />
                      <span className="text-[13px] text-[var(--c-text)] truncate">{ep.name}</span>
                      <span className={`ml-auto text-[10px] border rounded px-1.5 py-0.5 shrink-0 ${EPIC_STATUS_STYLE[ep.status] ?? ''}`}>
                        {EPIC_STATUS_LABEL[ep.status] ?? ep.status}
                      </span>
                    </label>
                  ))}
                </div>
                {editChildIds.size > 0 && (
                  <p className="text-[11px] text-[var(--c-text-sub)]">
                    {editChildIds.size} épica{editChildIds.size !== 1 ? 's' : ''} seleccionada{editChildIds.size !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            );
          })()}
          {editSaveError && <p className="text-[0.75rem] text-[var(--c-danger)]">{editSaveError}</p>}
          <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-[var(--c-border)]">
            <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={() => setEditingEpic(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={editSaving}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* ── Create task modal ───────────────────────────── */}
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
