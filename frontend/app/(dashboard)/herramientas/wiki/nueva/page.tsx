'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import type { ApiWrapped, EpicItem, WikiPageDetail, WikiPageSummary, WorkspaceSummary, TaskItem } from '@/types/api.types';
import WikiEditor from '@/components/features/wiki/WikiEditor';
import TaskSearchSelect, { type TaskWithProject } from '@/components/features/wiki/TaskSearchSelect';
import SearchSelect from '@/components/ui/SearchSelect';
import EmojiPicker from '@/components/features/wiki/EmojiPicker';

/* ── Shared styles (CreateTaskModal pattern) ─────────────────────── */
const baseCls =
  'w-full pl-3 pr-3 py-[0.55rem] border border-[var(--c-border)] rounded-[0.625rem] ' +
  'text-[13px] font-[inherit] text-[var(--c-text)] bg-[var(--c-bg)] outline-none ' +
  'transition-[border-color,box-shadow] duration-[0.25s] ' +
  'placeholder:text-[var(--c-muted)] ' +
  'focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

const labelCls = 'text-[0.7rem] font-semibold text-[var(--c-text-sub)] tracking-[0.04em] uppercase';

/* ── Field wrapper ──────────────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelCls}>
        {label}{required && <span className="text-[var(--c-danger)] ml-0.5">*</span>}
      </span>
      {children}
    </div>
  );
}

/* ── Link type picker ────────────────────────────────────────────── */
type LinkType = '' | 'tarea' | 'epica' | 'proyecto';
type EpicWithProject = EpicItem & { projectCode: string; projectName: string };

