import Link from 'next/link';

interface BreadcrumbItem {
  id: string;
  title: string;
}

interface WikiBreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function WikiBreadcrumb({ items }: WikiBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--c-text-sub)] flex-wrap">
      <Link href="/herramientas/wiki" className="hover:text-[var(--c-text)] transition-colors flex items-center gap-1">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        Wiki
      </Link>

      {items.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {i === items.length - 1 ? (
            <span className="text-[var(--c-text)] font-medium truncate max-w-[200px]">{item.title}</span>
          ) : (
            <Link
              href={`/herramientas/wiki/${item.id}`}
              className="hover:text-[var(--c-text)] transition-colors truncate max-w-[200px]"
            >
              {item.title}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
