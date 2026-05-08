'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { renderMarkdown } from '@/utils/markdown';

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
  '[&_pre]:bg-[var(--c-hover)] [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:mb-3 [&_pre]:overflow-x-auto',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
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

function TiptapViewer({ content }: { content: Record<string, unknown> }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    ],
    content,
    editable: false,
  });
  return (
    <div className={`wiki-content [&_.ProseMirror]:outline-none ${PROSE_CLS}`}>
      <EditorContent editor={editor} />
    </div>
  );
}

export default function WikiViewer({ content }: WikiViewerProps) {
  if (content?.type === 'markdown') {
    return <MarkdownViewer md={(content.content as string) ?? ''} />;
  }
  return <TiptapViewer content={content} />;
}

