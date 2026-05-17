'use client';

/**
 * Reusable project form — used by both "Nuevo proyecto" (create) and
 * "Editar proyecto" (edit). Same visual pattern for both modes; the
 * differences (editable identifier, status, views) are gated by `mode`.
 *
 * Consumed by:
 *  - components/features/tasks/CreateTaskModal.tsx  (mode="create")
 *  - components/features/projects/EditProjectModal.tsx (mode="edit")
 */

import { useState, useEffect } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchSelect, { type SelectOption } from '@/components/ui/SearchSelect';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api';
import { useUIDispatch } from '@/store/UIContext';
import { bumpProjects } from '@/store/slices/uiSlice';
import type { ProjectSummary, ApiWrapped, WorkspaceSummary } from '@/types/api.types';
import { playSuccess } from '@/hooks/useSound';
import { useDebounce } from '@/hooks/useDebounce';

/* ── Constants ───────────────────────────────────────── */
export const METHODOLOGIES = ['Scrum', 'Kanban', 'Shape Up'] as const;
export type Methodology = (typeof METHODOLOGIES)[number];

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
const STATUS_COLOR: Record<string, string> = {
  activo: 'var(--c-success)', pausado: '#f59e0b', archivado: 'var(--c-muted)',
};

const ALL_VIEWS: { suffix: string; label: string }[] = [
  { suffix: 'board',   label: 'Board'   },
  { suffix: 'lista',   label: 'Lista'   },
  { suffix: 'backlog', label: 'Backlog' },
  { suffix: 'epicas',  label: 'Épicas'  },
];

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
export const baseCls =
  'w-full pl-3 pr-3 py-[0.625rem] border border-[var(--c-border)] rounded-[0.625rem] ' +
  'text-sm font-[inherit] text-[var(--c-text)] bg-[var(--c-bg)] outline-none ' +
  'transition-[border-color,box-shadow] duration-[0.25s] ' +
  'placeholder:text-[var(--c-muted)] ' +
  'focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]';

const labelCls = 'text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]';

