'use client';

import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SlashCommandContext {
  triggerImage: () => void;
}

export interface SlashCommand {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  keywords: string[];
  action: (editor: Editor, ctx: SlashCommandContext) => void;
}

// ── Commands list ─────────────────────────────────────────────────────────────

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'text',
    label: 'Texto',
    desc: 'Párrafo normal',
    keywords: ['text', 'paragraph', 'p', 'normal', 'texto'],
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    ),
    action: ed => ed.chain().focus().setParagraph().run(),
  },
  {
    id: 'h1',
    label: 'Encabezado 1',
    desc: 'Título grande',
    keywords: ['h1', 'heading', 'titulo', 'encabezado'],
    icon: <span className="text-[12px] font-bold leading-none">H1</span>,
    action: ed => ed.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Encabezado 2',
    desc: 'Título mediano',
    keywords: ['h2', 'heading', 'titulo', 'encabezado'],
    icon: <span className="text-[12px] font-bold leading-none">H2</span>,
    action: ed => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Encabezado 3',
    desc: 'Título pequeño',
    keywords: ['h3', 'heading', 'titulo', 'encabezado'],
    icon: <span className="text-[12px] font-bold leading-none">H3</span>,
    action: ed => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet',
    label: 'Lista',
    desc: 'Lista con viñetas',
    keywords: ['bullet', 'list', 'ul', 'lista', 'viñetas'],
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Lista numerada',
    desc: 'Lista ordenada',
    keywords: ['ordered', 'ol', 'numerada', 'lista'],
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
        <path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'quote',
    label: 'Cita',
    desc: 'Bloque de cita',
    keywords: ['quote', 'blockquote', 'cita'],
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Código',
    desc: 'Bloque de código',
    keywords: ['code', 'codeblock', 'codigo', 'programacion'],
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: 'Divisor',
    desc: 'Línea horizontal',
    keywords: ['divider', 'hr', 'linea', 'separador', 'rule'],
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
    action: ed => ed.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'image',
    label: 'Imagen',
    desc: 'Subir o pegar imagen',
    keywords: ['image', 'img', 'foto', 'imagen', 'photo'],
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    action: (_ed, ctx) => ctx.triggerImage(),
  },
];

// ── Floating menu component ───────────────────────────────────────────────────

interface SlashMenuFloatingProps {
  x: number;
  y: number;
  items: SlashCommand[];
  activeIndex: number;
  onSelect: (item: SlashCommand) => void;
  onClose: () => void;
}

export default function SlashMenuFloating({
  x, y, items, activeIndex, onSelect, onClose,
}: SlashMenuFloatingProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll active item into view
  useEffect(() => {
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuH = 296;
  const finalY = y + menuH > window.innerHeight ? y - menuH - 24 : y;
  const finalX = Math.min(x, window.innerWidth - 248);

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: finalX, top: finalY, zIndex: 9999 }}
      className="w-60 max-h-[296px] overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-[0_8px_30px_rgba(0,0,0,0.13)] py-1"
    >
      {items.length === 0 ? (
        <p className="px-3 py-2.5 text-xs text-[var(--c-muted)]">Sin resultados</p>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            data-idx={i}
            onMouseDown={e => { e.preventDefault(); onSelect(item); }}
            className={[
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              i === activeIndex ? 'bg-[var(--c-hover)]' : 'hover:bg-[var(--c-hover)]',
            ].join(' ')}
          >
            <span className="flex-none w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-text-sub)]">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium text-[var(--c-text)] leading-tight">{item.label}</div>
              <div className="text-[11px] text-[var(--c-text-sub)] leading-tight">{item.desc}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
