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
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        if (r.ok) setWorkspaces(r.data);
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

  /* ── Shared config fields (used in both sidebar and bottom sheet) ── */
  const configFields = (
    <div className="space-y-5">
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

      <div className="border-t border-[var(--c-line)] pt-4">
        <button
          type="button"
          onClick={() => setRelationsOpen(o => !o)}
          className="flex items-center justify-between w-full mb-3"
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
          <div className="space-y-3">
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
                  {lt.icon}{lt.label}
                </button>
              ))}
            </div>

            {linkType === 'tarea' && (
              <Field label="Tarea">
                <TaskSearchSelect
                  tasks={allTasks}
                  value={taskId}
                  onChange={(tId, task) => { setTaskId(tId); if (task) setProjectCode(task.projectCode); }}
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
    </div>
  );

  return (
    <>
      <form id="wiki-form" onSubmit={handleSubmit} className="h-full flex flex-col overflow-hidden bg-[var(--c-bg)]">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-[var(--c-border)] bg-[var(--c-bg)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-colors"
            aria-label="Volver"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-[var(--c-text)] text-[15px] leading-none truncate">Nuevo proceso</p>
            <p className="text-[11px] text-[var(--c-muted)] mt-0.5 truncate">
              {workspaces.find(ws => ws.id === workspaceId)?.name ?? 'Sin workspace'}
            </p>
          </div>

          {error && <p className="hidden md:block max-w-[160px] truncate text-xs text-[var(--c-danger)]">{error}</p>}

          {/* Mobile: Crear opens config modal */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            disabled={!title.trim()}
            className="md:hidden shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-[var(--c-text)] text-[var(--c-bg)] text-[13px] font-semibold rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Crear
          </button>

          {/* Desktop: direct submit */}
          <button
            type="submit"
            disabled={saving || !title.trim() || !workspaceId}
            className="hidden md:flex shrink-0 items-center gap-1.5 px-3.5 py-2 bg-[var(--c-text)] text-[var(--c-bg)] text-[13px] font-semibold rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {saving ? 'Creando...' : 'Crear proceso'}
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 overflow-hidden md:flex-row">

          {/* Editor — full width on mobile, right column on desktop */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:order-2 md:p-3">
            <WikiEditor
              content={content}
              onChange={setContent}
              onTitleChange={setTitle}
              placeholder="Describe el proceso aquí..."
              title={title || undefined}
              icon={icon || undefined}
            />
          </div>

          {/* Sidebar — desktop only */}
          <aside className="hidden md:flex md:order-1 md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-[var(--c-border)] md:p-4">
            {configFields}
          </aside>
        </div>

      </form>

      {/* ── Mobile config modal ─────────────────────────────────────────── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-center justify-center p-5">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            onClick={() => setSettingsOpen(false)}
          />
          {/* Dialog */}
          <div className="relative w-full max-w-sm flex flex-col rounded-3xl bg-[var(--c-bg)] shadow-[0_24px_64px_rgba(0,0,0,0.22)]" style={{ maxHeight: '80dvh' }}>
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--c-border)]">
              <div>
                <p className="font-bold text-[var(--c-text)] text-[16px] leading-none">Configuración</p>
                <p className="text-[12px] text-[var(--c-muted)] mt-1">Workspace, icono y vínculos</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--c-hover)] text-[var(--c-text-sub)] hover:bg-[var(--c-line)] transition-colors"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto px-5 py-5 flex-1 min-h-0">
              {error && <p className="mb-4 text-xs text-[var(--c-danger)] bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              {configFields}
            </div>
            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-[var(--c-border)] flex flex-col gap-2">
              <button
                type="submit"
                form="wiki-form"
                disabled={saving || !title.trim() || !workspaceId}
                className="w-full py-2.5 bg-[var(--c-text)] text-[var(--c-bg)] font-semibold rounded-xl text-[14px] hover:opacity-80 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {saving ? 'Guardando...' : 'Guardar y publicar'}
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="w-full py-2 text-[var(--c-text-sub)] text-[13px] hover:text-[var(--c-text)] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

