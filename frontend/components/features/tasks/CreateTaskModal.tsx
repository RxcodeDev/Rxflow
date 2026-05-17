'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TaskForm from '@/components/features/tasks/TaskForm';
import ProjectForm from '@/components/features/projects/ProjectForm';
import { useUIState, useUIDispatch } from '@/store/UIContext';
import { closeCreateModal, bumpProjects } from '@/store/slices/uiSlice';
import { apiPost } from '@/lib/api';
import { playSuccess } from '@/hooks/useSound';

/* ── Shared styles ───────────────────────────────────── */
const baseCls =
  'w-full pl-3 pr-3 py-[0.625rem] border border-[var(--c-border)] rounded-[0.625rem] ' +
  'text-sm font-[inherit] text-[var(--c-text)] bg-[var(--c-bg)] outline-none ' +
  'transition-[border-color,box-shadow] duration-[0.25s] ' +
  'placeholder:text-[var(--c-muted)] ' +
  'focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

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


/* ── Main export ─────────────────────────────────────── */
const MODAL_TITLES = {
  task: 'Nueva tarea',
  project: 'Nuevo proyecto',
  workspace: 'Nuevo espacio de trabajo',
} as const;

export default function CreateTaskModal() {
  const { isCreateModalOpen, createModalContext } = useUIState();
  const dispatch = useUIDispatch();
  const [wide, setWide] = useState(false);

  const handleClose = () => { dispatch(closeCreateModal()); setWide(false); };

  const expandBtn = createModalContext === 'task' ? (
    <button
      type="button"
      onClick={() => setWide(v => !v)}
      className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer mr-1"
      aria-label={wide ? 'Reducir modal' : 'Expandir modal'}
      title={wide ? 'Reducir' : 'Expandir'}
    >
      {wide ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M16 3v3a2 2 0 0 0 2 2h3"/>
          <path d="M8 21v-3a2 2 0 0 0-2-2H3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      )}
    </button>
  ) : undefined;

  return (
    <Modal
      open={isCreateModalOpen}
      onClose={handleClose}
      title={createModalContext ? MODAL_TITLES[createModalContext] : undefined}
      actions={expandBtn}
      wide={wide}
    >
      {createModalContext === 'workspace' ? (
        <WorkspaceForm onClose={handleClose} />
      ) : createModalContext === 'project' ? (
        <ProjectForm mode="create" onClose={handleClose} />
      ) : createModalContext === 'task' ? (
        <TaskForm context={createModalContext} onCancel={handleClose} submitLabel="Crear tarea" />
      ) : null}
    </Modal>
  );
}
