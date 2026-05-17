'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import type { ApiWrapped, MemberItem, WikiPageVersionSummary, WikiPageVersionDetail } from '@/types/api.types';
import { TiptapViewer } from './WikiViewer';

interface WikiHistoryPanelProps {
  pageId: string;
  onClose: () => void;
  /** Called after a successful restore so the caller can reload the page. */
  onRestored: () => void;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function WikiHistoryPanel({ pageId, onClose, onRestored }: WikiHistoryPanelProps) {
  const [versions, setVersions] = useState<WikiPageVersionSummary[]>([]);
  const [authors, setAuthors] = useState<Record<string, MemberItem>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WikiPageVersionDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<ApiWrapped<WikiPageVersionSummary[]>>(`/wiki/${pageId}/versions`),
      apiGet<ApiWrapped<MemberItem[]>>('/users').catch(() => null),
    ])
      .then(([vRes, uRes]) => {
        if (!alive) return;
        if (vRes.ok) setVersions(vRes.data);
        if (uRes?.ok) {
          const map: Record<string, MemberItem> = {};
          for (const u of uRes.data) map[u.id] = u;
          setAuthors(map);
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pageId]);

  const openVersion = (id: string) => {
    setSelectedId(id);
    setPreviewLoading(true);
    apiGet<ApiWrapped<WikiPageVersionDetail>>(`/wiki/${pageId}/versions/${id}`)
      .then(r => { if (r.ok) setSelected(r.data); })
      .finally(() => setPreviewLoading(false));
  };

  const restore = async () => {
    if (!selectedId) return;
    setRestoring(true);
    try {
      await apiPost(`/wiki/${pageId}/versions/${selectedId}/restore`, {});
      onRestored();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-3xl flex-col bg-[var(--c-bg)] shadow-2xl md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Version list ──────────────────────────────────────────── */}
        <div className="flex w-full shrink-0 flex-col border-[var(--c-border)] md:w-72 md:border-r">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Historial de cambios</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar historial"
              className="p-1 rounded-lg text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-[var(--c-hover)] animate-pulse" />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[var(--c-muted)]">
                Aún no hay versiones guardadas. Se crea un punto de restauración al editar.
              </p>
            ) : (
              <ul className="p-2">
                {versions.map(v => {
                  const author = authors[v.created_by];
                  const active = v.id === selectedId;
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => openVersion(v.id)}
                        className={[
                          'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                          active ? 'bg-[var(--c-active-pill)]' : 'hover:bg-[var(--c-hover)]',
                        ].join(' ')}
                      >
                        <div className="text-[12.5px] font-medium text-[var(--c-text)] truncate">
                          {relativeDate(v.created_at)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--c-text-sub)] truncate">
                          {author?.name ?? 'Usuario'} · {new Date(v.created_at).toLocaleString('es-MX', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Preview ───────────────────────────────────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[var(--c-muted)]">
              Selecciona una versión para previsualizarla.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-5 py-3">
                <span className="truncate text-sm font-semibold text-[var(--c-text)]">
                  {selected?.title ?? 'Cargando…'}
                </span>
                <button
                  type="button"
                  onClick={restore}
                  disabled={restoring || previewLoading}
                  className="shrink-0 rounded-xl bg-[var(--c-text)] px-3 py-2 text-xs font-medium text-[var(--c-bg)] transition-opacity hover:opacity-80 disabled:opacity-40"
                >
                  {restoring ? 'Restaurando…' : 'Restaurar esta versión'}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {previewLoading || !selected ? (
                  <div className="space-y-2">
                    {[90, 70, 80, 60].map((w, i) => (
                      <div key={i} className="h-4 rounded bg-[var(--c-hover)] animate-pulse" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <TiptapViewer content={selected.content} onLightbox={() => {}} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
