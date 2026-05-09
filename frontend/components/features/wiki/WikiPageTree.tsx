'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { WikiTreeNode } from '@/types/api.types';
import { renderWikiIcon } from './wikiIcons';

interface WikiPageTreeProps {
  nodes: WikiTreeNode[];
  currentId?: string;
}

function TreeNode({ node, currentId, depth }: { node: WikiTreeNode; currentId?: string; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isActive = node.id === currentId;

  return (
    <li>
      <div
        className={[
          'flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm transition-colors group',
          isActive
            ? 'bg-[var(--c-active-pill)] text-[var(--c-text)] font-medium'
            : 'text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)]',
        ].join(' ')}
        style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
      >
        {/* Toggle children */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setOpen(v => !v); }}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-muted)] hover:bg-[var(--c-bg)]"
          aria-label={open ? 'Colapsar' : 'Expandir'}
        >
          {hasChildren ? (
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2.5" aria-hidden="true"
              style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <span className="w-1 h-1 rounded-full bg-[var(--c-muted)] block mx-auto" />
          )}
        </button>

        {/* Page icon */}
        {node.icon ? (
          <span aria-hidden="true" className="shrink-0 flex items-center justify-center w-[13px] h-[13px] text-[var(--c-text-sub)]">
            {renderWikiIcon(node.icon, 13)}
          </span>
        ) : (
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}

        <Link
          href={`/herramientas/wiki/${node.id}`}
          className="flex-1 min-w-0 truncate py-0.5"
        >
          {node.title}
        </Link>
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} currentId={currentId} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function WikiPageTree({ nodes, currentId }: WikiPageTreeProps) {
  if (nodes.length === 0) {
    return (
      <p className="text-xs text-[var(--c-muted)] px-2 py-2">Sin páginas aún</p>
    );
  }

  return (
    <ul className="space-y-1">
      {nodes.map(node => (
        <TreeNode key={node.id} node={node} currentId={currentId} depth={0} />
      ))}
    </ul>
  );
}
