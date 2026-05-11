'use client';

/**
 * DescriptionEditor
 * Rich-text inline editor for a task's description field.
 * Supports: slash commands (/), image paste/upload, bold, italic, lists, etc.
 * Saves via onSave(jsonString) on blur. No submit button.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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

interface DescriptionEditorProps {
  /** Raw value from API: plain string, JSON string (Tiptap doc), or null */
  initialContent: string | null;
  /** Called on blur with JSON.stringify(tiptapDoc). Pass null to clear. */
  onSave: (content: string | null) => void;
  disabled?: boolean;
  onLightbox?: (src: string) => void;
}

type SlashState = {
  x: number;
  y: number;
  activeIndex: number;
  items: SlashCommand[];
} | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Try to parse a raw description string as a Tiptap JSON doc. */
function parseContent(raw: string | null): Record<string, unknown> | string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.type === 'doc') return parsed;
  } catch {
    // plain text
  }
  return raw;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DescriptionEditor({ initialContent, onSave, disabled = false, onLightbox }: DescriptionEditorProps) {
  const [slashMenu, setSlashMenuState] = useState<SlashState>(null);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const slashRef = useRef<SlashState>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  // Track last saved content to avoid redundant saves
  const lastSavedRef = useRef<string | null>(initialContent);

  const setSlash = useCallback((s: SlashState) => { slashRef.current = s; setSlashMenuState(s); }, []);

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

  const handleSave = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const isEmpty = ed.isEmpty;
    const content = isEmpty ? null : JSON.stringify(ed.getJSON());
    if (content === lastSavedRef.current) return;
    lastSavedRef.current = content;
    onSave(content);
  }, [onSave]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: 'Agrega una descripción… usa / para dar formato o pega una imagen' }),
      ResizableImage.configure({ allowBase64: true }),
      TextStyle,
      Color,
    ],
    content: parseContent(initialContent) ?? undefined,
    editable: !disabled,
    editorProps: {
      attributes: { class: 'desc-editor-prose' },
      handleKeyDown(_view, event) {
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
    onUpdate({ editor: ed }) {
      // Slash menu detection
      const { $from } = ed.state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const match = textBefore.match(/\/(\S*)$/);

      if (match) {
        const query = match[1].toLowerCase();
        const filtered = SLASH_COMMANDS.filter(
          c => c.label.toLowerCase().includes(query) || c.keywords?.some(k => k.includes(query)),
        );
        if (filtered.length > 0) {
          try {
            const domNode = ed.view.domAtPos($from.pos).node as HTMLElement;
            const rect = domNode.getBoundingClientRect?.() ?? { bottom: 0, left: 0 };
            setSlash({ x: rect.left, y: rect.bottom + 4, activeIndex: 0, items: filtered });
          } catch {
            setSlash(null);
          }
        } else {
          setSlash(null);
        }
      } else {
        setSlash(null);
      }
    },
    onFocus() { setFocused(true); },
    onBlur() { setFocused(false); handleSave(); },
  });

  // Keep editorRef in sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (editorRef as any).current = editor;

  // Reset content when task changes (initialContent changes externally)
  useEffect(() => {
    if (!editor) return;
    const parsed = parseContent(initialContent);
    lastSavedRef.current = initialContent;
    if (parsed && typeof parsed === 'object') {
      editor.commands.setContent(parsed as Record<string, unknown>);
    } else if (typeof parsed === 'string') {
      editor.commands.setContent(parsed);
    } else {
      editor.commands.clearContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  // Sync editable state when disabled prop changes (Tiptap doesn't watch it reactively)
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
    // When entering edit mode, reset the last-saved ref so the next blur triggers a save
    if (!disabled) lastSavedRef.current = initialContent;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, disabled]);

  // Lightbox click delegation when read-only
  useEffect(() => {
    if (!disabled || !onLightbox) return;
    const el = wrapRef.current;
    if (!el) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        onLightbox((target as HTMLImageElement).src);
      }
    };
    el.addEventListener('click', handle);
    return () => el.removeEventListener('click', handle);
  }, [disabled, onLightbox]);

  return (
    <div ref={wrapRef} className={`desc-editor-wrap${focused ? ' desc-editor-focused' : ''}`}>
      {slashMenu && (
        <SlashMenuFloating
          x={slashMenu.x}
          y={slashMenu.y}
          items={slashMenu.items}
          activeIndex={slashMenu.activeIndex}
          onSelect={executeSlash}
          onClose={() => setSlash(null)}
        />
      )}

      <div className="desc-editor-field">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
