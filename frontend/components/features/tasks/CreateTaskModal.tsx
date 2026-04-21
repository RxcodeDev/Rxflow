'use client';

import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUIState, useUIDispatch } from '@/store/UIContext';
import { closeCreateModal, bumpProjects } from '@/store/slices/uiSlice';
import { apiGet, apiPost } from '@/lib/api';
import type { ProjectSummary, MemberItem, TaskItem, ApiWrapped } from '@/types/api.types';
import { playSuccess, SOUND_DURATION_MS } from '@/hooks/useSound';

/* ── Local types ─────────────────────────────────────── */
interface EpicItem { id: string; name: string; status: string; }

/* ── Constants ───────────────────────────────────────── */
const PRIORITIES = ['Urgente', 'Alta', 'Media', 'Baja'] as const;
type Priority = (typeof PRIORITIES)[number];

const PRIORITY_MAP: Record<Priority, string> = {
  Urgente: 'urgente', Alta: 'alta', Media: 'media', Baja: 'baja',
};

const METHODOLOGIES = ['Scrum', 'Kanban', 'Shape Up'] as const;
type Methodology = (typeof METHODOLOGIES)[number];

/* ── Shared styles ───────────────────────────────────── */
const baseCls =
  'w-full pl-3 pr-3 py-[0.625rem] border border-[var(--c-border)] rounded-[0.625rem] ' +
  'text-sm font-[inherit] text-[var(--c-text)] bg-[var(--c-bg)] outline-none ' +
  'transition-[border-color,box-shadow] duration-[0.25s] ' +
  'placeholder:text-[var(--c-muted)] ' +
  'focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

const selectCls = baseCls + ' pr-8 appearance-none cursor-pointer';
const labelCls = 'text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]';

/* ── Field wrapper ───────────────────────────────────── */
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

/* ── Native select with chevron ──────────────────────── */
function NativeSelect({
  id,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={selectCls + (disabled ? ' opacity-60 cursor-not-allowed' : '')}
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]"
        aria-hidden="true"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </span>
    </div>
  );
}

/* ── Pill group ──────────────────────────────────────── */
function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              'text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer font-[inherit] ' +
              (opt === value
                ? 'border-[var(--c-text)] bg-[var(--c-hover)] text-[var(--c-text)] font-semibold'
                : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]')
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </Field>
  );
}

/* ── Modal footer ────────────────────────────────────── */
function ModalFooter({ onClose, loading }: { onClose: () => void; loading?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[var(--c-border)]">
      <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={onClose}>
        Cancelar
      </Button>
      <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={loading}>
        Crear
      </Button>
    </div>
  );
}

