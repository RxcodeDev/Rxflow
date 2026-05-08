'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import type { ApiWrapped, WikiPageDetail, WikiPageSummary, WorkspaceSummary, TaskItem } from '@/types/api.types';
import WikiEditor from '@/components/features/wiki/WikiEditor';
import TaskSearchSelect, { type TaskWithProject } from '@/components/features/wiki/TaskSearchSelect';

/* ── Shared styles (CreateTaskModal pattern) ─────────────────────── */
const baseCls =
  'w-full pl-3 pr-3 py-[0.55rem] border border-[var(--c-border)] rounded-[0.625rem] ' +
  'text-[13px] font-[inherit] text-[var(--c-text)] bg-[var(--c-bg)] outline-none ' +
  'transition-[border-color,box-shadow] duration-[0.25s] ' +
  'placeholder:text-[var(--c-muted)] ' +
  'focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

const selectCls = baseCls + ' pr-8 appearance-none cursor-pointer';
const labelCls = 'text-[0.7rem] font-semibold text-[var(--c-text-sub)] tracking-[0.04em] uppercase';

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

function NativeSelect({
  value, onChange, disabled, children,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={selectCls + (disabled ? ' opacity-50 cursor-not-allowed' : '')}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </span>
    </div>
  );
}
export default function EditarWikiPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [originalPage, setOriginalPage] = useState<WikiPageDetail | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<Record<string, unknown>>({ type: 'doc', content: [] });
  const [parentPageId, setParentPageId] = useState<string>('');
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [parentPages, setParentPages] = useState<WikiPageSummary[]>([]);
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [projectCode, setProjectCode] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProjects = useMemo(
    () => workspaces.flatMap(ws => ws.projects.map(p => ({ ...p, workspaceId: ws.id }))),
    [workspaces],
  );

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGet<ApiWrapped<WikiPageDetail>>(`/wiki/${id}`),
      apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces'),
    ])
      .then(([pageRes, wsRes]) => {
        if (!pageRes.ok) { router.replace('/herramientas/wiki'); return; }
        const p = pageRes.data;
        setOriginalPage(p);
        setTitle(p.title);
        setContent(p.content as Record<string, unknown>);
        setParentPageId(p.parent_page_id ?? '');
        setWorkspaceId(p.workspace_id);
        setProjectCode(p.project_code ?? '');
        setTaskId(p.task_id ?? '');
        if (p.project_code || p.task_id) setRelationsOpen(true);
        if (wsRes.ok) setWorkspaces(wsRes.data);
      })
      .catch(() => router.replace('/herramientas/wiki'))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!workspaceId) { setParentPages([]); return; }
    apiGet<ApiWrapped<WikiPageSummary[]>>(`/wiki?workspaceId=${workspaceId}`)
      .then(r => { if (r.ok) setParentPages(r.data.filter(p => p.id !== id)); })
      .catch(() => setParentPages([]));
  }, [workspaceId, id]);

  useEffect(() => {
    if (allProjects.length === 0) return;
    setTasksLoading(true);
    Promise.all(
      allProjects.map(p =>
        apiGet<ApiWrapped<TaskItem[]>>(`/tasks?projectCode=${p.code}`)
          .then(r => r.ok ? r.data.map((t): TaskWithProject => ({ ...t, projectCode: p.code, projectName: p.name })) : [])
          .catch(() => []),

      ),
    ).then(results => {
      setAllTasks(results.flat());
      setTasksLoading(false);
    });
  }, [allProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('El título es requerido'); return; }
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/wiki/${id}`, {
        title: title.trim(),
        content,
        parentPageId: parentPageId || null,
        projectCode: projectCode || null,
        taskId: taskId || null,
      });
      router.push(`/herramientas/wiki/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="space-y-3 w-full max-w-md px-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-[var(--c-hover)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!originalPage) return null;

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
        <span className="font-semibold text-[var(--c-text)] flex-1 truncate">Editar proceso</span>
        {error && <p className="text-xs text-[var(--c-danger)] truncate max-w-xs">{error}</p>}
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--c-text)] text-[var(--c-bg)] text-sm font-medium rounded-lg hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* Left meta panel */}
        <aside className="w-60 md:w-64 shrink-0 border-r border-[var(--c-border)] overflow-y-auto p-4 space-y-4 bg-[var(--c-bg)]">

          <Field label="Workspace">
            <NativeSelect value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Título" required>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del proceso"
              required
              className={baseCls}
            />
          </Field>

          <Field label="Proceso padre">
            <NativeSelect
              value={parentPageId}
              onChange={e => setParentPageId(e.target.value)}
              disabled={parentPages.length === 0}
            >
              <option value="">— ninguno (raíz) —</option>
              {parentPages.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </NativeSelect>
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
                <Field label="Tarea">
                  <TaskSearchSelect
                    tasks={allTasks}
                    value={taskId}
                    onChange={(id, task) => {
                      setTaskId(id);
                      if (task) setProjectCode(task.projectCode);
                    }}
                    loading={tasksLoading}
                  />
                </Field>

                <Field label="Proyecto">
                  <NativeSelect
                    value={projectCode}
                    onChange={e => { setProjectCode(e.target.value); setTaskId(''); }}
                  >
                    <option value="">— ninguno —</option>
                    {allProjects.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </NativeSelect>
                </Field>
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
          />
        </div>

      </div>
    </form>
  );
}