/* ── Field wrapper ───────────────────────────────────── */
export function Field({
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

/* ── Pill group ──────────────────────────────────────── */
export function PillGroup<T extends string>({
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

/** Small workspace colour chip used as a SearchSelect option icon */
function WsChip({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="shrink-0 inline-block rounded-[4px]"
      style={{ width: 14, height: 14, background: color }} />
  );
}

/* ── Identifier auto-generation helpers (create mode) ─── */
function generateCandidates(name: string): string[] {
  const clean = name.trim().toUpperCase().replace(/[^A-Z\s]/g, '');
  if (!clean) return [];
  const words = clean.split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  if (words.length >= 2) {
    out.add(words.map((w) => w[0]).join('').slice(0, 4));
    out.add((words[0].slice(0, 2) + words[1].slice(0, 2)));
  }
  const first = words[0] ?? clean.replace(/\s/g, '');
  out.add(first.slice(0, 3));
  out.add(first.slice(0, 4));
  return [...out].filter((c) => c.length >= 2);
}

function findFreeCode(candidates: string[], existing: Set<string>): string | null {
  for (const c of candidates) {
    if (!existing.has(c)) return c;
  }
  for (const base of candidates) {
    for (let i = 1; i <= 9; i++) {
      const candidate = `${base.slice(0, 3)}${i}`;
      if (!existing.has(candidate)) return candidate;
    }
  }
  return null;
}

/* ── Props ───────────────────────────────────────────── */
export type ProjectFormProps =
  | { mode: 'create'; onClose: () => void }
  | {
      mode: 'edit';
      project: ProjectSummary;
      onClose: () => void;
      onSaved: (updated: ProjectSummary) => void;
    };

/* ── Component ───────────────────────────────────────── */
export default function ProjectForm(props: ProjectFormProps) {
  const { mode, onClose } = props;
  const isEdit = mode === 'edit';
  const router = useRouter();
  const dispatch = useUIDispatch();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [identifierChecking, setIdentifierChecking] = useState(false);
  const [description, setDescription] = useState('');
  const [methodology, setMethodology] = useState<Methodology>(isEdit ? 'Kanban' : 'Scrum');
  const [status, setStatus] = useState('activo');
  const [extraViews, setExtraViews] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const debouncedIdentifier = useDebounce(identifier, 450);
  const debouncedName = useDebounce(name, 400);

  /* Fetch workspaces (+ projects in create mode for uniqueness checks) */
  useEffect(() => {
    apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces')
      .then((r) => setWorkspaces(r.data))
      .catch(() => { /* non-blocking */ });
    if (!isEdit) {
      apiGet<ApiWrapped<ProjectSummary[]>>('/projects')
        .then((r) => setAllProjects(r.data))
        .catch(() => { /* non-blocking */ });
    }
  }, [isEdit]);

  /* Seed form from project (edit mode) */
  useEffect(() => {
    if (props.mode !== 'edit') return;
    const project = props.project;
    setName(project.name);
    setNameError('');
    setIdentifier(project.code);
    setDescription(project.description ?? '');
    setMethodology(METHODOLOGY_REVERSE[project.methodology] ?? 'Kanban');
    setStatus(project.status);
    setExtraViews(project.extra_views ?? []);
    setSubmitError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit ? props.project : null]);

  /* Sync workspace selection (edit mode) */
  useEffect(() => {
    if (props.mode !== 'edit' || workspaces.length === 0) return;
    const current = workspaces.find((ws) => ws.projects.some((p) => p.id === props.project.id));
    setWorkspaceId(current?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit ? props.project : null, workspaces]);

  /* ── Create-mode validation & auto-identifier ───────── */
  useEffect(() => {
    if (isEdit) return;
    if (!debouncedName.trim()) { setNameError(''); return; }
    const exists = allProjects.some(
      (p) => p.name.trim().toLowerCase() === debouncedName.trim().toLowerCase(),
    );
    setNameError(exists ? 'Ya existe un proyecto con ese nombre' : '');
  }, [isEdit, debouncedName, allProjects]);

  useEffect(() => {
    if (isEdit || identifierTouched) return;
    const candidates = generateCandidates(name);
    if (candidates.length === 0) { setIdentifier(''); return; }
    const existingCodes = new Set(allProjects.map((p) => p.code.trim().toUpperCase()));
    const free = findFreeCode(candidates, existingCodes);
    setIdentifier(free ?? candidates[0]);
    setIdentifierError('');
  }, [isEdit, name, identifierTouched, allProjects]);

  useEffect(() => {
    if (isEdit || !identifierTouched) return;
    if (!debouncedIdentifier || debouncedIdentifier.length < 2) {
      setIdentifierError('');
      setIdentifierChecking(false);
      return;
    }
    setIdentifierChecking(true);
    const exists = allProjects.some(
      (p) => p.code.trim().toLowerCase() === debouncedIdentifier.trim().toLowerCase(),
    );
    setIdentifierError(exists ? 'Este identificador ya está en uso' : '');
    setIdentifierChecking(false);
  }, [isEdit, debouncedIdentifier, identifierTouched, allProjects]);

  const methodologyKey = METHODOLOGY_MAP[methodology];
  const defaultViews = METHODOLOGY_DEFAULTS[methodologyKey] ?? [];

  const wsOptions: SelectOption[] = workspaces.map((ws) => ({
    value: ws.id,
    label: ws.name,
    icon: <WsChip color={ws.color} />,
    tooltip: ws.description ?? undefined,
  }));

  function toggleExtraView(suffix: string) {
    setExtraViews((prev) =>
      prev.includes(suffix) ? prev.filter((v) => v !== suffix) : [...prev, suffix],
    );
  }

  /* ── Submit ─────────────────────────────────────────── */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError('El nombre es requerido'); return; }

    if (props.mode === 'create') {
      const nameTaken = allProjects.some(
        (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      if (nameTaken) { setNameError('Ya existe un proyecto con ese nombre'); return; }
      if (!identifier.trim()) { setIdentifierError('El identificador es requerido'); return; }
      const identifierTaken = allProjects.some(
        (p) => p.code.trim().toLowerCase() === identifier.trim().toLowerCase(),
      );
      if (identifierTaken) { setIdentifierError('Este identificador ya está en uso'); return; }

      setSubmitting(true);
      setSubmitError('');
      try {
        const res = await apiPost<ApiWrapped<{ id: string }>>('/projects', {
          name: name.trim(),
          code: identifier,
          description: description.trim() || undefined,
          methodology: methodologyKey,
          extra_views: getExtraViews(methodologyKey, extraViews),
        });
        if (workspaceId && res.data?.id) {
          await apiPost(`/workspaces/${workspaceId}/projects`, { projectId: res.data.id });
        }
        dispatch(bumpProjects());
        playSuccess();
        onClose();
        router.push(`/proyectos/${identifier.toLowerCase()}/board`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al crear el proyecto';
        if (err instanceof ApiError && /projects_code_key|duplicate key|ya existe|already exists/i.test(msg)) {
          setIdentifierError('Este identificador ya está en uso');
        } else {
          setSubmitError(msg);
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    /* edit */
    const project = props.project;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await apiPatch<ApiWrapped<ProjectSummary>>(`/projects/${project.id}`, {
        name: name.trim(),
        description: description.trim() || null,
        methodology: methodologyKey,
        status,
        extra_views: getExtraViews(methodologyKey, extraViews),
      });

      const prevWs = workspaces.find((ws) => ws.projects.some((p) => p.id === project.id));
      const prevWsId = prevWs?.id ?? '';
      if (workspaceId !== prevWsId) {
        if (prevWsId) await apiDelete(`/workspaces/${prevWsId}/projects/${project.id}`);
        if (workspaceId) await apiPost(`/workspaces/${workspaceId}/projects`, { projectId: project.id });
      }

      props.onSaved(res.data);
      dispatch(bumpProjects());
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

      {/* Nombre */}
      <Input
        id="pf-name"
        label="Nombre del proyecto"
        placeholder="Ej. Backend API"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (isEdit && e.target.value.trim()) setNameError('');
        }}
        error={nameError}
        autoFocus
        autoComplete="off"
      />

      {/* Identificador — editable en create, read-only en edit */}
      {isEdit ? (
        <Field label="Identificador">
          <div className={`${baseCls} font-mono text-center w-20 opacity-60 cursor-not-allowed bg-[var(--c-hover)]`}>
            {identifier}
          </div>
        </Field>
      ) : (
        <Field
          label="Identificador"
          htmlFor="pf-id"
          hint={
            identifierChecking
              ? 'Verificando disponibilidad…'
              : `Se usará como prefijo de tareas: ${identifier || 'ENG'}-1, ${identifier || 'ENG'}-2…`
          }
        >
          <div className="flex items-center gap-2">
            <input
              id="pf-id"
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
            <span className="text-[0.75rem] text-[var(--c-success)]">Disponible ✓</span>
          )}
        </Field>
      )}

      {/* Descripción */}
      <Field label="Descripción (opcional)" htmlFor="pf-desc">
        <textarea
          id="pf-desc"
          rows={3}
          placeholder="¿De qué trata este proyecto?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${baseCls} resize-none`}
        />
      </Field>

      {/* Metodología */}
      <PillGroup
        label={isEdit ? 'Metodología' : 'Metodología preferida'}
        options={METHODOLOGIES}
        value={methodology}
        onChange={(v: Methodology) => setMethodology(v)}
        hint={isEdit ? undefined : 'Puedes cambiarlo después en configuración'}
      />

      {/* Estado — solo en edición */}
      {isEdit && (
        <Field label="Estado">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const active = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={
                    'flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer font-[inherit] ' +
                    (active
                      ? 'border-[var(--c-text)] bg-[var(--c-hover)] text-[var(--c-text)] font-semibold'
                      : 'border-[var(--c-border)] text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]')
                  }
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[s] }} aria-hidden="true" />
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {/* Espacio de trabajo */}
      {workspaces.length > 0 && (
        <Field label="Espacio de trabajo">
          <SearchSelect
            options={wsOptions}
            value={workspaceId}
            onChange={(val) => setWorkspaceId(val)}
            placeholder="Sin espacio de trabajo"
            noneLabel="Sin espacio de trabajo"
            searchPlaceholder="Buscar espacio…"
          />
        </Field>
      )}

      {/* Vistas habilitadas */}
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
          {isEdit ? 'Guardar cambios' : 'Crear proyecto'}
        </Button>
      </div>
    </form>
  );
}
