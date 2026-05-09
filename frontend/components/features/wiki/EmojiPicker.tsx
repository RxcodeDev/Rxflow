'use client';

import { useEffect, useRef, useState } from 'react';
import { WIKI_ICON_GROUPS, renderWikiIcon } from './wikiIcons';

interface EmojiPickerProps {
  value: string;
  onChange: (key: string) => void;
}

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSelect = (key: string) => {
    onChange(key === value ? '' : key);
    setOpen(false);
  };

  const selectedIcon = renderWikiIcon(value, 15);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-2.5 py-[0.5rem] border border-[var(--c-border)] rounded-[0.625rem] text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] hover:border-[var(--c-text-sub)] transition-colors focus:outline-none focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
        aria-label="Seleccionar icono"
      >
        {selectedIcon ? (
          <span className="w-6 h-6 rounded-md bg-[var(--c-hover)] flex items-center justify-center text-[var(--c-text)] shrink-0">
            {selectedIcon}
          </span>
        ) : (
          <span className="w-6 h-6 rounded-md border border-dashed border-[var(--c-border)] flex items-center justify-center text-[var(--c-muted)] shrink-0">
            <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </span>
        )}
        <span className={`flex-1 text-left text-[13px] ${value ? 'text-[var(--c-text)]' : 'text-[var(--c-muted)]'}`}>
          {value ? 'Cambiar icono' : 'Sin icono'}
        </span>
        <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"
          className={`text-[var(--c-muted)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-[220px] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="max-h-56 overflow-y-auto p-2.5 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            {WIKI_ICON_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[9px] font-semibold text-[var(--c-muted)] uppercase tracking-[0.08em] px-0.5 pb-1.5">
                  {group.label}
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {group.icons.map(({ key, label }) => {
                    const isActive = value === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelect(key)}
                        title={label}
                        className={[
                          'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'bg-[var(--c-text)] text-[var(--c-bg)]'
                            : 'text-[var(--c-text-sub)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)]',
                        ].join(' ')}
                      >
                        {renderWikiIcon(key, 15)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {value && (
            <div className="border-t border-[var(--c-border)] px-2.5 py-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-center text-[11px] text-[var(--c-danger)] hover:bg-[var(--c-hover)] rounded-lg py-1 transition-colors"
              >
                Quitar icono
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
