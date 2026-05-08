'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import type { ApiWrapped, WikiPageDetail } from '@/types/api.types';
import WikiBreadcrumb from '@/components/features/wiki/WikiBreadcrumb';
import WikiRelationBadges from '@/components/features/wiki/WikiRelationBadges';
import dynamic from 'next/dynamic';

const WikiViewer = dynamic(() => import('@/components/features/wiki/WikiViewer'), { ssr: false });

export default function WikiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<WikiPageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<ApiWrapped<WikiPageDetail>>(`/wiki/${id}`)
      .then(r => { if (r.ok) setPage(r.data); })
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="h-4 w-56 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="h-8 w-72 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="h-4 w-40 bg-[var(--c-hover)] rounded animate-pulse" />
        <div className="space-y-2 pt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-[var(--c-hover)] rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <WikiBreadcrumb items={page.breadcrumb} />

      {/* Title + actions */}
      <div className="flex items-start gap-3 mt-4 mb-3">
        <h1 className="flex-1 text-2xl font-bold text-[var(--c-text)] leading-tight">{page.title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/herramientas/wiki/${page.id}/editar`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--c-border)] rounded-lg text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </Link>

          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            title={page.is_archived ? 'Restaurar' : 'Archivar'}
            className="p-2 text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg hover:bg-[var(--c-hover)] hover:text-[var(--c-text)] transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            title="Eliminar"
            className="p-2 text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg hover:bg-red-50 hover:text-[var(--c-danger)] hover:border-[var(--c-danger)] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Archived badge */}
      {page.is_archived && (
        <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--c-hover)] border border-[var(--c-border)] rounded-full text-xs text-[var(--c-text-sub)]">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
          </svg>
          Archivada
        </div>
      )}

      {/* Relation badges */}
      <WikiRelationBadges page={page} />

      {/* Meta */}
      <p className="mt-2 text-xs text-[var(--c-muted)]">
        Actualizado {new Date(page.updated_at).toLocaleDateString('es-MX', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>

      <hr className="my-5 border-[var(--c-line)]" />

      {/* Content */}
      <WikiViewer content={page.content} />

      {/* Children pages */}
      {page.children.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-semibold text-[var(--c-text)] mb-3">Páginas relacionadas</h2>
          <ul className="space-y-1.5">
            {page.children.map(child => (
              <li key={child.id}>
                <Link
                  href={`/herramientas/wiki/${child.id}`}
                  className="flex items-center gap-2 text-sm text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {child.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delete confirmation dialog */}
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
