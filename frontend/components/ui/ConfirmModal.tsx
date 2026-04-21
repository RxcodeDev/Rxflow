'use client';

import { useEffect } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = '¿Estás seguro?',
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/25"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-[var(--c-bg)] border border-[var(--c-border)] rounded-[1.25rem] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cdlg-title"
        aria-describedby="cdlg-msg"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--c-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 id="cdlg-title" className="font-semibold text-[var(--c-text)] text-[0.9375rem] leading-snug">
              {title}
            </h2>
            <p id="cdlg-msg" className="text-[0.8125rem] text-[var(--c-text-sub)] mt-1 leading-snug">
              {message}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[var(--c-text-sub)] border border-[var(--c-border)] rounded-lg hover:bg-[var(--c-hover)] transition-colors cursor-pointer font-[inherit] bg-transparent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-lg transition-opacity cursor-pointer border-none bg-[var(--c-danger)] text-white hover:opacity-85"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
