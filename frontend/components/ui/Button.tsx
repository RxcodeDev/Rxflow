'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 w-full cursor-pointer font-semibold text-sm '
    + 'rounded-[0.625rem] px-4 py-[0.6875rem] border-none font-[inherit] '
    + 'transition-opacity duration-[0.25s] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary: 'bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-85 active:opacity-75',
    ghost:
      'bg-transparent text-[var(--c-text-sub)] border border-[var(--c-border)] hover:bg-[var(--c-hover)]',
    danger:
      'bg-transparent text-[var(--c-danger)] border border-[var(--c-border)] hover:bg-[var(--c-hover)]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className ?? ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
