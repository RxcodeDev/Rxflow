import Link from 'next/link';
import type { WikiPageSummary } from '@/types/api.types';

interface WikiRelationBadgesProps {
  page: Pick<WikiPageSummary, 'workspace_id' | 'project_code' | 'epic_id' | 'task_id'>;
  /** Optional display labels resolved externally */
  labels?: {
    workspace?: string;
    project?: string;
    epic?: string;
    task?: string;
  };
}

function Badge({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
}) {
  const cls =
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border border-[var(--c-border)] text-[var(--c-text-sub)] bg-[var(--c-hover)]';

  if (href) {
    return (
      <Link href={href} className={`${cls} hover:text-[var(--c-text)] transition-colors`}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <span className={cls}>
      {icon}
      {label}
    </span>
  );
}

export default function WikiRelationBadges({ page, labels = {} }: WikiRelationBadgesProps) {
  const badges: React.ReactNode[] = [];

  if (page.workspace_id) {
    badges.push(
      <Badge
        key="ws"
        icon={
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        }
        label={labels.workspace ?? page.workspace_id.slice(0, 8)}
      />,
    );
  }

  if (page.project_code) {
    badges.push(
      <Badge
        key="proj"
        icon={
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
          </svg>
        }
        label={labels.project ?? page.project_code}
        href={`/proyectos/${page.project_code}/lista`}
      />,
    );
  }

  if (page.epic_id) {
    badges.push(
      <Badge
        key="epic"
        icon={
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        }
        label={labels.epic ?? 'Épica'}
      />,
    );
  }

  if (page.task_id) {
    badges.push(
      <Badge
        key="task"
        icon={
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        }
        label={labels.task ?? 'Tarea'}
      />,
    );
  }

  if (badges.length === 0) return null;

  return <div className="flex flex-wrap gap-1.5">{badges}</div>;
}
