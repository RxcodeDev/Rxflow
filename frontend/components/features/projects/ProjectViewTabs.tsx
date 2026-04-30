'use client';

import Link from 'next/link';

type View = 'board' | 'lista' | 'epicas' | 'backlog' | 'cycles';

const TABS: { key: View; label: string }[] = [
  { key: 'board',   label: 'Board'   },
  { key: 'lista',   label: 'Lista'   },
  { key: 'epicas',  label: 'Épicas'  },
  { key: 'backlog', label: 'Backlog' },
  { key: 'cycles',  label: 'Cycles'  },
];

interface ProjectViewTabsProps {
  projectCode: string;
  active: View;
}

export default function ProjectViewTabs({ projectCode, active }: ProjectViewTabsProps) {
  return (
    <nav
      className="flex items-center gap-1 border border-[var(--c-border)] rounded-lg p-1 bg-[var(--c-hover)] w-fit"
      aria-label="Vistas del proyecto"
    >
      {TABS.map(({ key, label }) => (
        active === key ? (
          <span
            key={key}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--c-bg)] text-[var(--c-text)] shadow-sm"
            aria-current="page"
          >
            {label}
          </span>
        ) : (
          <Link
            key={key}
            href={`/proyectos/${projectCode}/${key}`}
            className="px-3 py-1.5 text-xs font-medium rounded text-[var(--c-text-sub)] hover:bg-[var(--c-bg)] transition-colors"
          >
            {label}
          </Link>
        )
      ))}
    </nav>
  );
}
