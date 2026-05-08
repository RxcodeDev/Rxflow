import Link from 'next/link';
import type { WikiPageSummary } from '@/types/api.types';

interface WikiPageCardProps {
  page: WikiPageSummary;
}

// Deterministic accent color from id
const ACCENTS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
function accentFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function RelationPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--c-hover)] text-[var(--c-text-sub)] border border-[var(--c-border)]">
      {icon}
      {label}
    </span>
  );
}

export default function WikiPageCard({ page }: WikiPageCardProps) {
  const accent = accentFor(page.id);

  const updated = new Date(page.updated_at).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short',
  });

  const initial = (page.title[0] ?? '?').toUpperCase();

  return (
    <Link
      href={`/herramientas/wiki/${page.id}`}
      className="group relative flex flex-col gap-3 p-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface,var(--c-bg))] hover:border-[var(--c-text-sub)] hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Subtle left accent bar */}
      <span
        aria-hidden="true"
        style={{ background: accent }}
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl opacity-60 group-hover:opacity-100 transition-opacity"
      />

      {/* Top row: icon + title + arrow */}
      <div className="flex items-start gap-3">
        {/* Avatar with accent */}
        <span
          aria-hidden="true"
          style={{ background: `${accent}18`, color: accent }}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold select-none"
        >
          {initial}
        </span>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--c-text)] leading-snug group-hover:text-[var(--c-text)] line-clamp-2">
            {page.title}
          </h3>
          {page.is_archived && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full">
              <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
              </svg>
              Archivado
            </span>
          )}
        </div>

        {/* Arrow — appears on hover */}
        <svg
          viewBox="0 0 24 24" width="14" height="14"
          stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
          className="shrink-0 mt-1 text-[var(--c-muted)] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Bottom row: relation pills + date */}
      <div className="flex flex-wrap items-center gap-1.5">
        {page.project_code && (
          <RelationPill
            icon={
              <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            }
            label={page.project_code}
          />
        )}
        {page.epic_id && (
          <RelationPill
            icon={
              <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            }
            label="Épica"
          />
        )}
        {page.task_id && (
          <RelationPill
            icon={
              <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
            label="Tarea"
          />
        )}
        {page.parent_page_id && (
          <RelationPill
            icon={
              <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            }
            label="Subpágina"
          />
        )}

        <span className="ml-auto text-[11px] text-[var(--c-muted)] tabular-nums shrink-0">{updated}</span>
      </div>
    </Link>
  );
}
