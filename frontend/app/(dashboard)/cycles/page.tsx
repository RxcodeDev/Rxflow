'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { CycleSummary, ProjectSummary, TaskItem, ApiWrapped } from '@/types/api.types';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useUIDispatch, useUIState } from '@/store/UIContext';
import { openDrawer } from '@/store/slices/uiSlice';
import { playSuccess, playDelete } from '@/hooks/useSound';

type EpicItem = { id: string; name: string; status: string };

const STATUS_ORDER = ['activo', 'planificado', 'completado'] as const;
const STATUS_LABEL: Record<string, string> = { activo: 'Activo', planificado: 'Planificado', completado: 'Completado' };
const STATUS_STYLE: Record<string, string> = {
  activo:      'text-[var(--c-text)] border-[var(--c-text)]',
  completado:  'text-[var(--c-text-sub)] border-[var(--c-border)]',
  planificado: 'text-[var(--c-muted)] border-[var(--c-border)]',
};

function formatDate(raw: string | null): string {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

export default function CyclesPage() {
  const [cycles,  setCycles]  = useState<CycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cycleTasks, setCycleTasks] = useState<Record<string, TaskItem[]>>({});
  const [tasksLoading, setTasksLoading] = useState<Record<string, boolean>>({});
  const dispatch = useUIDispatch();
  const { tasksVersion } = useUIState();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [projects,  setProjects]  = useState<ProjectSummary[]>([]);
  const [form, setForm] = useState({ project_code: '', name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Manage tasks modal
  const [manageId,       setManageId]       = useState<string | null>(null);
  const [manageTab,      setManageTab]       = useState<'tasks' | 'epics'>('tasks');
  const [allProjTasks,   setAllProjTasks]    = useState<TaskItem[]>([]);
  const [projEpics,      setProjEpics]       = useState<EpicItem[]>([]);
  const [taskSearch,     setTaskSearch]      = useState('');
  const [pendingRemove,  setPendingRemove]   = useState<{ cycleId: string; taskId: string } | null>(null);

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
    setForm({ project_code: '', name: '', start_date: '', end_date: '' });
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

  const groups = useMemo(() =>
    STATUS_ORDER
      .map((s) => ({ status: s, cycles: cycles.filter((c) => c.status === s) }))
      .filter((g) => g.cycles.length > 0),
  [cycles]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--c-text)]">Cycles</h1>
        <button
          type="button"
          onClick={openModal}
          className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-3 py-2 bg-transparent hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit]"
        >
          + Nuevo cycle
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      )}

      {!loading && cycles.length === 0 && (
        <p className="text-sm text-[var(--c-muted)] py-8 text-center">No hay cycles. Crea el primero desde un proyecto.</p>
      )}

      {!loading && groups.map((group) => (
        <section key={group.status}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
              {STATUS_LABEL[group.status]}
            </span>
            <div className="flex-1 h-px bg-[var(--c-line)] ml-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.cycles.map((c) => {
              const pct = c.tasks_total > 0 ? Math.round((c.tasks_done / c.tasks_total) * 100) : 0;
              const isExpanded = expandedId === c.id;
              const tasks = cycleTasks[c.id] ?? [];
              const loadingTasks = tasksLoading[c.id];
              return (
                <div key={c.id} className="border border-[var(--c-border)] rounded-xl overflow-hidden">
                  {/* Card header — clickable to expand */}
                  <div
                    className="p-4 hover:bg-[var(--c-hover)] transition-colors cursor-pointer"
                    onClick={() => toggleCycle(c.id)}
                    role="button"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-[3px] px-1.5 py-0.5 shrink-0">{c.project_code}</span>
                          <span className="font-semibold text-sm text-[var(--c-text)]">{c.name}</span>
                        </div>
                        <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5">{c.project_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] border rounded px-2 py-0.5 ${STATUS_STYLE[c.status] ?? ''}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" aria-hidden="true"
                          className={`text-[var(--c-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-[12px] text-[var(--c-muted)] mt-2">
                      {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      {c.days_left !== null && c.status === 'activo' && (
                        <span className="ml-2 text-[var(--c-text-sub)] font-medium">· {c.days_left} días restantes</span>
                      )}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1 rounded-sm bg-[var(--c-border)] overflow-hidden">
                        <div className="h-full bg-[var(--c-text)] rounded-sm" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-[var(--c-text-sub)] tabular-nums shrink-0">{c.tasks_done}/{c.tasks_total}</span>
                      <span className="text-[11px] text-[var(--c-muted)] shrink-0">{pct}%</span>
                    </div>
                    {c.scope_pct < 100 && (
                      <p className="text-[11px] text-[var(--c-muted)] mt-1.5">Alcance intacto: {c.scope_pct}%</p>
                    )}
                  </div>

                  {/* Tasks list — shown when expanded */}
                  {isExpanded && (
                    <div className="border-t border-[var(--c-border)] bg-[var(--c-hover)]">
                      {loadingTasks ? (
                        <div className="flex flex-col gap-2 p-3">
                          {[1,2,3].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}
                        </div>
                      ) : tasks.length === 0 ? (
                        <p className="text-[12px] text-[var(--c-muted)] px-4 py-3">Sin tareas en este ciclo</p>
                      ) : (
                        <ul className="divide-y divide-[var(--c-line)]">
                          {tasks.map(t => (
                            <li key={t.id} className="flex items-center group">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dispatch(openDrawer({ taskId: t.id, projectId: c.project_code }));
                                }}
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
                                onClick={(e) => { e.stopPropagation(); setPendingRemove({ cycleId: c.id, taskId: t.id }); }}
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
                          onClick={(e) => { e.stopPropagation(); openManage(c); }}
                          className="text-[12px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors bg-transparent border-none cursor-pointer font-[inherit]"
                        >
                          + Agregar tareas o épicas
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <Modal open={!!manageId} onClose={() => setManageId(null)} title="Gestionar tareas del cycle">
        {manageId && (() => {
          const cycle = cycles.find(c => c.id === manageId);
          const inCycle = new Set((cycleTasks[manageId] ?? []).map(t => t.id));
          const available = allProjTasks.filter(t => !inCycle.has(t.id));
          const searchLow = taskSearch.toLowerCase();
          const filtered = available.filter(t =>
            t.title.toLowerCase().includes(searchLow) ||
            t.identifier.toLowerCase().includes(searchLow),
          );
          return (
            <div className="flex flex-col gap-3">
              {/* Tabs */}
              <div className="flex gap-1 border-b border-[var(--c-border)] pb-0">
                {(['tasks', 'epics'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setManageTab(tab)}
                    className={`text-[13px] px-3 py-1.5 border-b-2 -mb-px transition-colors bg-transparent border-x-0 border-t-0 cursor-pointer font-[inherit] ${
                      manageTab === tab
                        ? 'border-b-[var(--c-text)] text-[var(--c-text)] font-semibold'
                        : 'border-b-transparent text-[var(--c-text-sub)]'
                    }`}
                  >
                    {tab === 'tasks' ? 'Tareas individuales' : 'Por épica'}
                  </button>
                ))}
              </div>

              {manageTab === 'tasks' && (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Buscar tarea..."
                    value={taskSearch}
                    onChange={e => setTaskSearch(e.target.value)}
                    className="w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
                  />
                  {filtered.length === 0 ? (
                    <p className="text-[13px] text-[var(--c-muted)] py-2 text-center">
                      {available.length === 0 ? 'Todas las tareas del proyecto ya están en este cycle' : 'Sin resultados'}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                      {filtered.map(t => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => addTaskToCycle(manageId, t)}
                            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--c-hover)] transition-colors font-[inherit] bg-transparent border border-[var(--c-border)] cursor-pointer"
                          >
                            <span className="text-[11px] font-mono text-[var(--c-muted)] shrink-0">{t.identifier}</span>
                            <span className="flex-1 text-[13px] text-[var(--c-text)] truncate">{t.title}</span>
                            {t.epic_name && (
                              <span className="text-[10px] text-[var(--c-text-sub)] border border-[var(--c-border)] rounded px-1.5 py-0.5 shrink-0">{t.epic_name}</span>
                            )}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-[var(--c-text-sub)]">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {manageTab === 'epics' && (
                <div className="flex flex-col gap-2">
                  {projEpics.length === 0 ? (
                    <p className="text-[13px] text-[var(--c-muted)] py-2 text-center">No hay épicas activas en este proyecto</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {projEpics.map(ep => (
                        <li key={ep.id}>
                          <button
                            type="button"
                            onClick={() => cycle && addEpicToCycle(manageId, ep.id, cycle.project_code)}
                            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--c-hover)] border border-[var(--c-border)] transition-colors font-[inherit] bg-transparent cursor-pointer"
                          >
                            <span className="flex-1 text-[13px] font-medium text-[var(--c-text)]">{ep.name}</span>
                            <span className="text-[11px] text-[var(--c-text-sub)]">Agregar todas sus tareas</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
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

          {formError && (
            <p className="text-xs text-[var(--c-danger)]">{formError}</p>
          )}

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
    </div>
  );
}
