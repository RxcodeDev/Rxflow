'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { ApiWrapped, WikiPageSummary, WikiTreeNode, WorkspaceSummary } from '@/types/api.types';
import WikiPageCard from '@/components/features/wiki/WikiPageCard';
import WikiPageTree from '@/components/features/wiki/WikiPageTree';
import SearchSelect, { type SelectOption } from '@/components/ui/SearchSelect';

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
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[var(--c-border)] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-bg)]">
          <span className="text-[11px] font-semibold text-[var(--c-text-sub)] uppercase tracking-wider">
            Procesos
          </span>
          <Link
            href="/herramientas/wiki/nueva"
            className="text-[11px] font-medium text-[var(--c-text-sub)] hover:text-[var(--c-text)] px-2 py-0.5 rounded-md hover:bg-[var(--c-hover)] transition-colors"
          >
            + Nueva
          </Link>
        </div>
        <div className="p-3">
          {tree.length === 0
            ? <p className="text-xs text-[var(--c-muted)] px-1 py-2">Sin páginas aún</p>
            : <WikiPageTree nodes={tree} />
          }
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col min-h-0">

        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-[var(--c-border)]">
          {/* Title */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--c-hover)]">
              <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true" className="text-[var(--c-text)]">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
            <h1 className="text-lg font-bold text-[var(--c-text)] leading-none">Wiki</h1>
            {!loading && pages.length > 0 && (
              <span className="text-xs text-[var(--c-muted)] bg-[var(--c-hover)] px-2 py-0.5 rounded-full tabular-nums">
                {pages.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Workspace selector */}
            {workspaces.length > 1 && (
              <SearchSelect
                options={workspaces.map((ws): SelectOption => ({
                  value: ws.id,
                  label: ws.name,
                }))}
                value={workspaceId ?? ''}
                onChange={val => setWorkspaceId(val)}
                placeholder="Workspace..."
                hideNone
                className="w-64"
              />
            )}

            {/* Search */}
            <div className="relative">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Buscar procesos..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none focus:border-[var(--c-text-sub)] w-48 transition-colors"
              />
            </div>

            <Link
              href="/herramientas/wiki/nueva"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuevo proceso
            </Link>
          </div>
        </div>

        {/* ── Tabs (mobile) ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 md:hidden shrink-0">
          <button className={tabCls('pages')} onClick={() => setTab('pages')}>Procesos</button>
          <button className={tabCls('tree')} onClick={() => setTab('tree')}>Jerarquía</button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">

          {/* Mobile tree */}
          {tab === 'tree' && (
            <div className="md:hidden border border-[var(--c-border)] rounded-xl p-3">
              <WikiPageTree nodes={tree} />
            </div>
          )}

          {tab !== 'tree' && (
            <>
              {/* Skeleton */}
              {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 bg-[var(--c-hover)] rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}

              {/* No workspace */}
              {!loading && !workspaceId && (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <p className="text-sm text-[var(--c-text-sub)]">
                    No perteneces a ningún workspace.{' '}
                    <Link href="/espacios" className="underline">Ver espacios</Link>
                  </p>
                </div>
              )}

              {/* Empty state */}
              {!loading && workspaceId && pages.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[var(--c-hover)]">
                    <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" fill="none" strokeWidth="1.4" aria-hidden="true" className="text-[var(--c-muted)]">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--c-text)]">
                      {searchQ ? `Sin resultados para "${searchQ}"` : 'Aún no hay procesos'}
                    </p>
                    <p className="text-sm text-[var(--c-text-sub)] mt-1">
                      {searchQ ? 'Prueba con otro término de búsqueda' : 'Crea el primer proceso documentado de tu equipo'}
                    </p>
                  </div>
                  {!searchQ && (
                    <Link
                      href="/herramientas/wiki/nueva"
                      className="flex items-center gap-2 text-sm px-4 py-2 bg-[var(--c-text)] text-[var(--c-bg)] rounded-lg hover:opacity-80 transition-opacity font-medium"
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Crear primer proceso
                    </Link>
                  )}
                </div>
              )}

              {/* Grid */}
              {!loading && pages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {pages.map(p => (
                    <WikiPageCard key={p.id} page={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

