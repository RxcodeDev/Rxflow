'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Dropcursor from '@tiptap/extension-dropcursor';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { ResizableImage } from './ResizableImage';
import SlashMenuFloating, { SLASH_COMMANDS, type SlashCommand } from './SlashMenu';
import { liftEmptyBlock } from 'prosemirror-commands';
import { apiGet } from '@/lib/api';
import type { ApiWrapped, MemberItem } from '@/types/api.types';

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
  onTitleChange?: (title: string) => void;
  placeholder?: string;
  title?: string;
  icon?: string;
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

// ── Mention dropdown ─────────────────────────────────────────────────────────

interface MentionMenuProps {
  x: number;
  y: number;
  items: UserMention[];
  activeIndex: number;
  onSelect: (user: UserMention) => void;
  onClose: () => void;
}

function MentionMenuFloating({ x, y, items, activeIndex, onSelect, onClose }: MentionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuH = items.length * 44 + 8;
  const finalY = y + menuH > window.innerHeight ? y - menuH - 24 : y;
  const finalX = Math.min(x, window.innerWidth - 232);

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: finalX, top: finalY, zIndex: 9999 }}
      className="w-56 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-[0_8px_30px_rgba(0,0,0,0.13)] py-1 overflow-hidden"
    >
      {items.map((user, i) => (
        <button
          key={user.id}
          type="button"
          data-idx={i}
          onMouseDown={e => { e.preventDefault(); onSelect(user); }}
          className={[
            'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
            i === activeIndex ? 'bg-[var(--c-hover)]' : 'hover:bg-[var(--c-hover)]',
          ].join(' ')}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-none" />
          ) : (
            <span
              className="w-6 h-6 rounded-full flex-none flex items-center justify-center text-[10px] font-semibold text-white"
              style={{ background: user.avatarColor ?? 'var(--c-muted)' }}
            >
              {user.initials}
            </span>
          )}
          <span className="text-[12.5px] text-[var(--c-text)] font-medium truncate">{user.name}</span>
        </button>
      ))}
    </div>
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

interface UserMention {
  id: string;
  name: string;
  initials: string;
  avatarColor: string | null;
  avatarUrl: string | null;
}

type MentionState = { x: number; y: number; query: string; activeIndex: number; items: UserMention[] } | null;

