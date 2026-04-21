/* ── Shared constants for all project views ─────────────────────────── */

export const STATUS_LABEL: Record<string, string> = {
  backlog:      'Backlog',
  en_progreso:  'En progreso',
  en_revision:  'En revisión',
  bloqueado:    'Bloqueado',
  completada:   'Completada',
};

export const STATUS_STYLE: Record<string, string> = {
  backlog:     'bg-[var(--c-hover)] text-[var(--c-text-sub)]',
  en_progreso: 'bg-[#ede9fe] text-[#6d28d9]',
  en_revision: 'bg-[#fef3c7] text-[#b45309]',
  bloqueado:   'bg-[#fee2e2] text-[#b91c1c]',
  completada:  'bg-[#d1fae5] text-[#065f46]',
};

/** Badge border+text colors for the kanban column header */
export const COL_BADGE: Record<string, { bg: string; color: string }> = {
  backlog:     { bg: '#e2e8f0', color: '#475569' },
  en_progreso: { bg: '#ede9fe', color: '#6d28d9' },
  en_revision: { bg: '#fef3c7', color: '#b45309' },
  bloqueado:   { bg: '#fee2e2', color: '#b91c1c' },
  completada:  { bg: '#d1fae5', color: '#065f46' },
};

export const STATUS_ORDER = ['backlog', 'en_progreso', 'en_revision', 'bloqueado', 'completada'] as const;
export type StatusKey = typeof STATUS_ORDER[number];

export const PRIORITY_LABEL: Record<string, string> = {
  urgente: 'Urgente',
  alta:    'Alta',
  media:   'Media',
  baja:    'Baja',
};

export const PRIORITY_STYLE: Record<string, string> = {
  urgente: 'text-[var(--c-danger)] border-[var(--c-danger)]',
  alta:    'text-[var(--c-text-sub)] border-[var(--c-text-sub)]',
  media:   'text-[var(--c-text-sub)] border-[var(--c-border)]',
  baja:    'text-[var(--c-muted)] border-[var(--c-border)]',
};

export const PRIORITIES = ['urgente', 'alta', 'media', 'baja'] as const;
export type Priority = typeof PRIORITIES[number];

export const selectCls =
  'border border-[var(--c-border)] rounded-[6px] px-3 py-1.5 text-[13px] ' +
  'bg-[var(--c-bg)] text-[var(--c-text-sub)] outline-none font-[inherit] cursor-pointer ' +
  'focus:border-[var(--c-text-sub)] transition-colors';

export const fieldCls =
  'w-full border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm ' +
  'bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-muted)] ' +
  'outline-none focus:border-[var(--c-text-sub)] transition-colors font-[inherit]';
