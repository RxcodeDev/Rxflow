'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiDelete } from '@/lib/api';
import type { WikiPageSummary } from '@/types/api.types';
import { renderWikiIcon } from './wikiIcons';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface WikiPageCardProps {
  page: WikiPageSummary;
  subPages?: WikiPageSummary[];
  onDeleted?: (pageId: string) => void;
}

// Deterministic accent color from id
const ACCENTS = [
  { bg: '#6366f1', light: '#eef2ff' },
  { bg: '#0ea5e9', light: '#e0f2fe' },
  { bg: '#10b981', light: '#d1fae5' },
  { bg: '#f59e0b', light: '#fef3c7' },
  { bg: '#ec4899', light: '#fce7f3' },
  { bg: '#8b5cf6', light: '#ede9fe' },
  { bg: '#14b8a6', light: '#ccfbf1' },
  { bg: '#f97316', light: '#ffedd5' },
];

function accentFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function WikiPageCard({ page, subPages = [], onDeleted }: WikiPageCardProps) {
  const accent = accentFor(page.id);
  const initial = (page.title[0] ?? '?').toUpperCase();
  const isNew = (Date.now() - new Date(page.created_at).getTime()) < 86400000 * 7;
  const wasUpdated = page.updated_by !== null;
  const dateLabel = wasUpdated ? formatDate(page.updated_at) : formatDate(page.created_at);
  const datePrefix = wasUpdated ? 'Editado' : 'Creado';
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const pageHref = `/herramientas/wiki/${page.id}`;

  function navigateToPage() {
    router.push(pageHref);
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmOpen(true);
  }

  async function doDelete() {
    await apiDelete(`/wiki/${page.id}`);
    setConfirmOpen(false);
    onDeleted?.(page.id);
  }

  const chips = [
    page.project_code ? { key: 'proj', label: page.project_code, icon: (
      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )} : null,
    page.epic_id ? { key: 'epic', label: 'Épica', icon: (
      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )} : null,
    page.task_id ? { key: 'task', label: 'Tarea', icon: (
      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )} : null,
  ].filter(Boolean) as { key: string; label: string; icon: React.ReactNode }[];

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        message={`¿Eliminar "${page.title}"? Esta acción no se puede deshacer.`}
        onConfirm={doDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <article
        role="link"
        tabIndex={0}
        onClick={navigateToPage}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateToPage();
          }
        }}
        className="group flex flex-col rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 hover:border-transparent transition-all duration-200 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--c-text-sub)] focus:ring-offset-2"
      >
      {/* ── Header: diseño decorativo + menú ─────── */}
      <div
        className="relative h-9 overflow-visible shrink-0"
        style={{ background: `linear-gradient(135deg, ${accent.bg}20 0%, ${accent.bg}08 100%)` }}
      >
        <div aria-hidden="true" style={{ background: `${accent.bg}1a`, width: 80, height: 80, borderRadius: '50%', position: 'absolute', right: -16, top: -30 }} />
        <div aria-hidden="true" style={{ background: `${accent.bg}10`, width: 46, height: 46, borderRadius: '50%', position: 'absolute', right: 46, bottom: -20 }} />

        {/* Menú 3 puntos */}
        <div ref={menuRef} className="absolute top-1.5 right-2 z-20">
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{ color: accent.bg }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--c-bg)]/70 opacity-100 shadow-sm backdrop-blur-[2px] transition-all hover:bg-black/5 md:h-6 md:w-6 md:bg-transparent md:opacity-0 md:shadow-none md:backdrop-blur-0 md:group-hover:opacity-100"
            aria-label="Opciones"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg py-1 z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/herramientas/wiki/${page.id}/editar`}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--c-danger)] hover:bg-[var(--c-hover)] transition-colors"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-2">

        {/* Icono + título en la misma fila */}
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            style={{ background: accent.bg, color: '#fff', boxShadow: `0 4px 14px ${accent.bg}50`, flexShrink: 0 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold select-none"
          >
            {renderWikiIcon(page.icon, 19) ?? initial}
          </span>
          <h3 className="font-bold text-[var(--c-text)] text-[15px] leading-snug line-clamp-2 min-w-0">
            {page.title}
          </h3>
        </div>

        {/* Chips de relaciones */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {chips.map(r => (
              <span
                key={r.key}
                style={{ background: `${accent.bg}12`, color: accent.bg, border: `1px solid ${accent.bg}28` }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              >
                {r.icon}
                {r.label}
              </span>
            ))}
          </div>
        )}

        {/* Sub-páginas anidadas */}
        {subPages.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {subPages.map(sub => {
              const subInitial = (sub.title[0] ?? '?').toUpperCase();
              return (
                <Link
                  key={sub.id}
                  href={`/herramientas/wiki/${sub.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{ background: `${accent.bg}0d`, border: `1px solid ${accent.bg}22` }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                >
                  <span
                    style={{ background: accent.bg, color: '#fff', flexShrink: 0 }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold select-none"
                  >
                    {renderWikiIcon(sub.icon, 12) ?? subInitial}
                  </span>
                  <span className="text-[12px] font-medium text-[var(--c-text)] truncate">{sub.title}</span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* Footer: fecha | badge + flecha */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[var(--c-line)]">
          <span className="text-[11px] text-[var(--c-muted)] whitespace-nowrap">
            {datePrefix} <span className="text-[var(--c-text-sub)] font-medium">{dateLabel}</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {isNew && !page.is_archived && (
              <span
                style={{ background: `${accent.bg}18`, color: accent.bg, border: `1px solid ${accent.bg}38` }}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none"
              >
                Nuevo
              </span>
            )}
            {page.is_archived && (
              <span
                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none"
              >
                <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                  <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
                </svg>
                Archivado
              </span>
            )}
            <span
              style={{ color: accent.bg }}
              className="opacity-0 group-hover:opacity-100 transition-all duration-150 group-hover:translate-x-0.5 flex items-center"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      </article>
    </>
  );
}