/* ── Task / Subtask form ─────────────────────────────── */
function TaskSubtaskForm({
  context,
  onClose,
}: {
  context: 'task' | 'subtask';
  onClose: () => void;
}) {
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
  const [projectCode,  setProjectCode]  = useState('');
  const [epicId,       setEpicId]       = useState('');
  const [parentTaskId, setParentTaskId] = useState('');
  const [priority,     setPriority]     = useState<Priority>('Media');
  const [assigneeId,   setAssigneeId]   = useState('');
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
        const initialCode = activeProjectId
          ? (list.find(p => p.code.toLowerCase() === activeProjectId.toLowerCase())?.code ?? list[0]?.code ?? '')
          : (list[0]?.code ?? '');
        setProjectCode(initialCode);
      })
      .catch(console.error)
      .finally(() => setLoadingBase(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setEpicId('');
        setParentTaskId(
          context === 'subtask' && activeTaskId
            ? (tRes.data.find(t => t.id === activeTaskId)?.id ?? '')
            : '',
        );
      })
      .catch(console.error);
  }, [projectCode, context, activeTaskId]);

  const handleProjectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setProjectCode(e.target.value);
  };

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
        priority: PRIORITY_MAP[priority],
        status: 'backlog',
        assigneeId:   assigneeId   || null,
        epicId:       epicId       || null,
        parentTaskId: context === 'subtask' ? (parentTaskId || null) : null,
        dueDate:      dueDate      || null,
      });
      playSuccess();
      onClose();
      setTimeout(() => window.location.reload(), SOUND_DURATION_MS);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la tarea');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProject = projects.find(p => p.code === projectCode);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[58vh] pr-0.5">

        {/* Título */}
        <Input
          id="ct-title"
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

        {/* Proyecto */}
        {context === 'task' ? (
          <Field label="Proyecto" htmlFor="ct-project">
            <NativeSelect
              id="ct-project"
              value={projectCode}
              onChange={handleProjectChange}
              disabled={loadingBase}
            >
              {projects.map(p => (
                <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
              ))}
            </NativeSelect>
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
          <Field label="Subtarea de" htmlFor="ct-parent">
            <NativeSelect
              id="ct-parent"
              value={parentTaskId}
              onChange={(e) => setParentTaskId(e.target.value)}
              disabled={loadingBase}
            >
              <option value="">Sin tarea padre</option>
              {parentTasks.map(t => (
                <option key={t.id} value={t.id}>{t.identifier} — {t.title}</option>
              ))}
            </NativeSelect>
          </Field>
        )}

        {/* Épica */}
        <Field label="Épica (opcional)" htmlFor="ct-epic">
          <NativeSelect
            id="ct-epic"
            value={epicId}
            onChange={(e) => setEpicId(e.target.value)}
            disabled={loadingBase}
          >
            <option value="">Sin épica</option>
            {epics.map(ep => (
              <option key={ep.id} value={ep.id}>{ep.name}</option>
            ))}
          </NativeSelect>
        </Field>

        {/* Prioridad */}
        <PillGroup
          label="Prioridad"
          options={PRIORITIES}
          value={priority}
          onChange={setPriority}
        />

        {/* Asignar a */}
        <Field label="Asignar a" htmlFor="ct-assignee">
          <NativeSelect
            id="ct-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={loadingBase}
          >
            <option value="">Sin asignar</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.initials})</option>
            ))}
          </NativeSelect>
        </Field>

        {/* Fecha límite */}
        <Field label="Fecha límite" htmlFor="ct-due">
          <input
            id="ct-due"
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

      <ModalFooter onClose={onClose} loading={submitting} />
    </form>
  );
}

/* ── Workspace form ─────────────────────────────────── */
const WORKSPACE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
] as const;

const WORKSPACE_ICON_NAMES = ['layers', 'code', 'target', 'briefcase', 'monitor', 'zap', 'globe', 'star'] as const;
type WsIconName = typeof WORKSPACE_ICON_NAMES[number];

function WorkspaceIcon({ icon, size = 16, color }: { icon: string; size?: number; color?: string }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color ?? 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  switch (icon) {
    case 'code':      return <svg {...p}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
    case 'target':    return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'briefcase': return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'monitor':   return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    case 'zap':       return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'globe':     return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case 'star':      return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    default:          return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
  }
}

function WorkspaceForm({ onClose }: { onClose: () => void }) {
  const dispatch = useUIDispatch();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(WORKSPACE_COLORS[0]);
  const [icon, setIcon] = useState<WsIconName>('layers');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('El nombre es requerido');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiPost('/workspaces', {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      });
      dispatch(bumpProjects());
      playSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear el workspace');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

      {/* Nombre */}
      <Input
        id="cw-name"
        label="Nombre del espacio de trabajo"
        placeholder="Ej. Producto & Desarrollo"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (e.target.value.trim()) setNameError('');
        }}
        error={nameError}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        autoComplete="off"
      />

      {/* Descripción */}
      <Field label="Descripción (opcional)" htmlFor="cw-desc">
        <textarea
          id="cw-desc"
          rows={2}
          placeholder="¿En qué trabaja este equipo?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${baseCls} resize-none`}
        />
      </Field>

      {/* Color */}
      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {WORKSPACE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-transform cursor-pointer"
              style={{
                background: c,
                borderColor: color === c ? 'var(--c-text)' : 'transparent',
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
              }}
              aria-label={c}
              aria-pressed={color === c}
            />
          ))}
        </div>
      </Field>

      {/* Ícono */}
      <Field label="Ícono">
        <div className="flex flex-wrap gap-2">
          {WORKSPACE_ICON_NAMES.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={
                'w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ' +
                (icon === ic
                  ? 'bg-[var(--c-hover)] border-[var(--c-text-sub)]'
                  : 'border-[var(--c-border)] hover:bg-[var(--c-hover)]')
              }
              aria-label={ic}
              aria-pressed={icon === ic}
            >
              <WorkspaceIcon icon={ic} size={16} color={icon === ic ? color : undefined} />
            </button>
          ))}
        </div>
      </Field>

      {submitError && <p className="text-[0.75rem] text-[var(--c-danger)]">{submitError}</p>}

      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[var(--c-border)]">
        <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={submitting}>
          Crear workspace
        </Button>
      </div>
    </form>
  );
}

