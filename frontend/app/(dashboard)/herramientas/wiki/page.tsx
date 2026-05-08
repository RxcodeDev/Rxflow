'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { ApiWrapped, WikiPageSummary, WikiTreeNode, WorkspaceSummary } from '@/types/api.types';
import WikiPageCard from '@/components/features/wiki/WikiPageCard';
import WikiPageTree from '@/components/features/wiki/WikiPageTree';

type Tab = 'pages' | 'tree';

export default function WikiPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [tree, setTree] = useState<WikiTreeNode[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [tab, setTab] = useState<Tab>('pages');
  const [loading, setLoading] = useState(true);

  // Resolve workspaces first
  useEffect(() => {
    apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces')
      .then(r => {
        if (r.ok && r.data.length > 0) {
          setWorkspaces(r.data);
          setWorkspaceId(r.data[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // Load pages whenever workspace resolves
  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);

    const q = searchQ.trim();
    const endpoint = q
      ? `/wiki/search?workspaceId=${workspaceId}&q=${encodeURIComponent(q)}`
      : `/wiki?workspaceId=${workspaceId}`;

    apiGet<ApiWrapped<WikiPageSummary[]>>(endpoint)
      .then(r => { if (r.ok) setPages(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (!q) {
      apiGet<ApiWrapped<WikiTreeNode[]>>(`/wiki/tree?workspaceId=${workspaceId}`)
        .then(r => { if (r.ok) setTree(r.data); })
        .catch(() => {});
    }
  }, [workspaceId, searchQ]);

  const tabCls = (t: Tab) =>
    [
      'px-4 py-2 text-sm rounded-lg transition-colors',
      tab === t
        ? 'bg-[var(--c-active-pill)] text-[var(--c-text)] font-medium'
        : 'text-[var(--c-text-sub)] hover:bg-[var(--c-hover)]',
    ].join(' ');

  return (
    <div className="flex flex-col md:flex-row gap-0 h-full min-h-0">
      {/* ── Left: tree sidebar (desktop only) ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--c-border)] p-4 gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--c-text-sub)] uppercase tracking-wide">
            Procesos
          </span>
          <Link
            href="/herramientas/wiki/nueva"
            className="text-xs text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors"
          >
            + Nueva
          </Link>
        </div>
        <WikiPageTree nodes={tree} />
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true" className="shrink-0 text-[var(--c-text)]">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <h1 className="text-xl font-bold text-[var(--c-text)]">Wiki</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Workspace selector */}
            {workspaces.length > 1 && (
              <select
                value={workspaceId ?? ''}
                onChange={e => setWorkspaceId(e.target.value)}
                className="px-2 py-1.5 text-sm border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] focus:outline-none focus:border-[var(--c-text-sub)] transition-colors"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            )}
            {/* Search */}
            <div className="relative">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Buscar procesos..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] w-44 transition-colors"
              />
            </div>

            <Link
              href="/herramientas/wiki/nueva"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuevo proceso
            </Link>
          </div>
        </div>

        {/* Tabs (mobile: show tree tab; desktop: only pages) */}
        <div className="flex items-center gap-1 mb-4 md:hidden">
          <button className={tabCls('pages')} onClick={() => setTab('pages')}>Procesos</button>
          <button className={tabCls('tree')} onClick={() => setTab('tree')}>Jerarquía</button>
        </div>

        {/* Mobile tree */}
        {tab === 'tree' && (
          <div className="md:hidden border border-[var(--c-border)] rounded-xl p-3">
            <WikiPageTree nodes={tree} />
          </div>
        )}

        {/* Pages list */}
        {(tab === 'pages' || true) && tab !== 'tree' && (
          <>
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-[var(--c-hover)] rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!loading && !workspaceId && (
              <p className="text-sm text-[var(--c-text-sub)]">
                No perteneces a ningún workspace.{' '}
                <Link href="/espacios" className="underline">Ver espacios</Link>
              </p>
            )}

            {!loading && workspaceId && pages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.5" aria-hidden="true" className="text-[var(--c-muted)]">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <p className="text-[var(--c-text-sub)]">
                  {searchQ ? `Sin resultados para "${searchQ}"` : 'Aún no hay procesos'}
                </p>
                {!searchQ && (
                  <Link
                    href="/herramientas/wiki/nueva"
                    className="text-sm px-4 py-2 border border-[var(--c-border)] rounded-lg hover:bg-[var(--c-hover)] text-[var(--c-text)] transition-colors"
                  >
                    Crear primer proceso
                  </Link>
                )}
              </div>
            )}

            {!loading && pages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pages.map(p => (
                  <WikiPageCard key={p.id} page={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