const LINK_TYPES: Array<{ value: Exclude<LinkType, ''>; label: string; icon: ReactNode }> = [
  { value: 'tarea',   label: 'Tarea',    icon: <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg> },
  { value: 'epica',   label: 'Épica',    icon: <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
  { value: 'proyecto',label: 'Proyecto', icon: <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg> },
];

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function NuevaWikiPage() {
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<Record<string, unknown>>({ type: 'doc', content: [] });
  const [parentPageId, setParentPageId] = useState<string>('');
  const [parentPages, setParentPages] = useState<WikiPageSummary[]>([]);
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [projectCode, setProjectCode] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [epicId, setEpicId] = useState<string>('');
  const [linkType, setLinkType] = useState<LinkType>('');
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [allEpics, setAllEpics] = useState<EpicWithProject[]>([]);
  const [epicsLoading, setEpicsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [icon, setIcon] = useState<string>('');

  const allProjects = useMemo(
    () => dedupeByKey(
      workspaces.flatMap(ws => ws.projects.map(p => ({ ...p, workspaceId: ws.id }))),
      (project) => project.code,
    ),
    [workspaces],
  );

  useEffect(() => {
    apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces')
      .then(r => {
        if (r.ok && r.data.length > 0) {
          setWorkspaces(r.data);
          setWorkspaceId(r.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!workspaceId) { setParentPages([]); return; }
    apiGet<ApiWrapped<WikiPageSummary[]>>(`/wiki?workspaceId=${workspaceId}`)
      .then(r => { if (r.ok) setParentPages(r.data); })
      .catch(() => setParentPages([]));
  }, [workspaceId]);

  useEffect(() => {
    if (allProjects.length === 0) {
      setAllTasks([]);
      return;
    }
    setTasksLoading(true);
    Promise.all(
      allProjects.map(p =>
        apiGet<ApiWrapped<TaskItem[]>>(`/tasks?projectCode=${p.code}`)
          .then(r => r.ok ? r.data.map((t): TaskWithProject => ({ ...t, projectCode: p.code, projectName: p.name })) : [])
          .catch(() => []),
      ),
    ).then(results => {
      setAllTasks(dedupeByKey(results.flat(), (task) => task.id));
      setTasksLoading(false);
    });
  }, [allProjects]);

  useEffect(() => {
    if (allProjects.length === 0) {
      setAllEpics([]);
      return;
    }
    setEpicsLoading(true);
    Promise.all(
      allProjects.map(p =>
        apiGet<ApiWrapped<EpicItem[]>>(`/projects/${p.code}/epics`)
          .then(r => r.ok ? r.data.map((e): EpicWithProject => ({ ...e, projectCode: p.code, projectName: p.name })) : [])
          .catch(() => []),
      ),
    ).then(results => {
      setAllEpics(dedupeByKey(results.flat(), (epic) => epic.id));
      setEpicsLoading(false);
    });
  }, [allProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('El título es requerido'); return; }
    if (!workspaceId) { setError('Selecciona un workspace'); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await apiPost<ApiWrapped<WikiPageDetail>>('/wiki', {
        workspaceId,
        title: title.trim(),
        content,
        icon: icon || undefined,
        parentPageId: parentPageId || undefined,
        projectCode: projectCode || undefined,
        taskId: taskId || undefined,
        epicId: epicId || undefined,
      });
      if (res.ok) router.push(`/herramientas/wiki/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la página');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col overflow-hidden">
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--c-border)] shrink-0 bg-[var(--c-bg)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors"
          aria-label="Volver"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-semibold text-[var(--c-text)] flex-1 truncate">Nuevo proceso</span>
        {error && <p className="text-xs text-[var(--c-danger)] truncate max-w-xs">{error}</p>}
        <button
          type="submit"
          disabled={saving || !title.trim() || !workspaceId}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--c-text)] text-[var(--c-bg)] text-sm font-medium rounded-lg hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
        >
          {saving ? 'Creando...' : 'Crear proceso'}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* Left meta panel */}
        <aside className="w-60 md:w-64 shrink-0 border-r border-[var(--c-border)] overflow-y-auto p-4 space-y-4 bg-[var(--c-bg)]">

          <Field label="Workspace" required>
            <SearchSelect
              options={workspaces.map(ws => ({ value: ws.id, label: ws.name }))}
              value={workspaceId}
              onChange={v => setWorkspaceId(v)}
              placeholder="Selecciona workspace..."
              noneLabel="— ninguno —"
              searchPlaceholder="Buscar workspace..."
            />
          </Field>

          <Field label="Título" required>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del proceso"
              required
              autoFocus
              className={baseCls}
            />
          </Field>

          <Field label="Icono">
            <EmojiPicker value={icon} onChange={setIcon} />
          </Field>

          <Field label="Proceso padre">
            <SearchSelect
              options={parentPages.map(p => ({ value: p.id, label: p.title }))}
              value={parentPageId}
              onChange={v => setParentPageId(v)}
              placeholder="— ninguno (raíz) —"
              noneLabel="— ninguno (raíz) —"
              searchPlaceholder="Buscar proceso padre..."
              disabled={!workspaceId || parentPages.length === 0}
            />
          </Field>

          <hr className="border-[var(--c-border)]" />

          {/* Relations — collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setRelationsOpen(o => !o)}
              className="flex items-center justify-between w-full"
            >
              <span className={labelCls}>Vincular a</span>
              <svg
                viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
                className={`transition-transform text-[var(--c-text-sub)] ${relationsOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {relationsOpen && (
              <div className="mt-3 space-y-3">
                {/* Type picker pills */}
                <div className="flex flex-wrap gap-1.5">
                  {LINK_TYPES.map(lt => (
                    <button
                      key={lt.value}
                      type="button"
                      onClick={() => {
                        const next: LinkType = linkType === lt.value ? '' : lt.value;
                        setLinkType(next);
                        if (next !== 'tarea') setTaskId('');
                        if (next !== 'epica') setEpicId('');
                        if (next !== 'proyecto') setProjectCode('');
                      }}
                      className={[
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
                        linkType === lt.value
                          ? 'bg-[var(--c-text)] text-[var(--c-bg)] border-[var(--c-text)]'
                          : 'text-[var(--c-text-sub)] border-[var(--c-border)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)]',
                      ].join(' ')}
                    >
                      {lt.icon}
                      {lt.label}
                    </button>
                  ))}
                </div>

                {linkType === 'tarea' && (
                  <Field label="Tarea">
                    <TaskSearchSelect
                      tasks={allTasks}
                      value={taskId}
                      onChange={(tId, task) => {
                        setTaskId(tId);
                        if (task) setProjectCode(task.projectCode);
                      }}
                      loading={tasksLoading}
                    />
                  </Field>
                )}

                {linkType === 'epica' && (
                  <Field label="Épica">
                    <SearchSelect
                      options={allEpics.map(e => ({ value: e.id, label: e.name, subLabel: e.projectName, colorKey: e.projectCode }))}
                      value={epicId}
                      onChange={v => setEpicId(v)}
                      loading={epicsLoading}
                      noneLabel="— ninguna —"
                      searchPlaceholder="Buscar épica..."
                    />
                  </Field>
                )}

                {linkType === 'proyecto' && (
                  <Field label="Proyecto">
                    <SearchSelect
                      options={allProjects.map(p => ({ value: p.code, label: p.name }))}
                      value={projectCode}
                      onChange={v => setProjectCode(v)}
                      noneLabel="— ninguno —"
                      searchPlaceholder="Buscar proyecto..."
                    />
                  </Field>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right: rich text editor with toolbar */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-3">
          <WikiEditor
            content={content}
            onChange={setContent}
            placeholder="Describe el proceso aquí..."
            title={title || undefined}
            icon={icon || undefined}
          />
        </div>

      </div>
    </form>
  );
}

