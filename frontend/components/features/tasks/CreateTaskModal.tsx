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
import type { ProjectSummary, MemberItem, TaskItem, ApiWrapped, WorkspaceSummary } from '@/types/api.types';
import { playSuccess, SOUND_DURATION_MS } from '@/hooks/useSound';
import { useDebounce } from '@/hooks/useDebounce';

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
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : [],
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

        {/* Asignar a — multi-select */}
        <Field label="Asignar a">
          <div className="flex flex-col gap-2">
            {/* Selected pills */}
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {assigneeIds.map(id => {
                  const m = members.find(x => x.id === id);
                  if (!m) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full border border-[var(--c-border)] px-2.5 py-1 bg-[var(--c-hover)] text-[var(--c-text)]">
                      <span className="w-4 h-4 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[9px] font-bold flex items-center justify-center shrink-0">{m.initials}</span>
                      {m.name}
                      <button
                        type="button"
                        aria-label={`Quitar ${m.name}`}
                        onClick={() => setAssigneeIds(prev => prev.filter(x => x !== id))}
                        className="text-[var(--c-muted)] hover:text-[var(--c-danger)] transition-colors bg-transparent border-none cursor-pointer p-0 leading-none"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {/* Member list */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAssigneeIds([])}
                className={
                  'text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer font-[inherit] ' +
                  (assigneeIds.length === 0
                    ? 'border-[var(--c-text)] bg-[var(--c-hover)] text-[var(--c-text)] font-semibold'
                    : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]')
                }
              >
                Sin asignar
              </button>
              {members.map(m => {
                const selected = assigneeIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAssigneeIds(prev =>
                      selected ? prev.filter(x => x !== m.id) : [...prev, m.id]
                    )}
                    className={
                      'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer font-[inherit] ' +
                      (selected
                        ? 'border-[var(--c-text)] bg-[var(--c-hover)] text-[var(--c-text)] font-semibold'
                        : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]')
                    }
                    disabled={loadingBase}
                  >
                    <span className="w-4 h-4 rounded-full bg-[var(--c-avatar-bg)] text-[var(--c-avatar-fg)] text-[9px] font-bold flex items-center justify-center shrink-0">{m.initials}</span>
                    {m.name}
                    {selected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
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

/* ── Helpers ─────────────────────────────────────────── */
function generateCandidates(name: string): string[] {
  const words = name.trim().toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const initials = words.map((w) => w[0]).join('').slice(0, 4);
  const first = words[0];
  const set: string[] = [];
  if (initials.length >= 2) set.push(initials);
  if (first.length >= 3) set.push(first.slice(0, 3));
  if (first.length >= 4) set.push(first.slice(0, 4));
  // letter-only suffixes for collision avoidance (A–Z)
  const base = (initials.length >= 2 ? initials : first).slice(0, 3);
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') set.push((base + ch).slice(0, 4));
  return [...new Set(set)].filter((c) => c.length >= 2);
}

async function findFreeCode(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await apiGet(`/projects/${candidate.toLowerCase()}`);
      // 200 → taken, try next
    } catch {
      // 4xx → free
      return candidate;
    }
  }
  return null;
}

function ProjectForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dispatch = useUIDispatch();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [identifierChecking, setIdentifierChecking] = useState(false);
  const [description, setDescription] = useState('');
  const [methodology, setMethodology] = useState<Methodology>('Scrum');
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const debouncedIdentifier = useDebounce(identifier, 450);
  const debouncedName = useDebounce(name, 400);

  useEffect(() => {
    apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces')
      .then((r) => setWorkspaces(r.data))
      .catch(() => { /* non-blocking */ });
    apiGet<ApiWrapped<ProjectSummary[]>>('/projects')
      .then((r) => setAllProjects(r.data))
      .catch(() => { /* non-blocking */ });
  }, []);

  /* Validate project name uniqueness */
  useEffect(() => {
    if (!debouncedName.trim()) { setNameError(''); return; }
    const exists = allProjects.some(
      (p) => p.name.trim().toLowerCase() === debouncedName.trim().toLowerCase()
    );
    setNameError(exists ? 'Ya existe un proyecto con ese nombre' : '');
  }, [debouncedName, allProjects]);

  /* Auto-generate a FREE identifier when name changes (and user hasn't manually edited) */
  useEffect(() => {
    if (identifierTouched) return;
    const candidates = generateCandidates(name);
    if (candidates.length === 0) { setIdentifier(''); return; }
    let cancelled = false;
    setIdentifierChecking(true);
    findFreeCode(candidates).then((free) => {
      if (cancelled) return;
      setIdentifier(free ?? candidates[0]);
      setIdentifierError('');
      setIdentifierChecking(false);
    });
    return () => { cancelled = true; setIdentifierChecking(false); };
  }, [name, identifierTouched]);

  /* Real-time uniqueness check when user manually edits the identifier */
  useEffect(() => {
    if (!identifierTouched) return;
    if (!debouncedIdentifier || debouncedIdentifier.length < 2) {
      setIdentifierError('');
      return;
    }
    setIdentifierChecking(true);
    setIdentifierError('');
    apiGet<ApiWrapped<ProjectSummary>>(`/projects/${debouncedIdentifier.toLowerCase()}`)
      .then(() => setIdentifierError('Este identificador ya está en uso'))
      .catch(() => setIdentifierError(''))
      .finally(() => setIdentifierChecking(false));
  }, [debouncedIdentifier, identifierTouched]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError('El nombre es requerido'); return; }
    const nameTaken = allProjects.some(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (nameTaken) { setNameError('Ya existe un proyecto con ese nombre'); return; }
    if (!identifier.trim()) { setIdentifierError('El identificador es requerido'); return; }

    // Always do a hard check right before submitting (guards against race conditions)
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiGet<ApiWrapped<ProjectSummary>>(`/projects/${identifier.toLowerCase()}`);
      // 200 → already exists
      setIdentifierError('Este identificador ya está en uso');
      setSubmitting(false);
      return;
    } catch {
      // 404 → free to use
    }

    try {
      const res = await apiPost<ApiWrapped<{ id: string }>>('/projects', {
        name: name.trim(),
        code: identifier,
        description: description.trim() || undefined,
        methodology: METHODOLOGY_MAP[methodology],
      });
      if (workspaceId && res.data?.id) {
        await apiPost(`/workspaces/${workspaceId}/projects`, { projectId: res.data.id });
      }
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
        hint={
          identifierChecking
            ? 'Verificando disponibilidad…'
            : `Se usará como prefijo de tareas: ${identifier || 'ENG'}-1, ${identifier || 'ENG'}-2…`
        }
      >
        <div className="flex items-center gap-2">
          <input
            id="cp-id"
            type="text"
            maxLength={4}
            placeholder="ENG"
            value={identifier}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
              setIdentifier(val);
              setIdentifierTouched(true);
              setIdentifierError('');
            }}
            className={`${baseCls} w-24 font-mono text-center ${identifierError ? 'border-[var(--c-danger)]' : ''}`}
            autoComplete="off"
          />
          {!identifierTouched && identifier && !identifierChecking && (
            <span className="text-[11px] text-[var(--c-muted)]">Auto-generado</span>
          )}
          {identifierChecking && (
            <span className="text-[11px] text-[var(--c-muted)] animate-pulse">Verificando…</span>
          )}
        </div>
        {identifierError && (
          <span className="text-[0.75rem] text-[var(--c-danger)]">{identifierError}</span>
        )}
        {!identifierError && identifier && !identifierChecking && identifierTouched && (
          <span className="text-[0.75rem] text-green-600">Disponible ✓</span>
        )}
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

      {/* Espacio de trabajo */}
      {workspaces.length > 0 && (
        <Field label="Espacio de trabajo" htmlFor="cp-ws">
          <div className="relative">
            <select
              id="cp-ws"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className={`${baseCls} pr-8 appearance-none cursor-pointer`}
            >
              <option value="">Sin espacio de trabajo</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4l4 4 4-4" />
              </svg>
            </span>
          </div>
        </Field>
      )}

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
