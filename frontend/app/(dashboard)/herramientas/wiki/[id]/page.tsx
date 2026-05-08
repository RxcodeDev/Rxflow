'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import type { ApiWrapped, WikiPageDetail, WorkspaceSummary } from '@/types/api.types';
import WikiRelationBadges from '@/components/features/wiki/WikiRelationBadges';
import dynamic from 'next/dynamic';

const WikiViewer = dynamic(() => import('@/components/features/wiki/WikiViewer'), { ssr: false });

export default function WikiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<WikiPageDetail | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<ApiWrapped<WikiPageDetail>>(`/wiki/${id}`)
      .then(r => {
        if (r.ok) {
          setPage(r.data);
          // Resolve workspace name
          apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces')
            .then(wr => {
              if (wr.ok) {
                const ws = wr.data.find(w => w.id === r.data.workspace_id);
                if (ws) setWorkspaceName(ws.name);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => router.replace('/herramientas/wiki'))
      .finally(() => setLoading(false));
  }, [id, router]);

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

  const handlePrint = () => {
    const el = document.getElementById('wiki-print-area');
    if (!el) return;

    const styles = Array.from(document.querySelectorAll('style'))
      .map(s => s.outerHTML)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${page?.title ?? 'Wiki'}</title>
  ${styles}
  <style>
    @page { margin: 2cm 2.5cm; }
    body { margin: 0; background: #fff; color: #111; font-family: system-ui, sans-serif; }
    img { max-width: 100% !important; }
    a { color: inherit; }
    pre { white-space: pre-wrap; }
    h1 { font-size: 24pt; } h2 { font-size: 18pt; } h3 { font-size: 14pt; }
    p, li { font-size: 11pt; line-height: 1.6; }
  </style>
</head>
<body>${el.innerHTML}</body>
</html>`;

    // Create hidden iframe, print inside it, then remove it
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;inset:0;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove after a short delay to allow the print dialog to open
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  /* ── Loading skeleton ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="h-full overflow-y-auto px-6 py-6 space-y-5">
        <div className="h-4 w-24 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="h-9 w-80 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="h-4 w-44 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="space-y-2 pt-6">
          {[90, 75, 85, 60, 70].map((w, i) => (
            <div key={i} className="h-4 bg-[var(--c-hover)] rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="h-full overflow-y-auto px-6 py-6">

      {/* ── Back button ───────────────────────────────────────────────────── */}
      <Link
        href="/herramientas/wiki"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors mb-6 group"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
          className="transition-transform group-hover:-translate-x-0.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver a Wiki
      </Link>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex gap-8 items-start">

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0" id="wiki-print-area">

          {/* Archived banner */}
          {page.is_archived && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
              </svg>
              Esta página está archivada
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold text-[var(--c-text)] leading-tight mb-3 break-words">
            {page.title}
          </h1>

          {/* Relation badges */}
          <WikiRelationBadges page={page} labels={{ workspace: workspaceName || undefined }} />

          {/* Meta */}
          <p className="mt-3 text-xs text-[var(--c-muted)]">
            Actualizado {new Date(page.updated_at).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>

          <hr className="my-6 border-[var(--c-line)]" />

          {/* Content */}
          <WikiViewer content={page.content} />

          {/* Subpages inline at bottom */}
          {page.children.length > 0 && (
            <div className="mt-10 pt-8 border-t border-[var(--c-border)]">
              <h2 className="text-sm font-semibold text-[var(--c-text-sub)] uppercase tracking-wider mb-4">
                Subpáginas
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {page.children.map(child => (
                  <li key={child.id}>
                    <Link
                      href={`/herramientas/wiki/${child.id}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] hover:bg-[var(--c-hover)] hover:border-[var(--c-text-sub)] transition-all text-sm text-[var(--c-text)] group"
                    >
                      <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--c-hover)] group-hover:bg-[var(--c-active-pill)] transition-colors">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                      <span className="truncate font-medium">{child.title}</span>
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
                        className="ml-auto shrink-0 opacity-0 group-hover:opacity-60 transition-opacity">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-52 shrink-0 sticky top-6 space-y-3">

          {/* Primary action */}
          <Link
            href={`/herramientas/wiki/${page.id}/editar`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-[var(--c-text)] text-[var(--c-bg)] rounded-xl hover:opacity-80 transition-opacity"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar página
          </Link>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium border border-[var(--c-border)] text-[var(--c-text-sub)] rounded-xl hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Exportar PDF
          </button>

          {/* Secondary actions */}
          <div className="flex flex-col rounded-xl border border-[var(--c-border)] overflow-hidden">
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors disabled:opacity-50 text-left"
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
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--c-danger)] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Eliminar
            </button>
          </div>

          {/* Breadcrumb path */}
          {page.breadcrumb && page.breadcrumb.length > 1 && (
            <div className="rounded-xl border border-[var(--c-border)] p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-muted)] mb-2">Ubicación</p>
              {/* All ancestors (all crumbs except last, which is the current page) */}
              {page.breadcrumb.slice(0, -1).map((crumb, i) => (
                <Link
                  key={crumb.id}
                  href={`/herramientas/wiki/${crumb.id}`}
                  className="flex items-center gap-1.5 text-xs text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors"
                >
                  <span className="opacity-50">{'›'.repeat(i + 1)}</span>
                  <span className="truncate">{crumb.title}</span>
                </Link>
              ))}
              {/* Current page */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text)] pl-0.5">
                <span className="opacity-50">{'›'.repeat(page.breadcrumb.length)}</span>
                <span className="truncate">{page.title}</span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-[var(--c-bg)] rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[var(--c-border)]">
            <h3 className="font-semibold text-[var(--c-text)] mb-2">¿Eliminar página?</h3>
            <p className="text-sm text-[var(--c-text-sub)] mb-5">
              Esta acción no se puede deshacer. Las subpáginas quedarán huérfanas.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-[var(--c-danger)] text-white text-sm font-medium rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 text-sm border border-[var(--c-border)] rounded-lg hover:bg-[var(--c-hover)] text-[var(--c-text-sub)] transition-colors"
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