export default function WikiEditor({ content, onChange, onTitleChange, placeholder, title }: WikiEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [slashMenu, setSlashMenu] = useState<SlashState>(null);
  const [localTitle, setLocalTitle] = useState(title ?? '');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [mentionMenu, setMentionMenuInternal] = useState<MentionState>(null);
  const [mentionUsers, setMentionUsers] = useState<UserMention[]>([]);
  const dragCounter = useRef(0);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const slashStateRef = useRef<SlashState>(null);
  const mentionStateRef = useRef<MentionState>(null);


  const setSlash = useCallback((menu: SlashState) => {
    slashStateRef.current = menu;
    setSlashMenu(menu);
  }, []);

  const setMention = useCallback((menu: MentionState) => {
    mentionStateRef.current = menu;
    setMentionMenuInternal(menu);
  }, []);

  const insertMention = useCallback((user: UserMention) => {
    const ed = editorRef.current;
    if (!ed) return;
    const { $from } = ed.state.selection;
    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
    const match = textBefore.match(/@([^\s]*)$/);
    if (match) {
      ed.chain().focus().deleteRange({ from: $from.pos - match[0].length, to: $from.pos }).run();
    }
    ed.chain().focus().insertContent([
      {
        type: 'text',
        marks: [{ type: 'textStyle', attrs: { color: '#22c55e' } }],
        text: `@${user.name}`,
      },
      { type: 'text', text: ' ' },
    ]).run();
    setMention(null);
  }, [setMention]);

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
      GlobalDragHandle.configure({ dragHandleWidth: 20, scrollTreshold: 100 }),
      Dropcursor.configure({ color: '#6366f1', width: 3 }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Empieza a escribir...' }),
      ResizableImage.configure({ allowBase64: true }),
      TextStyle,
      Color,
    ],
    content: content ?? { type: 'doc', content: [] },
    editorProps: {
      attributes: { class: 'wiki-prose' },
      handleKeyDown(view, event) {
        // @mention menu takes priority over slash
        const mMenu = mentionStateRef.current;
        if (mMenu && mMenu.items.length > 0) {
          if (event.key === 'ArrowDown') {
            setMention({ ...mMenu, activeIndex: (mMenu.activeIndex + 1) % mMenu.items.length });
            return true;
          }
          if (event.key === 'ArrowUp') {
            setMention({ ...mMenu, activeIndex: (mMenu.activeIndex - 1 + mMenu.items.length) % mMenu.items.length });
            return true;
          }
          if (event.key === 'Enter') {
            const user = mMenu.items[mMenu.activeIndex];
            if (user) insertMention(user);
            return true;
          }
          if (event.key === 'Escape') {
            setMention(null);
            return true;
          }
        }
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

  // Sync localTitle from prop (sidebar input → editor title)
  useEffect(() => {
    if (title !== undefined && title !== localTitle) setLocalTitle(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

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

  // @mention detection
  useEffect(() => {
    if (!editor) return;
    const detectMention = () => {
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const match = textBefore.match(/@([^\s]*)$/);
      if (!match) {
        if (mentionStateRef.current !== null) setMention(null);
        return;
      }
      const query = match[1].toLowerCase();
      const items = mentionUsers
        .filter(u => query === '' || u.name.toLowerCase().includes(query))
        .slice(0, 7);
      const safePos = Math.min(state.selection.from, state.doc.content.size - 1);
      const coords = editor.view.coordsAtPos(safePos);
      setMention({ x: coords.left, y: coords.bottom + 6, query: match[1], activeIndex: 0, items });
    };
    editor.on('update', detectMention);
    editor.on('selectionUpdate', detectMention);
    return () => {
      editor.off('update', detectMention);
      editor.off('selectionUpdate', detectMention);
    };
  }, [editor, mentionUsers, setMention]);

  // Fetch users for @mention
  useEffect(() => {
    apiGet<ApiWrapped<MemberItem[]>>('/users')
      .then(r => setMentionUsers(r.data.map(u => ({
        id: u.id, name: u.name, initials: u.initials,
        avatarColor: u.avatar_color, avatarUrl: u.avatar_url,
      }))))
      .catch(() => {});
  }, []);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };

  return (
    <div
      className="relative flex h-full min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] md:rounded-lg"
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

      {/* ── Toolbar (always editable, Notion-style) ───────────────────── */}
      <div className="shrink-0 border-b border-[var(--c-border)] bg-[var(--c-hover)]">
        {(
          <div className="overflow-x-auto px-2 py-1.5">
            <div className="flex min-w-max items-center gap-0.5">
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

            {/* ── Color picker ─────────────────────────────────────── */}
            <div className="relative">
              <button
                type="button"
                title="Color de texto"
                onClick={() => setColorPickerOpen(o => !o)}
                className={[
                  'p-1.5 rounded text-sm leading-none transition-colors flex flex-col items-center gap-0.5',
                  colorPickerOpen
                    ? 'bg-[var(--c-active-pill)] text-[var(--c-text)]'
                    : 'text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)]',
                ].join(' ')}
              >
                <span className="font-bold text-xs leading-none" style={{ color: editor.getAttributes('textStyle').color ?? 'var(--c-text)' }}>A</span>
                <span
                  className="block h-[3px] w-[13px] rounded-full"
                  style={{ background: editor.getAttributes('textStyle').color ?? 'var(--c-text)' }}
                />
              </button>

              {colorPickerOpen && (
                <>
                  {/* Overlay to close */}
                  <div className="fixed inset-0 z-40" onClick={() => setColorPickerOpen(false)} />
                  <div
                    className="absolute top-full left-0 mt-1 z-50 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-lg p-3"
                    style={{ minWidth: 168 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="text-[10px] font-semibold text-[var(--c-text-sub)] uppercase tracking-wide mb-2">Color de texto</p>
                    <div className="grid grid-cols-7 gap-1.5 mb-2">
                      {[
                        '#111111','#4B5563','#9CA3AF',
                        '#EF4444','#F97316','#EAB308','#22C55E',
                        '#3B82F6','#8B5CF6','#EC4899','#14B8A6',
                        '#B91C1C','#C2410C','#A16207','#15803D',
                        '#1D4ED8','#6D28D9','#BE185D','#0F766E',
                        '#fff',
                      ].map(color => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          onClick={() => { editor.chain().focus().setColor(color).run(); setColorPickerOpen(false); }}
                          className="w-5 h-5 rounded-full border transition-transform hover:scale-110 focus:outline-none"
                          style={{
                            background: color,
                            borderColor: editor.getAttributes('textStyle').color === color ? '#6366f1' : color === '#fff' ? 'var(--c-border)' : color,
                            boxShadow: editor.getAttributes('textStyle').color === color ? '0 0 0 2px #6366f180' : undefined,
                          }}
                        />
                      ))}
                    </div>
                    {editor.getAttributes('textStyle').color && (
                      <button
                        type="button"
                        onClick={() => { editor.chain().focus().unsetColor().run(); setColorPickerOpen(false); }}
                        className="w-full text-[11px] text-[var(--c-text-sub)] hover:text-[var(--c-danger)] transition-colors text-left py-0.5"
                      >
                        × Quitar color
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

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
          </div>
        )}
      </div>

      {/* ── Editor pane (always editable) ─────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto py-4 pl-9 pr-4 md:py-3">
        {/* Editable title */}
        {onTitleChange !== undefined && (
          <input
            type="text"
            value={localTitle}
            onChange={e => { setLocalTitle(e.target.value); onTitleChange(e.target.value); }}
            placeholder="Título del documento"
            className="mb-3 w-full border-none bg-transparent text-[1.9rem] font-bold leading-[1.05] text-[var(--c-text)] outline-none placeholder:text-[var(--c-muted)] md:text-2xl"
          />
        )}
        <EditorContent editor={editor} />
      </div>

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

      {/* ── @mention dropdown ────────────────────────────────────────── */}
      {mentionMenu && mentionMenu.items.length > 0 && (
        <MentionMenuFloating
          x={mentionMenu.x}
          y={mentionMenu.y}
          items={mentionMenu.items}
          activeIndex={mentionMenu.activeIndex}
          onSelect={insertMention}
          onClose={() => setMention(null)}
        />
      )}
    </div>
  );
}

