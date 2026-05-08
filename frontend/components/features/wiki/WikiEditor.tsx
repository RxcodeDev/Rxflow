'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface WikiEditorProps {
  content?: Record<string, unknown>;
  onChange: (json: Record<string, unknown>) => void;
  placeholder?: string;
  title?: string;
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'p-1.5 rounded text-sm leading-none transition-colors',
        active
          ? 'bg-[var(--c-active-pill)] text-[var(--c-text)]'
          : 'text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export default function WikiEditor({ content, onChange, placeholder, title }: WikiEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Empieza a escribir...' }),
    ],
    content: content ?? { type: 'doc', content: [] },
    editorProps: {
      attributes: { class: 'wiki-prose' },
    },
    onUpdate({ editor: e }) {
      onChange(e.getJSON() as Record<string, unknown>);
    },
  });

  // Sync external content changes (e.g., after async page load)
  useEffect(() => {
    if (!editor || !content) return;
    const cur = JSON.stringify(editor.getJSON());
    const nxt = JSON.stringify(content);
    if (cur !== nxt) editor.commands.setContent(content, false);
  }, [editor, content]);

  if (!editor) return null;

  const tabCls = (active: boolean) =>
    [
      'px-3 py-2 text-xs font-medium transition-colors border-b-2 shrink-0',
      active
        ? 'text-[var(--c-text)] border-[var(--c-text)]'
        : 'text-[var(--c-text-sub)] border-transparent hover:text-[var(--c-text)]',
    ].join(' ');

  const setLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };

  return (
    <div className="h-full flex flex-col border border-[var(--c-border)] rounded-lg overflow-hidden">

      {/* ── Top bar: tabs + toolbar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-stretch border-b border-[var(--c-border)] bg-[var(--c-hover)] shrink-0">

        {/* Tabs */}
        <div className="flex items-center border-r border-[var(--c-border)] shrink-0">
          <button type="button" onClick={() => setPreviewMode(false)} className={tabCls(!previewMode)}>
            Editar
          </button>
          <button type="button" onClick={() => setPreviewMode(true)} className={tabCls(previewMode)}>
            Vista previa
          </button>
        </div>

        {/* Toolbar — only in edit mode */}
        {!previewMode && (
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1">
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Negrita"
            >
              <strong>B</strong>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Cursiva"
            >
              <em>I</em>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Código inline"
            >
              <span className="font-mono text-xs">{`</>`}</span>
            </ToolbarBtn>

            <span className="w-px bg-[var(--c-border)] mx-1 self-stretch" />

            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Encabezado 1"
            >H1</ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Encabezado 2"
            >H2</ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Encabezado 3"
            >H3</ToolbarBtn>

            <span className="w-px bg-[var(--c-border)] mx-1 self-stretch" />

            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Lista con viñetas"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
                <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Lista numerada"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
                <path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Cita"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
              title="Bloque de código"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
              </svg>
            </ToolbarBtn>

            <span className="w-px bg-[var(--c-border)] mx-1 self-stretch" />

            <ToolbarBtn
              onClick={setLink}
              active={editor.isActive('link')}
              title="Enlace"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </ToolbarBtn>

            <span className="w-px bg-[var(--c-border)] mx-1 self-stretch" />

            <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
              </svg>
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.49-4.95" />
              </svg>
            </ToolbarBtn>
          </div>
        )}
      </div>

      {/* ── Editor pane (always in DOM, hidden when preview) ──────────── */}
      <div className={`flex-1 min-h-0 overflow-auto px-4 py-3${previewMode ? ' hidden' : ''}`}>
        <EditorContent editor={editor} />
      </div>

      {/* ── Preview pane ─────────────────────────────────────────────── */}
      {previewMode && (
        <div className="flex-1 min-h-0 overflow-auto px-5 py-5">
          {title
            ? <h1 className="text-2xl font-bold text-[var(--c-text)] mb-5 leading-tight">{title}</h1>
            : <p className="text-xs text-[var(--c-muted)] italic mb-5">— Sin título —</p>
          }
          {editor.isEmpty
            ? <p className="text-sm text-[var(--c-muted)]">Sin contenido aún.</p>
            : (
              /* eslint-disable-next-line react/no-danger */
              <div className="wiki-prose" dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
            )
          }
        </div>
      )}
    </div>
  );
}

