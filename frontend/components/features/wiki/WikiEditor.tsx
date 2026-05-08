'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Dropcursor from '@tiptap/extension-dropcursor';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { ResizableImage } from './ResizableImage';
import { TiptapViewer } from './WikiViewer';
import SlashMenuFloating, { SLASH_COMMANDS, type SlashCommand } from './SlashMenu';
import { liftEmptyBlock } from 'prosemirror-commands';

const lowlight = createLowlight(common);

// ── Exit special block on Enter → plain paragraph ────────────────────────────
const ExitBlockOnEnter = Extension.create({
  name: 'exitBlockOnEnter',
  priority: 200,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty) return false;

        const paragraphType = state.schema.nodes.paragraph;
        const parentName = $from.parent.type.name;

        // Heading: always split into a fresh paragraph
        if (parentName === 'heading') {
          view.dispatch(state.tr.split($from.pos, 1, [{ type: paragraphType }]));
          return true;
        }

        // Blockquote: when the inner paragraph is empty, lift it out
        if (parentName === 'paragraph' && $from.node(-1)?.type.name === 'blockquote') {
          if ($from.parent.textContent === '') {
            return liftEmptyBlock(state, view.dispatch);
          }
        }

        return false;
      },
    };
  },
});

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

// ── Image helper ─────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main editor ───────────────────────────────────────────────────────────────

type SlashState = { x: number; y: number; activeIndex: number; items: SlashCommand[] } | null;

