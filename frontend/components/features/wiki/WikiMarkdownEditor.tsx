'use client';

import { useState } from 'react';
import { renderMarkdown } from '@/utils/markdown';

interface WikiMarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function WikiMarkdownEditor({ value, onChange, placeholder }: WikiMarkdownEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const tabCls = (t: 'edit' | 'preview') =>
    [
      'px-4 py-2 text-sm transition-colors border-b-2',
      tab === t
        ? 'text-[var(--c-text)] font-medium border-[var(--c-text)]'
        : 'text-[var(--c-text-sub)] border-transparent hover:text-[var(--c-text)]',
    ].join(' ');

  return (
    <div className="flex flex-col h-full border border-[var(--c-border)] rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-[var(--c-border)] bg-[var(--c-hover)] px-2 shrink-0">
        <button type="button" onClick={() => setTab('edit')} className={tabCls('edit')}>
          Editar
        </button>
        <button type="button" onClick={() => setTab('preview')} className={tabCls('preview')}>
          Vista previa
        </button>
        <span className="ml-auto text-[10px] text-[var(--c-muted)] pr-2 font-mono tracking-wide">
          Markdown
        </span>
      </div>

      {/* Edit */}
      {tab === 'edit' && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '# Título del proceso\n\nDescribe el proceso aquí...'}
          className="flex-1 resize-none p-4 font-mono text-sm leading-relaxed bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] focus:outline-none"
          spellCheck={false}
        />
      )}

      {/* Preview */}
      {tab === 'preview' && (
        <div
          className={[
            'flex-1 overflow-y-auto p-4',
            '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[var(--c-text)] [&_h1]:mt-5 [&_h1]:mb-2',
            '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--c-text)] [&_h2]:mt-4 [&_h2]:mb-1.5',
            '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--c-text)] [&_h3]:mt-3 [&_h3]:mb-1',
            '[&_p]:text-[var(--c-text)] [&_p]:leading-relaxed [&_p]:mb-2',
            '[&_strong]:font-semibold [&_em]:italic',
            '[&_code]:font-mono [&_code]:text-sm [&_code]:bg-[var(--c-hover)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded',
            '[&_pre]:bg-[var(--c-hover)] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:mb-3 [&_pre]:overflow-x-auto',
            '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
            '[&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-2',
            '[&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-2',
            '[&_li]:text-[var(--c-text)] [&_li]:mb-0.5',
            '[&_blockquote]:border-l-4 [&_blockquote]:border-[var(--c-border)] [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:text-[var(--c-text-sub)]',
            '[&_hr]:border-[var(--c-border)] [&_hr]:my-4',
            '[&_a]:text-[var(--c-text)] [&_a]:underline [&_a]:underline-offset-2',
          ].join(' ')}
          // eslint-disable-next-line react/no-danger -- content built from allow-listed HTML tags only (see utils/markdown.ts)
          dangerouslySetInnerHTML={{
            __html: value.trim()
              ? renderMarkdown(value)
              : '<p style="color:var(--c-muted)">Sin contenido aún.</p>',
          }}
        />
      )}
    </div>
  );
}
