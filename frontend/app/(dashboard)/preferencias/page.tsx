'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme, type Theme } from '@/store/ThemeContext';
import { useLang, type Lang } from '@/store/LangContext';
import { apiGet, apiPatch } from '@/lib/api';

interface NotifPrefs {
  mentions:    boolean;
  assignments: boolean;
  comments:    boolean;
  updates:     boolean;
}

const DEFAULT_NOTIF: NotifPrefs = {
  mentions:    true,
  assignments: true,
  comments:    false,
  updates:     false,
};

/* ── tiny helpers ────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-muted)] mb-4">
      {children}
    </h2>
  );
}

function FieldRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--c-text)]">{label}</p>
        {description && (
          <p className="text-[12px] text-[var(--c-text-sub)] mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        'shrink-0 w-10 h-6 rounded-full transition-colors cursor-pointer ' +
        (checked ? 'bg-[var(--c-text)]' : 'bg-[var(--c-border)]')
      }
    >
      <div
        className="w-4 h-4 rounded-full bg-white shadow m-1 transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}

function ChipGroup<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="shrink-0 flex gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={
            'text-[12px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-[inherit] ' +
            (o.key === value
              ? 'bg-[var(--c-text)] text-[var(--c-bg)]'
              : 'bg-[var(--c-hover)] text-[var(--c-text-sub)] hover:bg-[var(--c-border)]')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────── */
function SkeletonRow({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex flex-col gap-1.5">
        <div className={`h-3.5 rounded bg-[var(--c-hover)] animate-pulse ${wide ? 'w-36' : 'w-28'}`} />
        <div className="h-2.5 w-44 rounded bg-[var(--c-hover)] animate-pulse" />
      </div>
      <div className="shrink-0 w-10 h-6 rounded-full bg-[var(--c-hover)] animate-pulse" />
    </div>
  );
}

function PreferenciasPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-lg bg-[var(--c-hover)] animate-pulse" />
        <div className="h-4 w-28 rounded bg-[var(--c-hover)] animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Notificaciones skeleton */}
        <section className="flex flex-col gap-3">
          <div className="h-3 w-32 rounded bg-[var(--c-hover)] animate-pulse mb-1" />
          <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden divide-y divide-[var(--c-line)]">
            <SkeletonRow />
            <SkeletonRow wide />
            <SkeletonRow />
            <SkeletonRow wide />
          </div>
        </section>

        {/* Apariencia skeleton */}
        <section className="flex flex-col gap-3">
          <div className="h-3 w-24 rounded bg-[var(--c-hover)] animate-pulse mb-1" />
          <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden divide-y divide-[var(--c-line)]">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="h-3.5 w-16 rounded bg-[var(--c-hover)] animate-pulse" />
              <div className="flex gap-1">
                <div className="h-6 w-14 rounded-lg bg-[var(--c-hover)] animate-pulse" />
                <div className="h-6 w-14 rounded-lg bg-[var(--c-hover)] animate-pulse" />
                <div className="h-6 w-16 rounded-lg bg-[var(--c-hover)] animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="h-3.5 w-16 rounded bg-[var(--c-hover)] animate-pulse" />
              <div className="h-7 w-28 rounded-lg bg-[var(--c-hover)] animate-pulse" />
            </div>
          </div>
        </section>

        {/* Zona de peligro skeleton */}
        <section className="flex flex-col gap-3 md:col-span-2">
          <div className="h-3 w-28 rounded bg-[var(--c-hover)] animate-pulse mb-1" />
          <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-36 rounded bg-[var(--c-hover)] animate-pulse" />
                <div className="h-2.5 w-56 rounded bg-[var(--c-hover)] animate-pulse" />
              </div>
              <div className="h-7 w-28 rounded-lg bg-[var(--c-hover)] animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export default function PreferenciasPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const [notif, setNotif] = useState<NotifPrefs>(DEFAULT_NOTIF);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    apiGet<NotifPrefs>('/notifications/prefs')
      .then((data) => setNotif(data))
      .catch(() => { /* keep defaults */ })
      .finally(() => setLoadingPrefs(false));
  }, []);

  const handleToggle = useCallback((key: keyof NotifPrefs, value: boolean) => {
    const updated = { ...notif, [key]: value };
    setNotif(updated);
    apiPatch('/notifications/prefs', updated).catch(() => {
      setNotif((prev) => ({ ...prev, [key]: !value }));
    });
  }, [notif]);

  const themeOptions: { key: Theme; label: string }[] = [
    { key: 'light',  label: t('light')  },
    { key: 'dark',   label: t('dark')   },
    { key: 'system', label: t('system') },
  ];

  if (loadingPrefs) return <PreferenciasPageSkeleton />;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--c-text)]">{t('preferences')}</h1>
        <Link
          href="/perfil"
          className="text-[13px] text-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round" width={14} height={14} aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          {t('editProfile')}
        </Link>
      </div>

      {/* 2-column grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Notificaciones */}
        <section className="flex flex-col gap-3">
          <Label>{t('notifications')}</Label>
          <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden divide-y divide-[var(--c-line)]">
            <FieldRow label={t('mentions')}    description={t('mentionsDesc')}><Toggle checked={notif.mentions}    onChange={(v) => handleToggle('mentions',    v)} /></FieldRow>
            <FieldRow label={t('assignments')} description={t('assignmentsDesc')}><Toggle checked={notif.assignments} onChange={(v) => handleToggle('assignments', v)} /></FieldRow>
            <FieldRow label={t('comments')}    description={t('commentsDesc')}><Toggle checked={notif.comments}    onChange={(v) => handleToggle('comments',    v)} /></FieldRow>
            <FieldRow label={t('updates')}     description={t('updatesDesc')}><Toggle checked={notif.updates}     onChange={(v) => handleToggle('updates',     v)} /></FieldRow>
          </div>
        </section>

        {/* Apariencia */}
        <section className="flex flex-col gap-3">
          <Label>{t('appearance')}</Label>
          <div className="flex flex-col border border-[var(--c-border)] rounded-xl overflow-hidden divide-y divide-[var(--c-line)]">
            <FieldRow label={t('theme')}>
              <ChipGroup options={themeOptions} value={theme} onChange={setTheme} />
            </FieldRow>
            <FieldRow label={t('language')}>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="shrink-0 border border-[var(--c-border)] rounded-lg px-3 py-1.5 text-[13px] bg-[var(--c-bg)] text-[var(--c-text)] outline-none font-[inherit] cursor-pointer"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </FieldRow>
          </div>
        </section>

        {/* Zona de peligro — full width */}
        <section className="flex flex-col gap-3 md:col-span-2">
          <Label>{t('dangerZone')}</Label>
          <div className="flex flex-col border border-[var(--c-danger)] rounded-xl overflow-hidden">
            <FieldRow label={t('deleteAccount')} description={t('deleteAccountDesc')}>
              <button
                type="button"
                disabled
                className="shrink-0 text-[12px] px-3 py-1.5 rounded-lg bg-[var(--c-danger)] text-white opacity-60 cursor-not-allowed font-[inherit]"
              >
                {t('deleteBtn')}
              </button>
            </FieldRow>
          </div>
        </section>

      </div>
    </div>
  );
}

