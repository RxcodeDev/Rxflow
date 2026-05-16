'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/auth';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ContextMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  in_project?: boolean;
  project_role?: string | null;
}
interface ContextEpic   { id: string; name: string; status: string }
interface ContextCycle  { id: string; name: string; status: string }

interface ProjectContext {
  project: { id: string; code: string; name: string };
  members: ContextMember[];
  epics: ContextEpic[];
  cycles: ContextCycle[];
  assignment_guidelines?: {
    summary?: string;
    includes_all_active_users?: boolean;
    includes_project_members_first?: boolean;
    can_assign_users_outside_project?: boolean;
    rules?: string[];
  };
  valid_task_statuses: string[];
  valid_priorities: string[];
  valid_epic_statuses: string[];
  import_schema: unknown;
}

interface ImportResult {
  created_epics: number;
  created_tasks: number;
  errors: string[];
}

interface PreviewResult {
  project_code: string;
  can_import: boolean;
  errors: string[];
  summary: {
    epics: number;
    tasks: number;
  };
  normalized_payload: {
    epics: unknown[];
    tasks: unknown[];
  };
}

type Tab = 'context' | 'import';

interface Props {
  projectCode: string;
  projectName: string;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="text-[11px] font-medium px-2 py-1 rounded border border-[var(--c-border)] bg-[var(--c-hover)] hover:bg-[var(--c-line)] transition-colors cursor-pointer font-[inherit] text-[var(--c-text-sub)] whitespace-nowrap"
    >
      {copied ? '✓ Copiado' : label}
    </button>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-block font-mono text-[11px] bg-[var(--c-hover)] border border-[var(--c-border)] rounded px-1.5 py-0.5 text-[var(--c-text)]">
      {text}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ImportProjectModal({ projectCode, projectName, onClose }: Props) {
  const [tab, setTab]             = useState<Tab>('context');
  const [ctx, setCtx]             = useState<ProjectContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [jsonText, setJsonText]   = useState('');
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingContext, setDownloadingContext] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewSource, setPreviewSource] = useState('');
  const [result, setResult]       = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Load context
  useEffect(() => {
    setCtxLoading(true);
    apiGet<{ ok: boolean; data: ProjectContext }>(`/export/project/${projectCode}/context`)
      .then(res => setCtx(res.data))
      .catch(console.error)
      .finally(() => setCtxLoading(false));
  }, [projectCode]);

  // Build LLM prompt
  const llmPrompt = ctx
    ? `Soy el project manager del proyecto "${ctx.project.name}" (code: ${ctx.project.code}).
Necesito que generes un JSON de importación para Rxflow con las siguientes especificaciones.

## Contexto del proyecto

**Proyecto:** ${ctx.project.name} (${ctx.project.code})
**ID del proyecto:** ${ctx.project.id}

**Usuarios disponibles para asignar (incluye miembros del proyecto y otros usuarios activos):**
${ctx.members.map(m => `- ${m.name} (${m.initials}) | ID: ${m.id} | Rol global: ${m.role} | En proyecto: ${m.in_project ? 'si' : 'no'}${m.project_role ? ` | Rol proyecto: ${m.project_role}` : ''}`).join('\n')}

**Épicas existentes:**
${ctx.epics.length ? ctx.epics.map(e => `- "${e.name}" | ID: ${e.id} | Status: ${e.status}`).join('\n') : '(ninguna aún)'}

**Ciclos existentes:**
${ctx.cycles.length ? ctx.cycles.map(c => `- "${c.name}" | ID: ${c.id} | Status: ${c.status}`).join('\n') : '(ninguno aún)'}

**Valores válidos:**
- status de tarea: ${ctx.valid_task_statuses.join(' | ')}
- prioridad: ${ctx.valid_priorities.join(' | ')}
- status de épica: ${ctx.valid_epic_statuses.join(' | ')}

## Reglas de asignación (OBLIGATORIO)

- Usa solo UUIDs exactos del bloque de usuarios para el campo assignee_ids.
- No uses nombres, iniciales ni emails dentro de assignee_ids.
- Si no tienes responsable claro, deja assignee_ids: [] (no inventes IDs).
- Este contexto incluye usuarios activos del sistema; prioriza in_project=true.

## Esquema del JSON a generar

\`\`\`json
{
  "epics": [
    {
      "name": "string (requerido)",
      "description": "string (opcional)",
      "status": "${ctx.valid_epic_statuses[0]}",
      "parent_epic_ref": null
    }
  ],
  "tasks": [
    {
      "title": "string (requerido)",
      "description": "string (opcional)",
      "status": "backlog",
      "priority": "media",
      "assignee_ids": ["UUID del miembro"],
      "epic_id": "UUID de épica existente o null",
      "epic_ref": "índice 0-based del array epics o null",
      "cycle_id": "UUID de ciclo o null",
      "due_date": "YYYY-MM-DD o null"
    }
  ]
}
\`\`\`

## Instrucción

Por favor genera el JSON de importación con [DESCRIBE AQUÍ LO QUE NECESITAS]. 
Usa los UUIDs exactos del contexto para asignados, épicas y ciclos. 
Responde SOLO con el JSON válido, sin texto adicional.`
    : '';

  async function handleImport() {
    const trimmed = jsonText.trim();

    if (!preview || previewSource !== trimmed) {
      setImportError('Primero ejecuta la previsualizacion con el JSON actual antes de importar.');
      return;
    }

    if (!preview.can_import) {
      setImportError('La importacion esta bloqueada. Corrige los errores de previsualizacion.');
      return;
    }

    setImportError(null);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setImportError('JSON inválido. Verifica la sintaxis antes de importar.');
      return;
    }

    setImporting(true);
    try {
      const res = await apiPost<{ ok: boolean; data: ImportResult }>(
        `/import/project/${projectCode}`,
        parsed,
      );
      setResult(res.data);
      setPreview(null);
      setPreviewSource('');
    } catch (err: any) {
      const responseData = err?.response?.data;
      const errorList = responseData?.errors;
      const msg = responseData?.message || err?.message || 'Error al importar. Revisa el JSON y vuelve a intentarlo.';
      if (Array.isArray(errorList) && errorList.length > 0) {
        setImportError(`${msg}\n- ${errorList.join('\n- ')}`);
      } else {
        setImportError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setImporting(false);
    }
  }

  async function handlePreview() {
    setImportError(null);
    setResult(null);

    const trimmed = jsonText.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setImportError('JSON inválido. Verifica la sintaxis antes de previsualizar.');
      return;
    }

    setPreviewing(true);
    try {
      const res = await apiPost<{ ok: boolean; data: PreviewResult }>(
        `/import/project/${projectCode}/preview`,
        parsed,
      );
      setPreview(res.data);
      setPreviewSource(trimmed);
      if (!res.data.can_import) {
        setImportError(`Importacion bloqueada por validacion:\n- ${res.data.errors.join('\n- ')}`);
      }
    } catch (err: any) {
      const responseData = err?.response?.data;
      const errorList = responseData?.errors;
      const msg = responseData?.message || err?.message || 'No se pudo previsualizar la importacion.';
      if (Array.isArray(errorList) && errorList.length > 0) {
        setImportError(`${msg}\n- ${errorList.join('\n- ')}`);
      } else {
        setImportError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      setPreview(null);
      setPreviewSource('');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleDownloadProjectJson() {
    const token = getToken();
    if (!token) {
      setImportError('Sesion expirada. Vuelve a iniciar sesion para descargar el JSON.');
      return;
    }

    setImportError(null);
    setDownloading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/export/project/${projectCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(errBody.message ?? 'No se pudo descargar el JSON del proyecto.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rxflow-project-${projectCode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setImportError(error?.message ?? 'No se pudo descargar el JSON del proyecto.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadContextJson() {
    const token = getToken();
    if (!token) {
      setImportError('Sesion expirada. Vuelve a iniciar sesion para descargar el contexto.');
      return;
    }

    setImportError(null);
    setDownloadingContext(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/export/project/${projectCode}/context`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(errBody.message ?? 'No se pudo descargar el contexto del proyecto.');
      }

      const payload = await res.json() as { ok?: boolean; data?: unknown };
      const contextData = payload?.data ?? payload;
      const json = JSON.stringify(contextData, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rxflow-context-${projectCode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setImportError(error?.message ?? 'No se pudo descargar el contexto del proyecto.');
    } finally {
      setDownloadingContext(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-2xl bg-[var(--c-bg)] border border-[var(--c-border)] rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--c-border)] flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-[var(--c-text)]">Importar / Exportar</h2>
            <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5">{projectName} · <Badge text={projectCode} /></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--c-hover)] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--c-border)] flex-shrink-0 px-5">
          {([
            { key: 'context', label: 'Contexto para IA' },
            { key: 'import',  label: 'Importar JSON' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer bg-transparent font-[inherit] ' +
                (tab === t.key
                  ? 'border-[var(--c-text)] text-[var(--c-text)]'
                  : 'border-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text)]')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ════════════════════ TAB: CONTEXT ════════════════════ */}
          {tab === 'context' && (
            <div className="p-5 flex flex-col gap-5">

              {ctxLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 rounded-lg bg-[var(--c-hover)] animate-pulse" />
                  ))}
                </div>
              )}

              {!ctxLoading && ctx && (
                <>
                  {/* Explanation */}
                  <div className="bg-[var(--c-hover)] rounded-xl p-4 text-[13px] text-[var(--c-text-sub)] leading-relaxed">
                    <strong className="text-[var(--c-text)]">¿Cómo funciona?</strong>
                    <ol className="list-decimal list-inside mt-1.5 space-y-1">
                      <li>Copia el <strong>prompt para IA</strong> de abajo.</li>
                      <li>Pégalo en ChatGPT, Claude o cualquier LLM y describe lo que necesitas crear.</li>
                      <li>El LLM te devolverá un JSON — cópialo.</li>
                      <li>Ve a la pestaña <strong>Importar JSON</strong>, pega y haz clic en Importar.</li>
                    </ol>
                    <p className="mt-2">
                      Para asignaciones, el JSON debe usar <strong>assignee_ids</strong> con UUIDs exactos del bloque de usuarios.
                      Si no hay responsable definido, usa <strong>assignee_ids: []</strong>.
                    </p>
                  </div>

                  {!!ctx.assignment_guidelines?.rules?.length && (
                    <section>
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-2">
                        Reglas de asignacion para IA
                      </h3>
                      <div className="border border-[var(--c-border)] rounded-xl p-3 text-[13px] text-[var(--c-text-sub)] bg-[var(--c-hover)]">
                        {ctx.assignment_guidelines.summary && (
                          <p className="mb-2 text-[var(--c-text)] font-medium">{ctx.assignment_guidelines.summary}</p>
                        )}
                        <ul className="list-disc list-inside space-y-1">
                          {ctx.assignment_guidelines.rules.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  )}

                  {/* Members */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                        Usuarios para asignar ({ctx.members.length})
                      </h3>
                      <CopyButton
                        text={JSON.stringify(ctx.members, null, 2)}
                        label="Copiar JSON"
                      />
                    </div>
                    <div className="border border-[var(--c-border)] rounded-xl overflow-hidden">
                      {ctx.members.map((m, i) => (
                        <div
                          key={m.id}
                          className={
                            'flex items-center justify-between px-3 py-2 gap-2 text-[13px] ' +
                            (i < ctx.members.length - 1 ? 'border-b border-[var(--c-line)]' : '')
                          }
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-[var(--c-hover)] border border-[var(--c-border)] text-[10px] font-semibold flex items-center justify-center shrink-0 text-[var(--c-text-sub)]">
                              {m.initials}
                            </span>
                            <span className="font-medium text-[var(--c-text)] truncate">{m.name}</span>
                            <span className="text-[var(--c-muted)] text-[11px] hidden sm:inline">{m.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] text-[var(--c-text-sub)]">{m.role}</span>
                            <Badge text={m.in_project ? 'en proyecto' : 'fuera del proyecto'} />
                            <CopyButton text={m.id} label="ID" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Epics */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                        Épicas existentes ({ctx.epics.length})
                      </h3>
                      {ctx.epics.length > 0 && (
                        <CopyButton text={JSON.stringify(ctx.epics, null, 2)} label="Copiar JSON" />
                      )}
                    </div>
                    {ctx.epics.length === 0 ? (
                      <p className="text-[13px] text-[var(--c-muted)] italic">Sin épicas aún — puedes crearlas en el JSON de importación.</p>
                    ) : (
                      <div className="border border-[var(--c-border)] rounded-xl overflow-hidden">
                        {ctx.epics.map((e, i) => (
                          <div
                            key={e.id}
                            className={
                              'flex items-center justify-between px-3 py-2 gap-2 text-[13px] ' +
                              (i < ctx.epics.length - 1 ? 'border-b border-[var(--c-line)]' : '')
                            }
                          >
                            <span className="text-[var(--c-text)] truncate">{e.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge text={e.status} />
                              <CopyButton text={e.id} label="ID" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Cycles */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                        Ciclos ({ctx.cycles.length})
                      </h3>
                      {ctx.cycles.length > 0 && (
                        <CopyButton text={JSON.stringify(ctx.cycles, null, 2)} label="Copiar JSON" />
                      )}
                    </div>
                    {ctx.cycles.length === 0 ? (
                      <p className="text-[13px] text-[var(--c-muted)] italic">Sin ciclos aún.</p>
                    ) : (
                      <div className="border border-[var(--c-border)] rounded-xl overflow-hidden">
                        {ctx.cycles.map((c, i) => (
                          <div
                            key={c.id}
                            className={
                              'flex items-center justify-between px-3 py-2 gap-2 text-[13px] ' +
                              (i < ctx.cycles.length - 1 ? 'border-b border-[var(--c-line)]' : '')
                            }
                          >
                            <span className="text-[var(--c-text)] truncate">{c.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge text={c.status} />
                              <CopyButton text={c.id} label="ID" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Valid values */}
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-2">
                      Valores válidos
                    </h3>
                    <div className="border border-[var(--c-border)] rounded-xl overflow-hidden text-[13px]">
                      <div className="flex gap-2 flex-wrap items-center px-3 py-2 border-b border-[var(--c-line)]">
                        <span className="text-[var(--c-text-sub)] shrink-0 w-28">Status tarea:</span>
                        {ctx.valid_task_statuses.map(s => <Badge key={s} text={s} />)}
                      </div>
                      <div className="flex gap-2 flex-wrap items-center px-3 py-2 border-b border-[var(--c-line)]">
                        <span className="text-[var(--c-text-sub)] shrink-0 w-28">Prioridad:</span>
                        {ctx.valid_priorities.map(p => <Badge key={p} text={p} />)}
                      </div>
                      <div className="flex gap-2 flex-wrap items-center px-3 py-2">
                        <span className="text-[var(--c-text-sub)] shrink-0 w-28">Status épica:</span>
                        {ctx.valid_epic_statuses.map(s => <Badge key={s} text={s} />)}
                      </div>
                    </div>
                  </section>

                  {/* LLM Prompt */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                        Prompt para IA (listo para pegar)
                      </h3>
                      <CopyButton text={llmPrompt} label="Copiar prompt" />
                    </div>
                    <pre className="text-[11px] leading-relaxed bg-[var(--c-hover)] border border-[var(--c-border)] rounded-xl p-3 whitespace-pre-wrap text-[var(--c-text-sub)] max-h-40 overflow-y-auto">
                      {llmPrompt}
                    </pre>
                  </section>
                </>
              )}
            </div>
          )}

          {/* ════════════════════ TAB: IMPORT ════════════════════ */}
          {tab === 'import' && (
            <div className="p-5 flex flex-col gap-4">

              <div className="bg-[var(--c-hover)] rounded-xl p-4 text-[13px] text-[var(--c-text-sub)] leading-relaxed">
                Pega el JSON generado por la IA. Debe tener el formato:
                <pre className="mt-2 text-[11px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg p-2 text-[var(--c-text)]">{`{ "epics": [...], "tasks": [...] }`}</pre>
                Puedes incluir solo <code>epics</code>, solo <code>tasks</code>, o ambos. Usa estados de tarea del sistema: <strong>backlog</strong>, <strong>en_progreso</strong>, <strong>en_revision</strong>, <strong>bloqueado</strong>, <strong>completada</strong>.
              </div>

              {/* Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                    JSON a importar
                  </label>
                  {jsonText && (
                    <button
                      type="button"
                      onClick={() => {
                        setJsonText('');
                        setResult(null);
                        setImportError(null);
                        setPreview(null);
                        setPreviewSource('');
                      }}
                      className="text-[11px] text-[var(--c-text-sub)] hover:text-[var(--c-danger)] transition-colors cursor-pointer bg-transparent border-none font-[inherit]"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <textarea
                  value={jsonText}
                  onChange={e => {
                    setJsonText(e.target.value);
                    setResult(null);
                    setImportError(null);
                    setPreview(null);
                    setPreviewSource('');
                  }}
                  placeholder={'{\n  "epics": [],\n  "tasks": []\n}'}
                  rows={14}
                  className="w-full font-mono text-[12px] bg-[var(--c-hover)] border border-[var(--c-border)] rounded-xl p-3 text-[var(--c-text)] placeholder:text-[var(--c-muted)] resize-none focus:outline-none focus:border-[var(--c-text)] transition-colors"
                />
              </div>

              {preview && (
                <div className={
                  'border rounded-xl p-4 text-[13px] ' +
                  (preview.can_import
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-700')
                }>
                  <p className="font-semibold mb-1">
                    {preview.can_import ? 'Previsualizacion valida' : 'Previsualizacion con errores'}
                  </p>
                  <p>
                    Se insertaran <strong>{preview.summary.epics}</strong> epica{preview.summary.epics !== 1 ? 's' : ''} ·{' '}
                    <strong>{preview.summary.tasks}</strong> tarea{preview.summary.tasks !== 1 ? 's' : ''}
                  </p>
                  {!preview.can_import && preview.errors.length > 0 && (
                    <ul className="mt-2 list-disc list-inside space-y-0.5 text-[12px]">
                      {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[12px] font-medium">Ver payload normalizado</summary>
                    <pre className="mt-2 text-[11px] leading-relaxed bg-white/70 border border-current/20 rounded-lg p-2 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {JSON.stringify(preview.normalized_payload, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {/* Error */}
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[13px] text-red-700">
                  <strong>Error:</strong>
                  <pre className="mt-1 whitespace-pre-wrap font-[inherit] text-[13px]">{importError}</pre>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={
                  'border rounded-xl p-4 text-[13px] ' +
                  (result.errors.length > 0
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-green-50 border-green-200 text-green-800')
                }>
                  <p className="font-semibold mb-1">
                    {result.errors.length === 0 ? '✓ Importación completada' : '⚠ Importación parcial'}
                  </p>
                  <p>
                    <strong>{result.created_epics}</strong> épica{result.created_epics !== 1 ? 's' : ''} creada{result.created_epics !== 1 ? 's' : ''} ·{' '}
                    <strong>{result.created_tasks}</strong> tarea{result.created_tasks !== 1 ? 's' : ''} creada{result.created_tasks !== 1 ? 's' : ''}
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-2 list-disc list-inside space-y-0.5 text-[12px]">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[var(--c-border)] flex-shrink-0">
          {tab === 'context' ? (
            <>
              <span className="text-[12px] text-[var(--c-muted)]">
                Descarga JSON del proyecto o el contexto completo para IA
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadContextJson}
                  disabled={downloadingContext}
                  className="text-sm font-semibold text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-4 py-2 hover:bg-[var(--c-hover)] transition-colors cursor-pointer inline-block disabled:opacity-40 disabled:cursor-not-allowed bg-transparent"
                >
                  {downloadingContext ? 'Descargando contexto…' : 'Descargar contexto IA'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadProjectJson}
                  disabled={downloading}
                  className="text-sm font-semibold text-[var(--c-bg)] bg-[var(--c-text)] rounded-[0.625rem] px-4 py-2 hover:opacity-80 transition-opacity cursor-pointer inline-block disabled:opacity-40 disabled:cursor-not-allowed border-none"
                >
                  {downloading ? 'Descargando…' : 'Descargar JSON completo'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-4 py-2 hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing || importing || !jsonText.trim()}
                className="text-sm font-medium text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-[0.625rem] px-4 py-2 hover:bg-[var(--c-hover)] transition-colors cursor-pointer bg-transparent font-[inherit] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {previewing ? 'Previsualizando…' : 'Previsualizar'}
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={
                  importing ||
                  previewing ||
                  !jsonText.trim() ||
                  !preview ||
                  !preview.can_import ||
                  previewSource !== jsonText.trim()
                }
                className="text-sm font-semibold text-[var(--c-bg)] bg-[var(--c-text)] rounded-[0.625rem] px-4 py-2 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-[inherit] border-none"
              >
                {importing ? 'Importando…' : 'Importar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
