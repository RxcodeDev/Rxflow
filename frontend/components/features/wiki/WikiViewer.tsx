'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useState, useRef, useEffect } from 'react';
import { renderMarkdown } from '@/utils/markdown';
import { ResizableImage } from './ResizableImage';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

interface WikiViewerProps {
  content: Record<string, unknown>;
}

const PROSE_CLS = [
  '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[var(--c-text)] [&_h1]:mt-6 [&_h1]:mb-3',
  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--c-text)] [&_h2]:mt-5 [&_h2]:mb-2',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--c-text)] [&_h3]:mt-4 [&_h3]:mb-2',
  '[&_p]:text-[var(--c-text)] [&_p]:leading-relaxed [&_p]:mb-3',
  '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3',
  '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3',
  '[&_li]:mb-1 [&_li]:text-[var(--c-text)]',
  '[&_code]:font-mono [&_code]:text-sm [&_code]:bg-[var(--c-hover)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded',
  '[&_pre]:bg-[var(--c-hover)] [&_pre]:text-[var(--c-text)] [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:mb-3 [&_pre]:overflow-x-auto',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-[var(--c-border)] [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-[var(--c-text-sub)]',
  '[&_a]:text-[var(--c-text)] [&_a]:underline [&_a]:underline-offset-2',
  '[&_hr]:border-[var(--c-border)] [&_hr]:my-6',
].join(' ');

function MarkdownViewer({ md }: { md: string }) {
  return (
    <div
      className={PROSE_CLS}
      // eslint-disable-next-line react/no-danger -- content built from allow-listed HTML tags only (see utils/markdown.ts)
      dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }}
    />
  );
}

export function TiptapViewer({
  content,
  onLightbox,
}: {
  content: Record<string, unknown>;
  onLightbox: (src: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      ResizableImage.configure({ allowBase64: true }),
      TextStyle,
      Color,
    ],
    content,
    editable: false,
  });

  // Click delegation for lightbox
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        onLightbox((e.target as HTMLImageElement).src);
      }
    };
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [onLightbox]);

  // Inject copy buttons into every <pre> block after render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pres = container.querySelectorAll<HTMLElement>('pre');
    const cleanups: (() => void)[] = [];

    pres.forEach(pre => {
      // Avoid double-injecting
      if (pre.querySelector('[data-copy-btn]')) return;

      pre.style.position = 'relative';

      const btn = document.createElement('button');
      btn.setAttribute('data-copy-btn', '1');
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', 'Copiar código');
      btn.style.cssText =
        'position:absolute;top:10px;right:10px;padding:4px 10px;font-size:11px;border-radius:6px;' +
        'background:rgba(0,0,0,0.35);color:#fff;border:none;cursor:pointer;transition:background 0.2s;' +
        'font-family:inherit;';
      btn.textContent = 'Copiar';

      const onClick = async () => {
        const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = '✓ Copiado';
          btn.style.background = '#16a34a';
          setTimeout(() => { btn.textContent = 'Copiar'; btn.style.background = 'rgba(0,0,0,0.35)'; }, 2000);
        } catch {
          btn.textContent = 'Error';
          setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
        }
      };

      btn.addEventListener('click', onClick);
      pre.appendChild(btn);
      cleanups.push(() => { btn.removeEventListener('click', onClick); btn.remove(); });
    });

    return () => cleanups.forEach(fn => fn());
  });  // runs after every render so new code blocks get buttons

  return (
    <div
      ref={containerRef}
      className={`wiki-content [&_.ProseMirror]:outline-none [&_img]:cursor-zoom-in ${PROSE_CLS}`}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

export default function WikiViewer({ content }: WikiViewerProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  return (
    <>
      {content?.type === 'markdown'
        ? <MarkdownViewer md={(content.content as string) ?? ''} />
        : <TiptapViewer content={content} onLightbox={setLightbox} />
      }

      {/* Lightbox */}
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
    </>
  );
}