export default function WikiEditor({ content, onChange, placeholder, title }: WikiEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [slashMenu, setSlashMenu] = useState<SlashState>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const slashStateRef = useRef<SlashState>(null);


  const setSlash = useCallback((menu: SlashState) => {
    slashStateRef.current = menu;
    setSlashMenu(menu);
  }, []);

  const insertImages = useCallback(async (files: FileList | File[]) => {
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    for (const file of images) {
      const src = await fileToBase64(file);
      const ed = editorRef.current;
      if (!ed) continue;
      // setImage then move cursor after it so the user can keep typing
      ed.chain().focus().setImage({ src }).createParagraphNear().run();
    }
  }, []);

  const triggerImagePick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      if (input.files) await insertImages(input.files);
    };
    input.click();
  }, [insertImages]);

  const executeSlash = useCallback((item: SlashCommand) => {
    const ed = editorRef.current;
    if (!ed) return;
    const { $from } = ed.state.selection;
    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
    const match = textBefore.match(/\/(\S*)$/);
    if (match) {
      ed.chain().focus().deleteRange({ from: $from.pos - match[0].length, to: $from.pos }).run();
    } else {
      ed.commands.focus();
    }
    item.action(ed, { triggerImage: triggerImagePick });
    setSlash(null);
  }, [triggerImagePick, setSlash]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ dropcursor: false, codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      ExitBlockOnEnter,
      Dropcursor.configure({ color: '#6366f1', width: 3 }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Empieza a escribir...' }),
      ResizableImage.configure({ allowBase64: true }),
    ],
    content: content ?? { type: 'doc', content: [] },
    editorProps: {
      attributes: { class: 'wiki-prose' },
      handleKeyDown(view, event) {
        const menu = slashStateRef.current;
        if (!menu) return false;
        if (event.key === 'ArrowDown') {
          const next = { ...menu, activeIndex: (menu.activeIndex + 1) % menu.items.length };
          slashStateRef.current = next; setSlashMenu(next);
          return true;
        }
        if (event.key === 'ArrowUp') {
          const prev = { ...menu, activeIndex: (menu.activeIndex - 1 + menu.items.length) % menu.items.length };
          slashStateRef.current = prev; setSlashMenu(prev);
          return true;
        }
        if (event.key === 'Enter') {
          const item = menu.items[menu.activeIndex];
          if (item) executeSlash(item);
          return true;
        }
        if (event.key === 'Escape') {
          setSlash(null);
          return true;
        }
        return false;
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const imageItems = Array.from(items).filter(i => i.type.startsWith('image/'));
        if (imageItems.length === 0) return false;
        event.preventDefault();
        const files = imageItems.map(i => i.getAsFile()).filter(Boolean) as File[];
        void insertImages(files);
        return true;
      },
    },
    onUpdate({ editor: e }) {
      onChange(e.getJSON() as Record<string, unknown>);
    },
  });

  // Keep ref in sync so insertImages always has the live editor instance
  (editorRef as React.MutableRefObject<typeof editor>).current = editor;

  // Sync external content changes (e.g., after async page load)
  useEffect(() => {
    if (!editor || !content) return;
    const cur = JSON.stringify(editor.getJSON());
    const nxt = JSON.stringify(content);
    if (cur !== nxt) editor.commands.setContent(content, false);
  }, [editor, content]);

  // Slash command detection
  useEffect(() => {
    if (!editor) return;
    const detectSlash = () => {
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const match = textBefore.match(/\/(\S*)$/);
      if (!match) {
        if (slashStateRef.current !== null) setSlash(null);
        return;
      }
      const query = match[1].toLowerCase();
      const items = SLASH_COMMANDS.filter(cmd =>
        query === '' ||
        cmd.label.toLowerCase().includes(query) ||
        cmd.keywords.some(k => k.includes(query)),
      );
      const safePos = Math.min(state.selection.from, state.doc.content.size - 1);
      const coords = editor.view.coordsAtPos(safePos);
      setSlash({ x: coords.left, y: coords.bottom + 6, activeIndex: 0, items });
    };
    editor.on('update', detectSlash);
    editor.on('selectionUpdate', detectSlash);
    return () => {
      editor.off('update', detectSlash);
      editor.off('selectionUpdate', detectSlash);
    };
  }, [editor, setSlash]);

  // Clear lightbox when leaving preview mode
  useEffect(() => {
    if (!previewMode) setLightbox(null);
  }, [previewMode]);

  // Escape to close lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

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
    <div
      className="h-full flex flex-col border border-[var(--c-border)] rounded-lg overflow-hidden relative"
      onDragEnter={e => {
        e.preventDefault();
        if (Array.from(e.dataTransfer?.items ?? []).some(i => i.type.startsWith('image/'))) {
          dragCounter.current++;
          setIsDragging(true);
        }
      }}
      onDragLeave={() => {
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={async e => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDragging(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) await insertImages(files);
      }}
    >
      {/* ── Drag overlay ─────────────────────────────────────────────── */}
      {isDragging && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 pointer-events-none"
          style={{
            background: 'rgba(99,102,241,0.07)',
            backdropFilter: 'blur(3px)',
            borderRadius: '0.5rem',
            animation: 'wiki-drag-in 0.15s ease',
          }}
        >
          {/* Animated dashed border ring */}
          <div style={{
            position: 'absolute', inset: 10,
            border: '2.5px dashed #6366f1',
            borderRadius: '0.625rem',
            animation: 'wiki-dash-spin 8s linear infinite',
          }} />
          {/* Icon + label */}
          <div className="relative flex flex-col items-center gap-3">
            <div style={{
              width: 64, height: 64,
              background: 'rgba(99,102,241,0.12)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 8px rgba(99,102,241,0.06)',
            }}>
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="#6366f1" fill="none" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="#6366f1" stroke="none" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold" style={{ color: '#6366f1' }}>Suelta para insertar imagen</span>
            <span className="text-[11px]" style={{ color: 'rgba(99,102,241,0.7)' }}>Se añadirá en el editor</span>
          </div>
        </div>
      )}

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
            <ToolbarBtn onClick={triggerImagePick} title="Insertar imagen">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
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
              <TiptapViewer
                content={editor.getJSON() as Record<string, unknown>}
                onLightbox={setLightbox}
              />
            )
          }
        </div>
      )}

      {/* ── Slash command menu ───────────────────────────────────────── */}
      {slashMenu && slashMenu.items.length > 0 && (
        <SlashMenuFloating
          x={slashMenu.x}
          y={slashMenu.y}
          items={slashMenu.items}
          activeIndex={slashMenu.activeIndex}
          onSelect={executeSlash}
          onClose={() => setSlash(null)}
        />
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
          }}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Cerrar imagen"
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff', fontSize: 22, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              borderRadius: 10,
              boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
              userSelect: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

