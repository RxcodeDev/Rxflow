'use client';

import { useEffect, useRef, useState } from 'react';

/* ── Project colour palette (hash-based) ──────────────────────── */
const PALETTE = [
  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
];
const colorCache = new Map<string, typeof PALETTE[number]>();
export function paletteColor(key: string) {
  if (!colorCache.has(key)) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    colorCache.set(key, PALETTE[h % PALETTE.length]);
  }
  return colorCache.get(key)!;
}

/* ── Option shape ──────────────────────────────────────────────── */
export interface SelectOption {
  /** Unique value stored on selection */
  value: string;
  /** Main label shown */
  label: string;
  /** Optional sub-label / category chip (gets a palette color) */
  subLabel?: string;
  /** Key used to derive chip color (defaults to subLabel) */
  colorKey?: string;
  /** Custom icon node shown left of the label */
  icon?: React.ReactNode;
  /** Full description shown in tooltip on hover */
  tooltip?: string;
}

/* ── Props ─────────────────────────────────────────────────────── */
interface SearchSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string, option: SelectOption | null) => void;
  placeholder?: string;
  noneLabel?: string;
  hideNone?: boolean;
  loading?: boolean;
  disabled?: boolean;
  locked?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

/* ── Default icon (circle outline) ────────────────────────────── */
function DefaultIcon({ color = 'var(--c-muted)' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

/* ── Component ─────────────────────────────────────────────────── */
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecciona...',
  noneLabel = '— ninguno —',
  hideNone = false,
  loading = false,
  disabled = false,
  locked = false,
  searchPlaceholder = 'Buscar...',
  className = '',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropPos, setDropPos] = useState<{ top: number; right: number; minWidth: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; subLabel?: string; color?: string; top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value) ?? null;

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.subLabel?.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  /* close on outside click — checks both wrapper and fixed dropdown */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        !(dropRef.current && dropRef.current.contains(target))
      ) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  function handleToggle() {
    if (isDisabled || locked) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right, minWidth: rect.width });
    }
    setOpen(o => !o);
  }

  const select = (opt: SelectOption | null) => {
    onChange(opt?.value ?? '', opt);
    setOpen(false);
    setQuery('');
    setTooltip(null);
  };

  const isDisabled = disabled || loading;

  const triggerCls =
    'w-full flex items-center gap-2 px-3 py-[0.55rem] border border-[var(--c-border)] ' +
    'rounded-[0.625rem] text-[13px] font-[inherit] bg-[var(--c-bg)] ' +
    'transition-[border-color,box-shadow] duration-[0.25s] ';

  return (
    <div ref={ref} className={`relative${className ? ' ' + className : ''}`}>
      {/* ── Trigger ──────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={isDisabled}
        className={
          triggerCls +
          (isDisabled ? 'opacity-50 cursor-not-allowed ' : locked ? 'cursor-not-allowed ' : 'cursor-pointer hover:border-[var(--c-text-sub)] ') +
          (locked ? 'border-[var(--c-success)] ' : open ? 'border-[var(--c-text-sub)] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]' : '')
        }
        style={locked ? { background: 'color-mix(in srgb, var(--c-success) 5%, var(--c-bg))' } : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <svg className="shrink-0 animate-spin text-[var(--c-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : selected?.icon ? (
          <span className="shrink-0">{selected.icon}</span>
        ) : (
          <DefaultIcon color={locked ? 'var(--c-success)' : 'var(--c-muted)'} />
        )}

        {selected ? (
          <span className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="font-medium truncate" style={{ color: locked ? 'var(--c-success)' : 'var(--c-text)' }}>{selected.label}</span>
          </span>
        ) : (
          <span className="flex-1 text-left" style={{ color: locked ? 'var(--c-success)' : 'var(--c-muted)' }}>
            {loading ? 'Cargando...' : placeholder}
          </span>
        )}

        <svg
          className="shrink-0 ml-auto transition-transform"
          style={{ color: locked ? 'var(--c-success)' : 'var(--c-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* ── Dropdown (fixed so it escapes overflow containers) ───── */}
      {open && dropPos && (
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, minWidth: dropPos.minWidth, zIndex: 9999 }}
          className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden"
          role="listbox"
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--c-line)]">
            <svg className="shrink-0 text-[var(--c-muted)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
              placeholder={searchPlaceholder}
              className="flex-1 text-[13px] font-[inherit] text-[var(--c-text)] bg-transparent outline-none placeholder:text-[var(--c-muted)]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors" aria-label="Limpiar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* None option */}
            <button
              type="button"
              onClick={() => select(null)}
              className={
                'w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--c-text-sub)] ' +
                'hover:bg-[var(--c-hover)] transition-colors ' +
                (!value ? 'bg-[var(--c-hover)]' : '')
              }
              role="option"
              aria-selected={!value}
              style={hideNone ? { display: 'none' } : undefined}
            >
              <svg className="shrink-0 text-[var(--c-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>{noneLabel}</span>
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-[var(--c-muted)]">
                {query ? 'Sin resultados' : 'No hay opciones disponibles'}
              </p>
            ) : (
              filtered.map(opt => {
                const ck = opt.colorKey ?? opt.subLabel ?? opt.value;
                const pc = paletteColor(ck);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => select(opt)}
                    onMouseEnter={e => {
                      if (!opt.tooltip && !opt.subLabel) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltip({
                        text: opt.tooltip ?? opt.label,
                        subLabel: opt.subLabel,
                        color: pc.color,
                        top: rect.top + rect.height / 2,
                        left: rect.right + 10,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className={
                      'w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-left ' +
                      'hover:bg-[var(--c-hover)] transition-colors ' +
                      (opt.value === value ? 'bg-[var(--c-active-pill)]' : '')
                    }
                    role="option"
                    aria-selected={opt.value === value}
                  >
                    {opt.icon ? (
                      <span className="shrink-0">{opt.icon}</span>
                    ) : (
                      <DefaultIcon color={pc.color} />
                    )}
                    <span className="text-[var(--c-text)] font-medium truncate" style={{ flex: '1 1 0', minWidth: 0 }}>
                      {opt.label}
                    </span>
                    {opt.subLabel && (
                      <span
                        className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 hidden sm:block max-w-[90px] truncate"
                        style={{ color: pc.color, background: pc.bg }}
                      >
                        {opt.subLabel}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-[var(--c-line)] text-[11px] text-[var(--c-muted)] text-right">
              {filtered.length} {filtered.length === 1 ? 'opción' : 'opciones'}
            </div>
          )}
        </div>
      )}

      {/* ── Fixed tooltip ─────────────────────────────────────────── */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.top,
            left: tooltip.left + 16,
            transform: 'translateY(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="bg-[var(--c-bg)] border border-[var(--c-border)] text-[var(--c-text)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.14)] px-3 py-2.5 max-w-[240px]"
        >
          <p className="text-[12px] font-semibold leading-snug">{tooltip.text}</p>
          {tooltip.subLabel && (
            <p className="text-[11px] mt-1 font-medium" style={{ color: tooltip.color }}>{tooltip.subLabel}</p>
          )}
          <span style={{ position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid var(--c-border)' }} />
          <span style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid var(--c-bg)' }} />
        </div>
      )}
    </div>
  );
}
