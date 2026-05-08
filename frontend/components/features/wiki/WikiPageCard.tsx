import Link from 'next/link';
import type { WikiPageSummary } from '@/types/api.types';

interface WikiPageCardProps {
  page: WikiPageSummary;
}

const RELATION_LABELS: Record<string, string> = {
  workspace: 'Workspace',
  project: 'Proyecto',
  epic: 'Épica',
  task: 'Tarea',
};

export default function WikiPageCard({ page }: WikiPageCardProps) {
  const relations: string[] = [];
  if (page.workspace_id) relations.push(RELATION_LABELS.workspace);
  if (page.project_code) relations.push(page.project_code);
  if (page.epic_id) relations.push(RELATION_LABELS.epic);
  if (page.task_id) relations.push(RELATION_LABELS.task);

  const updated = new Date(page.updated_at).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <Link
      href={`/herramientas/wiki/${page.id}`}
      className="block p-4 border border-[var(--c-border)] rounded-xl hover:border-[var(--c-text-sub)] hover:bg-[var(--c-hover)] transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-[var(--c-muted)] group-hover:text-[var(--c-text-sub)] transition-colors">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[var(--c-text)] truncate group-hover:underline underline-offset-2">
            {page.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {relations.map(r => (
              <span
                key={r}
                className="text-xs px-1.5 py-0.5 rounded bg-[var(--c-active-pill)] text-[var(--c-text-sub)]"
              >
                {r}
              </span>
            ))}
            <span className="text-xs text-[var(--c-muted)] ml-auto">{updated}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
