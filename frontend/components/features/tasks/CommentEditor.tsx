'use client';

/**
 * CommentEditor
 * Rich-text comment input for TaskDrawer.
 * Reuses the same Tiptap stack as WikiEditor: slash commands (/), image upload,
 * and @mention — but stripped down to comment-appropriate size.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { ResizableImage } from '../wiki/ResizableImage';
import SlashMenuFloating, { SLASH_COMMANDS, type SlashCommand } from '../wiki/SlashMenu';

const lowlight = createLowlight(common);

// ── Types ─────────────────────────────────────────────────────────────────────

export type CommentDoc = Record<string, unknown>;

interface UserOpt {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  avatarColor: string | null;
}

interface MentionState {
  x: number;
  y: number;
  query: string;
  activeIndex: number;
  items: UserOpt[];
}

type SlashState = {
  x: number;
  y: number;
  activeIndex: number;
  items: SlashCommand[];
} | null;

interface CommentEditorProps {
  users: UserOpt[];
  onSubmit: (doc: CommentDoc) => Promise<void>;
  disabled?: boolean;
  initialContent?: CommentDoc | null;
  submitLabel?: string;
  onCancel?: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Editor component ──────────────────────────────────────────────────────────

export default function CommentEditor({ users, onSubmit, disabled = false, initialContent, submitLabel, onCancel }: CommentEditorProps) {
  const [slashMenu, setSlashMenuState] = useState<SlashState>(null);
  const [mentionMenu, setMentionMenuState] = useState<MentionState | null>(null);
  const [posting, setPosting] = useState(false);
  const [isEmpty, setIsEmpty] = useState(initialContent == null);

  const slashRef = useRef<SlashState>(null);
  const mentionRef = useRef<MentionState | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const setSlash = useCallback((s: SlashState) => { slashRef.current = s; setSlashMenuState(s); }, []);
  const setMention = useCallback((m: MentionState | null) => { mentionRef.current = m; setMentionMenuState(m); }, []);

  const insertMention = useCallback((user: UserOpt) => {
    const ed = editorRef.current;
    if (!ed) return;
    const { $from } = ed.state.selection;
    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
    const match = textBefore.match(/@([^\s]*)$/);
    if (match) {
      ed.chain().focus().deleteRange({ from: $from.pos - match[0].length, to: $from.pos }).run();
    }
    ed.chain().focus().insertContent([
      { type: 'text', marks: [{ type: 'textStyle', attrs: { color: '#22c55e' } }], text: `@${user.name}` },
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
      ed.chain().focus().setImage({ src }).createParagraphNear().run();
    }
  }, []);

  const triggerImagePick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => { if (input.files) await insertImages(input.files); };
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
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: 'Escribe un comentario… usa / para dar formato o @ para mencionar' }),
      ResizableImage.configure({ allowBase64: true }),
      TextStyle,
      Color,
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: { class: 'comment-editor-prose' },
      handleKeyDown(_view, event) {
        // @mention priority
        const mMenu = mentionRef.current;
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
          if (event.key === 'Escape') { setMention(null); return true; }
        }
        // Slash menu
        const menu = slashRef.current;
        if (menu) {
          if (event.key === 'ArrowDown') {
            const next = { ...menu, activeIndex: (menu.activeIndex + 1) % menu.items.length };
            slashRef.current = next; setSlashMenuState(next);
            return true;
          }
          if (event.key === 'ArrowUp') {
            const prev = { ...menu, activeIndex: (menu.activeIndex - 1 + menu.items.length) % menu.items.length };
            slashRef.current = prev; setSlashMenuState(prev);
            return true;
          }
          if (event.key === 'Enter') {
            const item = menu.items[menu.activeIndex];
            if (item) executeSlash(item);
            return true;
          }
          if (event.key === 'Escape') { setSlash(null); return true; }
        }
        // Cmd/Ctrl+Enter → submit
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          void handleSubmit();
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
      setIsEmpty(e.isEmpty);
      // Slash detection
      const { state } = e;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashMatch = textBefore.match(/\/(\S*)$/);
      if (!slashMatch) {
        if (slashRef.current !== null) setSlash(null);
      } else {
        const query = slashMatch[1].toLowerCase();
        const items = SLASH_COMMANDS.filter(cmd =>
          query === '' ||
          cmd.label.toLowerCase().includes(query) ||
          cmd.keywords.some(k => k.includes(query)),
        );
        const safePos = Math.min(state.selection.from, state.doc.content.size - 1);
        const coords = e.view.coordsAtPos(safePos);
        setSlash({ x: coords.left, y: coords.bottom + 6, activeIndex: 0, items });
      }
      // @mention detection
      const mentionMatch = textBefore.match(/@([^\s]*)$/);
      if (!mentionMatch) {
        if (mentionRef.current !== null) setMention(null);
      } else {
        const query = mentionMatch[1].toLowerCase();
        const items = users.filter(u =>
          query === '' || u.name.toLowerCase().includes(query),
        );
        const safePos2 = Math.min(state.selection.from, state.doc.content.size - 1);
        const coords2 = e.view.coordsAtPos(safePos2);
        setMention({ x: coords2.left, y: coords2.bottom + 6, query, activeIndex: 0, items });
      }
    },
  });

  (editorRef as React.MutableRefObject<typeof editor>).current = editor;

  async function handleSubmit() {
    const ed = editorRef.current;
    if (!ed || ed.isEmpty || posting || disabled) return;
    const doc = ed.getJSON() as CommentDoc;
    setPosting(true);
    try {
      await onSubmit(doc);
      if (!initialContent) {
        ed.commands.clearContent(true);
        setIsEmpty(true);
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="comment-editor-wrap">
      {/* Slash menu portal */}
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

      {/* @mention menu portal */}
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

      <div className="comment-editor-field">
        <EditorContent editor={editor} />
      </div>

      <div className="comment-editor-bottom">
        {onCancel && (
          <button type="button" className="comment-editor-cancel" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button
          type="button"
          className="comment-editor-submit"
          onClick={handleSubmit}
          disabled={posting || isEmpty || disabled}
        >
          {posting ? '...' : (submitLabel ?? 'Comentar')}
        </button>
      </div>
    </div>
  );
}

// ── Mention floating menu ─────────────────────────────────────────────────────

function MentionMenuFloating({
  x, y, items, activeIndex, onSelect, onClose,
}: {
  x: number;
  y: number;
  items: UserOpt[];
  activeIndex: number;
  onSelect: (u: UserOpt) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

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
