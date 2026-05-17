'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import type { ApiWrapped, EpicItem, WikiPageDetail, WikiPageSummary, WorkspaceSummary, TaskItem } from '@/types/api.types';
import TaskSearchSelect, { type TaskWithProject } from '@/components/features/wiki/TaskSearchSelect';
import SearchSelect from '@/components/ui/SearchSelect';
import EmojiPicker from '@/components/features/wiki/EmojiPicker';
import WikiHistoryPanel from '@/components/features/wiki/WikiHistoryPanel';

const WikiEditor = dynamic(() => import('@/components/features/wiki/WikiEditor'), { ssr: false });

/* ── Shared styles ───────────────────────────────────────────────── */
const labelCls = 'text-[0.7rem] font-semibold text-[var(--c-text-sub)] tracking-[0.04em] uppercase';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function WikiPageView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [page, setPage] = useState<WikiPageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<Record<string, unknown>>({ type: 'doc', content: [] });
  const [icon, setIcon] = useState<string>('');
  const [parentPageId, setParentPageId] = useState<string>('');
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [projectCode, setProjectCode] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [epicId, setEpicId] = useState<string>('');
  const [linkType, setLinkType] = useState<LinkType>('');

  // Support data
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [parentPages, setParentPages] = useState<WikiPageSummary[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [allEpics, setAllEpics] = useState<EpicWithProject[]>([]);
  const [epicsLoading, setEpicsLoading] = useState(false);

  // UI state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allProjects = useMemo(
    () => dedupeByKey(
      workspaces.flatMap(ws => ws.projects.map(p => ({ ...p, workspaceId: ws.id }))),
      (project) => project.code,
    ),
    [workspaces],
  );

  /* ── Initial load ──────────────────────────────────────────────── */
  const loadPage = (markLoaded = true) => {
    return apiGet<ApiWrapped<WikiPageDetail>>(`/wiki/${id}`).then(r => {
      if (!r.ok) { router.replace('/herramientas/wiki'); return; }
      const p = r.data;
      setPage(p);
      setTitle(p.title);
      setContent(p.content as Record<string, unknown>);
      setIcon(p.icon ?? '');
      setParentPageId(p.parent_page_id ?? '');
      setWorkspaceId(p.workspace_id);
      setProjectCode(p.project_code ?? '');
      setTaskId(p.task_id ?? '');
      setEpicId(p.epic_id ?? '');
      const initLink: LinkType = p.task_id ? 'tarea' : p.epic_id ? 'epica' : p.project_code ? 'proyecto' : '';
      setLinkType(initLink);
      if (markLoaded) loadedRef.current = true;
    });
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      loadPage(),
      apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces').then(r => { if (r.ok) setWorkspaces(r.data); }).catch(() => {}),
    ])
      .catch(() => router.replace('/herramientas/wiki'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!workspaceId) { setParentPages([]); return; }
    apiGet<ApiWrapped<WikiPageSummary[]>>(`/wiki?workspaceId=${workspaceId}`)
      .then(r => { if (r.ok) setParentPages(r.data.filter(p => p.id !== id)); })
      .catch(() => setParentPages([]));
  }, [workspaceId, id]);

  useEffect(() => {
    if (allProjects.length === 0) { setAllTasks([]); return; }
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
    if (allProjects.length === 0) { setAllEpics([]); return; }
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

  /* ── Debounced autosave (Notion-style) ─────────────────────────── */
  useEffect(() => {
    if (!loadedRef.current || !id) return;
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await apiPatch(`/wiki/${id}`, {
          title: title.trim() || 'Sin título',
          content,
          icon: icon || null,
          parentPageId: parentPageId || null,
          projectCode: projectCode || null,
          taskId: taskId || null,
          epicId: epicId || null,
        });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, icon, parentPageId, projectCode, taskId, epicId]);

  /* ── Actions ───────────────────────────────────────────────────── */
  const handleArchive = async () => {
    if (!page) return;
    setArchiving(true);
    try {
      const r = await apiPatch<ApiWrapped<WikiPageDetail>>(`/wiki/${page.id}/archive`, {});
      if (r.ok) setPage(p => p ? { ...p, is_archived: r.data.is_archived } : p);
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!page) return;
    setDeleting(true);
    try {
      await apiDelete(`/wiki/${page.id}`);
      router.replace('/herramientas/wiki');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleRestored = async () => {
    setHistoryOpen(false);
    loadedRef.current = false;
    await loadPage();
    setSaveStatus('saved');
  };

  /* ── Loading skeleton ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="h-full overflow-y-auto px-4 py-5 space-y-5 md:px-6 md:py-6">
        <div className="h-4 w-24 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="h-9 w-80 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="space-y-2 pt-6">
          {[90, 75, 85, 60, 70].map((w, i) => (
            <div key={i} className="h-4 bg-[var(--c-hover)] rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!page) return null;

  const statusLabel =
    saveStatus === 'saving' ? 'Guardando…'
    : saveStatus === 'saved' ? 'Todos los cambios guardados'
    : saveStatus === 'error' ? 'Error al guardar' : '';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--c-bg)]">

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-3">
        <Link
          href="/herramientas/wiki"
          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors group"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
            className="shrink-0 transition-transform group-hover:-translate-x-0.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="truncate">Volver a Wiki</span>
        </Link>

        <span
          className={[
            'ml-2 hidden text-xs sm:inline transition-colors',
            saveStatus === 'error' ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]',
          ].join(' ')}
        >
          {statusLabel}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--c-border)] px-3 py-2 text-xs font-medium text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
            </svg>
            <span className="hidden sm:inline">Historial</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(o => !o)}
            aria-pressed={settingsOpen}
            className={[
              'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
              settingsOpen
                ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)]'
                : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)]',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="hidden sm:inline">Ajustes</span>
          </button>
        </div>
      </div>

      {/* ── Archived banner ───────────────────────────────────────── */}
      {page.is_archived && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
          </svg>
          Esta página está archivada
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Editor */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
          <WikiEditor
            content={content}
            onChange={setContent}
            onTitleChange={setTitle}
            title={title}
            icon={icon || undefined}
            placeholder="Escribe aquí. Usa / para insertar bloques…"
          />

          {/* Subpages */}
          {page.children.length > 0 && (
            <div className="mt-4 border-t border-[var(--c-border)] pt-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--c-text-sub)]">
                Subpáginas
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {page.children.map(child => (
                  <li key={child.id}>
                    <Link
                      href={`/herramientas/wiki/${child.id}`}
                      className="group flex items-center gap-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2.5 text-sm text-[var(--c-text)] transition-all hover:border-[var(--c-text-sub)] hover:bg-[var(--c-hover)]"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--c-hover)]">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                      <span className="truncate font-medium">{child.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Settings sidebar */}
        {settingsOpen && (
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-[var(--c-border)] bg-[var(--c-bg)] p-4">
            <div className="space-y-4">
              <Field label="Workspace">
                <SearchSelect
                  options={workspaces.map(ws => ({ value: ws.id, label: ws.name }))}
                  value={workspaceId}
                  onChange={setWorkspaceId}
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
                  onChange={setParentPageId}
                  placeholder="— ninguno (raíz) —"
                  noneLabel="— ninguno (raíz) —"
                  searchPlaceholder="Buscar proceso padre..."
                  disabled={parentPages.length === 0}
                />
              </Field>

              <hr className="border-[var(--c-border)]" />

              <div>
                <button
                  type="button"
                  onClick={() => setRelationsOpen(o => !o)}
                  className="flex w-full items-center justify-between"
                >
                  <span className={labelCls}>Vincular a</span>
                  <svg
                    viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
                    className={`text-[var(--c-text-sub)] transition-transform ${relationsOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {relationsOpen && (
                  <div className="mt-3 space-y-3">
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
                            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                            linkType === lt.value
                              ? 'border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)]'
                              : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)]',
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
                          onChange={setEpicId}
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
                          onChange={setProjectCode}
                          noneLabel="— ninguno —"
                          searchPlaceholder="Buscar proyecto..."
                        />
                      </Field>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-[var(--c-border)]" />

              {/* Danger / lifecycle */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--c-border)]">
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="flex items-center gap-2.5 px-3.5 py-3 text-left text-sm text-[var(--c-text-sub)] transition-colors hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                    <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                  {archiving ? 'Procesando...' : page.is_archived ? 'Restaurar' : 'Archivar'}
                </button>
                <div className="h-px bg-[var(--c-border)]" />
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2.5 px-3.5 py-3 text-left text-sm text-[var(--c-danger)] transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  Eliminar página
                </button>
              </div>

              {page.breadcrumb && page.breadcrumb.length > 1 && (
                <div className="rounded-xl border border-[var(--c-border)] p-3 space-y-1">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--c-muted)]">Ubicación</p>
                  {page.breadcrumb.slice(0, -1).map((crumb, i) => (
                    <Link
                      key={crumb.id}
                      href={`/herramientas/wiki/${crumb.id}`}
                      className="flex items-center gap-1.5 text-xs text-[var(--c-text-sub)] transition-colors hover:text-[var(--c-text)]"
                    >
                      <span className="opacity-50">{'›'.repeat(i + 1)}</span>
                      <span className="truncate">{crumb.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── History panel ─────────────────────────────────────────── */}
      {historyOpen && (
        <WikiHistoryPanel
          pageId={page.id}
          onClose={() => setHistoryOpen(false)}
          onRestored={handleRestored}
        />
      )}

      {/* ── Delete confirmation ───────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-6 shadow-xl">
            <h3 className="mb-2 font-semibold text-[var(--c-text)]">¿Eliminar página?</h3>
            <p className="mb-5 text-sm text-[var(--c-text-sub)]">
              Esta acción no se puede deshacer. Las subpáginas quedarán huérfanas.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-[var(--c-danger)] py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-[var(--c-border)] py-2 text-sm text-[var(--c-text-sub)] transition-colors hover:bg-[var(--c-hover)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
