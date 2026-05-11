'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './BottomNav.module.css';
import { useLang } from '@/store/LangContext';

interface MoreItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  danger?: boolean;
}

interface BarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface BottomNavProps {
  barItems?: BarItem[];
  moreItems?: MoreItem[];
}

/* DEFAULT_BAR and DEFAULT_MORE are built inside the component via useLang() */

const MoreSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);

export default function Navbar({
  barItems: barItemsProp,
  moreItems: moreItemsProp,
}: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLang();

  const barItems: BarItem[] = barItemsProp ?? [
    {
      label: t('navHome'),
      href: '/inicio',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: t('navMyTasks'),
      href: '/mis-tareas',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      label: t('navProjects'),
      href: '/proyectos',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      label: t('navInbox'),
      href: '/inbox',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
        </svg>
      ),
    },
  ];

  const moreItems: MoreItem[] = moreItemsProp ?? [
    {
      label: t('navCycles'),
      href: '/cycles',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      ),
    },
    {
      label: t('navMembers'),
      href: '/miembros',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: t('navWiki'),
      href: '/herramientas/wiki',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      ),
    },
    {
      label: t('navDocuments'),
      href: '/herramientas/documentos',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      label: t('navCalendar'),
      href: '/herramientas/calendario',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: t('navReports'),
      href: '/herramientas/reportes',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      label: t('navPreferences'),
      href: '/preferencias',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      ),
    },
    {
      label: t('navIntegrations'),
      href: '/integraciones',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      label: t('navLogout'),
      href: '/auth/logout',
      danger: true,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
    },
  ];

  const cx = (...classes: (string | false | undefined)[]) =>
    classes.filter(Boolean).join(' ');

  return (
    <div className={s.shell}>
      {/* Backdrop */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={cx(s.backdrop, moreOpen && s.backdropVisible)}
        aria-hidden="true"
        onClick={() => setMoreOpen(false)}
      />

      {/* More sheet */}
      <div className={cx(s.sheet, moreOpen && s.sheetOpen)}>
        <div className={s.sheetInner}>
          <div className={s.sheetHandle} aria-hidden="true" />
          <span className={s.sheetLabel} aria-hidden="true">
            {t('navMoreOptions')}
          </span>
          <ul className={s.moreList}>
            {moreItems.map((item, i) => (
              <li key={i}>
                <Link
                  href={item.href}
                  className={cx(s.moreItem, item.danger && s.moreItemDanger)}
                  onClick={() => setMoreOpen(false)}
                >
                  <span className={s.moreItemIcon}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <nav className={s.bar} aria-label="Navegación principal">
        <ul className={s.barList}>
          {barItems.map((item, i) => (
            <li key={i}>
              <Link
                href={item.href}
                className={cx(s.item, pathname === item.href && s.itemActive)}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <span className={s.icon}>{item.icon}</span>
                <span className={s.label}>{item.label}</span>
              </Link>
            </li>
          ))}

          {/* More button */}
          <li>
            <button
              className={cx(s.item, moreOpen && s.itemMoreOpen)}
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="Más opciones"
              aria-expanded={moreOpen}
            >
              <span className={s.icon}>
                <MoreSvg />
              </span>
              <span className={s.label}>Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

