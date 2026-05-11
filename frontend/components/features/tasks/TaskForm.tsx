'use client';

import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import SearchSelect, { type SelectOption } from '@/components/ui/SearchSelect';
import { useUIState } from '@/store/UIContext';
import { apiGet, apiPost } from '@/lib/api';
import FormDescriptionEditor from './FormDescriptionEditor';
import { AssigneesPill } from './TaskDrawer';
import type { ProjectSummary, MemberItem, TaskItem, ApiWrapped } from '@/types/api.types';
import { playSuccess, SOUND_DURATION_MS } from '@/hooks/useSound';

/* ── Local types ──────────────────────────────────────────────── */
interface EpicItem { id: string; name: string; status: string; }

/* ── Constants ────────────────────────────────────────────────── */
const PRIORITIES = ['Urgente', 'Alta', 'Media', 'Baja'] as const;
type Priority = (typeof PRIORITIES)[number];

const PRIORITY_MAP: Record<Priority, string> = {
  Urgente: 'urgente', Alta: 'alta', Media: 'media', Baja: 'baja',
};

const PRIORITY_ICONS: Record<Priority, ReactNode> = {
  Urgente: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Alta: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <polyline points="17 11 12 6 7 11" /><polyline points="17 18 12 13 7 18" />
    </svg>
  ),
  Media: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="16" x2="16" y2="16" />
    </svg>
  ),
  Baja: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <polyline points="17 13 12 18 7 13" /><polyline points="17 6 12 11 7 6" />
    </svg>
  ),
};

/* ── Shared styles ────────────────────────────────────────────── */
const baseCls =
  'w-full pl-3 pr-3 py-[0.625rem] border border-[var(--c-border)] rounded-[0.625rem] ' +
  'text-sm font-[inherit] text-[var(--c-text)] bg-[var(--c-bg)] outline-none ' +
  'transition-[border-color,box-shadow] duration-[0.25s] ' +
  'placeholder:text-[var(--c-muted)] ' +
  'focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

const labelCls = 'text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]';

/* ── Field wrapper ────────────────────────────────────────────── */
function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[0.375rem]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelCls}>{label}</label>
      ) : (
        <span className={labelCls}>{label}</span>
      )}
      {children}
      {hint && <p className="text-[0.7rem] text-[var(--c-muted)]">{hint}</p>}
    </div>
  );
}

/* ── Pill group ───────────────────────────────────────────────── */
function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  iconMap,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  iconMap?: Record<T, ReactNode>;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer font-[inherit] ' +
              (opt === value
                ? 'border-[var(--c-text)] bg-[var(--c-hover)] text-[var(--c-text)] font-semibold'
                : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]')
            }
          >
            {iconMap?.[opt]}
            {opt}
          </button>
        ))}
      </div>
    </Field>
  );
}

/* ── Props ────────────────────────────────────────────────────── */
export interface TaskFormProps {
  /** Whether this is creating a top-level task or a subtask */
  context: 'task' | 'subtask';
  /** Called when form is cancelled (hide/close the host container) */
  onCancel: () => void;
  /** Called after task is successfully created. If omitted, reloads the page. */
  onSuccess?: () => void;
  /** Pre-selected project code. Only used when context === 'task'. */
  initialProjectCode?: string;
  /** Pre-selected epic id */
  initialEpicId?: string;
  /** Initial status sent to the API (not shown as a UI control). Defaults to 'backlog'. */
  initialStatus?: string;
  /** Label for the submit button. Defaults to "Crear tarea". */
  submitLabel?: string;
  /** When true, renders a footer with Cancel + Submit. Defaults to true. */
  showFooter?: boolean;
}