/* ── Project form ────────────────────────────────────── */
const METHODOLOGY_MAP: Record<Methodology, string> = {
  Scrum: 'scrum',
  Kanban: 'kanban',
  'Shape Up': 'shape_up',
};

function ProjectForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dispatch = useUIDispatch();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [methodology, setMethodology] = useState<Methodology>('Scrum');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('El nombre es requerido');
      return;
    }
    if (!identifier.trim()) {
      setNameError('El identificador es requerido');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiPost('/projects', {
        name: name.trim(),
        code: identifier,
        description: description.trim() || undefined,
        methodology: METHODOLOGY_MAP[methodology],
      });
      dispatch(bumpProjects());
      playSuccess();
      onClose();
      router.push(`/proyectos/${identifier.toLowerCase()}/board`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear el proyecto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

      {/* Nombre */}
      <Input
        id="cp-name"
        label="Nombre del proyecto"
        placeholder="Ej. Backend API"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (e.target.value.trim()) setNameError('');
        }}
        error={nameError}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        autoComplete="off"
      />

      {/* Identificador */}
      <Field
        label="Identificador"
        htmlFor="cp-id"
        hint={`Se usará como prefijo de tareas: ${identifier || 'ENG'}-1, ${identifier || 'ENG'}-2…`}
      >
        <input
          id="cp-id"
          type="text"
          maxLength={4}
          placeholder="ENG"
          value={identifier}
          onChange={(e) =>
            setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
          }
          className={`${baseCls} w-24 font-mono text-center`}
          autoComplete="off"
        />
      </Field>

      {/* Descripción */}
      <Field label="Descripción (opcional)" htmlFor="cp-desc">
        <textarea
          id="cp-desc"
          rows={3}
          placeholder="¿De qué trata este proyecto?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${baseCls} resize-none`}
        />
      </Field>

      {/* Metodología */}
      <PillGroup
        label="Metodología preferida"
        options={METHODOLOGIES}
        value={methodology}
        onChange={(v) => setMethodology(v)}
        hint="Puedes cambiarlo después en configuración"
      />

      {submitError && <p className="text-[0.75rem] text-[var(--c-danger)]">{submitError}</p>}

      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[var(--c-border)]">
        <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={submitting}>
          Crear proyecto
        </Button>
      </div>
    </form>
  );
}

/* ── Main export ─────────────────────────────────────── */
const MODAL_TITLES = {
  task: 'Nueva tarea',
  subtask: 'Nueva subtarea',
  project: 'Nuevo proyecto',
  workspace: 'Nuevo espacio de trabajo',
} as const;

export default function CreateTaskModal() {
  const { isCreateModalOpen, createModalContext } = useUIState();
  const dispatch = useUIDispatch();

  const handleClose = () => dispatch(closeCreateModal());

  return (
    <Modal
      open={isCreateModalOpen}
      onClose={handleClose}
      title={createModalContext ? MODAL_TITLES[createModalContext] : undefined}
    >
      {createModalContext === 'workspace' ? (
        <WorkspaceForm onClose={handleClose} />
      ) : createModalContext === 'project' ? (
        <ProjectForm onClose={handleClose} />
      ) : createModalContext ? (
        <TaskSubtaskForm context={createModalContext} onClose={handleClose} />
      ) : null}
    </Modal>
  );
}
