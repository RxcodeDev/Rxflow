'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { apiPatch } from '@/lib/api';
import { useUIDispatch } from '@/store/UIContext';
import { bumpProjects } from '@/store/slices/uiSlice';
import type { ProjectSummary, ApiWrapped } from '@/types/api.types';

/* ── Constants ───────────────────────────────────────── */
const METHODOLOGIES = ['Scrum', 'Kanban', 'Shape Up'] as const;
type Methodology = (typeof METHODOLOGIES)[number];

const METHODOLOGY_MAP: Record<Methodology, string> = {
  Scrum: 'scrum', Kanban: 'kanban', 'Shape Up': 'shape_up',
};
const METHODOLOGY_REVERSE: Record<string, Methodology> = {
  scrum: 'Scrum', kanban: 'Kanban', shape_up: 'Shape Up',
};

const STATUSES = ['activo', 'pausado', 'archivado'] as const;
const STATUS_LABEL: Record<string, string> = {
  activo: 'Activo', pausado: 'Pausado', archivado: 'Archivado',
};

/** All available view slugs with display labels */
const ALL_VIEWS: { suffix: string; label: string }[] = [
  { suffix: 'board',   label: 'Board'   },
  { suffix: 'lista',   label: 'Lista'   },
  { suffix: 'backlog', label: 'Backlog' },
  { suffix: 'epicas',  label: 'Épicas'  },
];

/** Default views bundled with each methodology (always enabled) */
const METHODOLOGY_DEFAULTS: Record<string, string[]> = {
  scrum:    ['board', 'backlog', 'epicas'],
  kanban:   ['board', 'lista'],
  shape_up: ['lista'],
};

function getExtraViews(methodology: string, extraViews: string[]): string[] {
  const defaults = METHODOLOGY_DEFAULTS[methodology] ?? [];
  return extraViews.filter((v) => !defaults.includes(v));
}

/* ── Shared styles ───────────────────────────────────── */
const baseCls =
  'w-full pl-3 pr-3 py-[0.625rem] border border-[var(--c-border)] rounded-[0.625rem] ' +
  'text-sm font-[inherit] text-[var(--c-text)] bg-[var(--c-bg)] outline-none ' +
  'transition-[border-color,box-shadow] duration-[0.25s] ' +
  'placeholder:text-[var(--c-muted)] ' +
  'focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

const labelCls = 'text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]';

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[0.375rem]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelCls}>{label}</label>
      ) : (
        <span className={labelCls}>{label}</span>
      )}
      {children}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────── */
interface EditProjectModalProps {
  project: ProjectSummary | null;
  onClose: () => void;
  onSaved: (updated: ProjectSummary) => void;
}

export default function EditProjectModal({ project, onClose, onSaved }: EditProjectModalProps) {
  const dispatch = useUIDispatch();
  const [name,        setName]        = useState('');
  const [nameError,   setNameError]   = useState('');
  const [description, setDescription] = useState('');
  const [methodology, setMethodology] = useState<Methodology>('Kanban');
  const [status,      setStatus]      = useState('activo');
  const [extraViews,  setExtraViews]  = useState<string[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* Seed form from project when it opens */
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setNameError('');
    setDescription(project.description ?? '');
    setMethodology(METHODOLOGY_REVERSE[project.methodology] ?? 'Kanban');
    setStatus(project.status);
    setExtraViews(project.extra_views ?? []);
    setSubmitError('');
  }, [project]);

  const methodologyKey = METHODOLOGY_MAP[methodology];
  const defaultViews   = METHODOLOGY_DEFAULTS[methodologyKey] ?? [];

  function toggleExtraView(suffix: string) {
    setExtraViews((prev) =>
      prev.includes(suffix) ? prev.filter((v) => v !== suffix) : [...prev, suffix],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError('El nombre es requerido'); return; }
    if (!project) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await apiPatch<ApiWrapped<ProjectSummary>>(`/projects/${project.id}`, {
        name:        name.trim(),
        description: description.trim() || null,
        methodology: methodologyKey,
        status,
        extra_views: getExtraViews(methodologyKey, extraViews),
      });
      onSaved(res.data);
      dispatch(bumpProjects());
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!project} onClose={onClose} title="Editar proyecto">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

        {/* Nombre */}
        <Input
          id="ep-name"
          label="Nombre del proyecto"
          placeholder="Ej. Backend API"
          value={name}
          onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(''); }}
          error={nameError}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          autoComplete="off"
        />

        {/* Identificador (read-only) */}
        <Field label="Identificador">
          <div className={`${baseCls} font-mono text-center w-20 opacity-60 cursor-not-allowed bg-[var(--c-hover)]`}>
            {project?.code ?? ''}
          </div>
        </Field>

        {/* Descripción */}
        <Field label="Descripción (opcional)" htmlFor="ep-desc">
          <textarea
            id="ep-desc"
            rows={3}
            placeholder="¿De qué trata este proyecto?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${baseCls} resize-none`}
          />
        </Field>

        {/* Metodología */}
        <Field label="Metodología">
          <div className="flex flex-wrap gap-2">
            {METHODOLOGIES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodology(m)}
                className={
                  'text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer font-[inherit] ' +
                  (m === methodology
                    ? 'border-[var(--c-text)] bg-[var(--c-hover)] text-[var(--c-text)] font-semibold'
                    : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]')
                }
              >
                {m}
              </button>
            ))}
          </div>
        </Field>

        {/* Estado */}
        <Field label="Estado" htmlFor="ep-status">
          <div className="relative">
            <select
              id="ep-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${baseCls} pr-8 appearance-none cursor-pointer`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4l4 4 4-4" />
              </svg>
            </span>
          </div>
        </Field>

        {/* Vistas disponibles */}
        <Field label="Vistas habilitadas">
          <div className="border border-[var(--c-border)] rounded-xl overflow-hidden">
            {ALL_VIEWS.map(({ suffix, label }) => {
              const isDefault = defaultViews.includes(suffix);
              const isChecked = isDefault || extraViews.includes(suffix);
              return (
                <label
                  key={suffix}
                  className={
                    'flex items-center justify-between px-4 py-3 gap-3 last:border-0 border-b border-[var(--c-line)] ' +
                    (isDefault ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[var(--c-hover)] cursor-pointer')
                  }
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <span
                      className={
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ' +
                        (isChecked
                          ? 'bg-[var(--c-text)] border-[var(--c-text)]'
                          : 'border-[var(--c-border)] bg-[var(--c-bg)]')
                      }
                      aria-hidden="true"
                    >
                      {isChecked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-[var(--c-text)]">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDefault && (
                      <span className="text-[10px] text-[var(--c-muted)] border border-[var(--c-border)] rounded-full px-2 py-0.5">
                        {METHODOLOGY_REVERSE[methodologyKey] ?? methodology}
                      </span>
                    )}
                  </div>
                  {!isDefault && (
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={extraViews.includes(suffix)}
                      onChange={() => toggleExtraView(suffix)}
                      disabled={isDefault}
                    />
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-[0.7rem] text-[var(--c-muted)]">
            Las vistas marcadas con la metodología son obligatorias y no se pueden desactivar.
          </p>
        </Field>

        {submitError && <p className="text-[0.75rem] text-[var(--c-danger)]">{submitError}</p>}

        <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-[var(--c-border)]">
          <Button type="button" variant="ghost" style={{ width: 'auto' }} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" style={{ width: 'auto' }} loading={submitting}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