/* ── Component ────────────────────────────────────────────────── */
export default function TaskForm({
  context,
  onCancel,
  onSuccess,
  initialProjectCode,
  initialEpicId = '',
  initialStatus = 'backlog',
  submitLabel = 'Crear tarea',
  showFooter = true,
}: TaskFormProps) {
  const { activeProjectId, activeTaskId } = useUIState();

  /* fetched data */
  const [projects,    setProjects]    = useState<ProjectSummary[]>([]);
  const [members,     setMembers]     = useState<MemberItem[]>([]);
  const [epics,       setEpics]       = useState<EpicItem[]>([]);
  const [parentTasks, setParentTasks] = useState<TaskItem[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);

  /* form values */
  const [title,        setTitle]        = useState('');
  const [titleError,   setTitleError]   = useState('');
  const [description,  setDescription]  = useState<string | null>(null);
  const [projectCode,  setProjectCode]  = useState('');
  const [epicId,       setEpicId]       = useState(initialEpicId);
  const [parentTaskId, setParentTaskId] = useState('');
  const [priority,     setPriority]     = useState<Priority>('Media');
  const [assigneeIds,  setAssigneeIds]  = useState<string[]>([]);
  const [dueDate,      setDueDate]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState('');

  /* load projects + users once */
  useEffect(() => {
    Promise.all([
      apiGet<ApiWrapped<ProjectSummary[]>>('/projects'),
      apiGet<ApiWrapped<MemberItem[]>>('/users'),
    ])
      .then(([pRes, mRes]) => {
        const list = pRes.data;
        setProjects(list);
        setMembers(mRes.data);
        const preferred = initialProjectCode ?? activeProjectId;
        const initial = preferred
          ? (list.find(p => p.code.toLowerCase() === preferred.toLowerCase())?.code ?? list[0]?.code ?? '')
          : (list[0]?.code ?? '');
        setProjectCode(initial);
      })
      .catch(console.error)
      .finally(() => setLoadingBase(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* track whether project changed after initial load */
  const isFirstProjectLoad = useState(true);

  /* reload epics + parent tasks when project changes */
  useEffect(() => {
    if (!projectCode) return;
    Promise.all([
      apiGet<ApiWrapped<EpicItem[]>>(`/projects/${projectCode}/epics`),
      apiGet<ApiWrapped<TaskItem[]>>(`/tasks?projectCode=${projectCode}`),
    ])
      .then(([eRes, tRes]) => {
        setEpics(eRes.data.filter(e => e.status === 'activa'));
        setParentTasks(tRes.data);
        /* keep initialEpicId on first load, reset on project switch */
        if (isFirstProjectLoad[0]) {
          isFirstProjectLoad[1](false);
        } else {
          setEpicId('');
        }
        setParentTaskId(
          context === 'subtask' && activeTaskId
            ? (tRes.data.find(t => t.id === activeTaskId)?.id ?? '')
            : '',
        );
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectCode, context, activeTaskId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('El título es requerido');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiPost('/tasks', {
        projectCode,
        title: title.trim(),
        description: description,
        priority: PRIORITY_MAP[priority],
        status: initialStatus,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : [],
        epicId:       epicId       || null,
        parentTaskId: context === 'subtask' ? (parentTaskId || null) : null,
        dueDate:      dueDate      || null,
      });
      playSuccess();
      if (onSuccess) {
        onSuccess();
      } else {
        onCancel();
        setTimeout(() => window.location.reload(), SOUND_DURATION_MS);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la tarea');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Build SearchSelect options ─────────────────────────────── */
  const projectOptions: SelectOption[] = projects.map(p => ({
    value: p.code,
    label: p.name,
    subLabel: p.code,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-[var(--c-muted)]">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  }));

  const epicOptions: SelectOption[] = epics.map(ep => ({
    value: ep.id,
    label: ep.name,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" aria-hidden="true" className="shrink-0">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  }));

  const parentTaskOptions: SelectOption[] = parentTasks.map(t => ({
    value: t.id,
    label: t.title,
    subLabel: t.identifier,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-[var(--c-muted)]">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  }));

  const memberOptions: SelectOption[] = members.map(m => ({
    value: m.id,
    label: m.name,
    icon: (
      <span className="w-5 h-5 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[9px] font-bold flex items-center justify-center shrink-0">
        {m.initials}
      </span>
    ),
  }));

  const selectedProject = projects.find(p => p.code === projectCode);

  return (
    <form id="task-form" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[58vh] pr-0.5">

        {/* Título */}
        <Input
          id="tf-title"
          label="Título"
          placeholder="¿Qué hay que hacer?"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setTitleError('');
          }}
          error={titleError}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          autoComplete="off"
        />

        {/* Descripción */}
        <Field label="Descripción (opcional)">
          <FormDescriptionEditor
            onChange={setDescription}
            users={members.map(m => ({
              id: m.id,
              name: m.name,
              initials: m.initials,
              avatarUrl: m.avatar_url,
              avatarColor: m.avatar_color,
            }))}
            placeholder="Agrega más contexto, criterios de aceptación, etc. Usa / para formato o @ para mencionar"
          />
        </Field>

        {/* Proyecto */}
        {context === 'task' ? (
          <Field label="Proyecto">
            <SearchSelect
              options={projectOptions}
              value={projectCode}
              onChange={(val) => setProjectCode(val)}
              placeholder="Selecciona un proyecto"
              loading={loadingBase}
              hideNone
              searchPlaceholder="Buscar proyecto..."
            />
          </Field>
        ) : (
          <Field label="Proyecto">
            <p className={`${baseCls} text-[var(--c-text-sub)] bg-[var(--c-hover)] cursor-default`}>
              {selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '—'}
            </p>
          </Field>
        )}

        {/* Subtarea de — solo contexto subtask */}
        {context === 'subtask' && (
          <Field label="Subtarea de">
            <SearchSelect
              options={parentTaskOptions}
              value={parentTaskId}
              onChange={(val) => setParentTaskId(val)}
              placeholder="Sin tarea padre"
              loading={loadingBase}
              noneLabel="Sin tarea padre"
              searchPlaceholder="Buscar tarea..."
            />
          </Field>
        )}

        {/* Épica */}
        <Field label="Épica (opcional)">
          <SearchSelect
            options={epicOptions}
            value={epicId}
            onChange={(val) => setEpicId(val)}
            placeholder="Sin épica"
            loading={loadingBase}
            noneLabel="Sin épica"
            searchPlaceholder="Buscar épica..."
          />
        </Field>

        {/* Prioridad */}
        <PillGroup
          label="Prioridad"
          options={PRIORITIES}
          value={priority}
          onChange={setPriority}
          iconMap={PRIORITY_ICONS}
        />

        {/* Asignar a */}
        <Field label="Asignar a">
          <AssigneesPill
            assignees={assigneeIds.map(id => {
              const m = members.find(x => x.id === id);
              return { id, name: m?.name ?? id, initials: m?.initials ?? '?', avatar_color: m?.avatar_color ?? null, avatar_url: m?.avatar_url ?? null };
            })}
            users={members.map(m => ({
              id: m.id,
              name: m.name,
              initials: m.initials,
              avatarUrl: m.avatar_url,
              avatarColor: m.avatar_color,
            }))}
            onChange={setAssigneeIds}
            btnClassName={`${baseCls} flex items-center gap-2 text-left`}
          />
        </Field>

        {/* Fecha límite */}
        <Field label="Fecha límite" htmlFor="tf-due">
          <input
            id="tf-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={baseCls}
          />
        </Field>

        {submitError && (
          <p className="text-[0.75rem] text-[var(--c-danger)]">{submitError}</p>
        )}
      </div>

      {showFooter && (
        <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[var(--c-border)]">
          <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
