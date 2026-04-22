'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './Sidebar.module.css';
import { useUIState, useUIDispatch } from '@/store/UIContext';
import { openCreateModal } from '@/store/slices/uiSlice';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/store/LangContext';
import { apiGet } from '@/lib/api';
import type { WorkspaceSummary, ApiWrapped } from '@/types/api.types';

/* ── Unread-count helper (returns undefined if 0) ──── */
function badgeCount(n: number): string | undefined {
  return n > 0 ? String(n) : undefined;
}

/* ── Types ─────────────────────────────────────────── */
interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: SubItem[];
  danger?: boolean;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  sections?: NavSection[];
}

/* ── Default nav structure (matches Figma) ──────────── */

/* ── Workspace icon renderer (Feather icon set) ─────── */
function WsIcon({ icon, size = 12, color }: { icon: string; size?: number; color?: string }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color ?? 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  switch (icon) {
    case 'code':      return <svg {...p}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
    case 'target':    return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'briefcase': return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'monitor':   return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    case 'zap':       return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case 'globe':     return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case 'star':      return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    default:          return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
  }
}

const HomeSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ClientsSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const PostsSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const CalendarSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const FinanceSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const SettingsSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const IntegrationsSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
  </svg>
);
const HelpSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const LogoutSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ── New icons ──────────────────────────────────────── */
const CheckSquareSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const InboxSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);
const LayersSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
const RefreshCwSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);
const UsersSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const LinkSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);
const FolderSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);
const SmallSettingsSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

/* ── Herramientas internas icons ────────────────────── */
const FileTextSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const BarChart2Svg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const CalendarToolSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const MessageSquareSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const BookSvg = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);

/* DEFAULT_SECTIONS is built inside the component via useLang() */

/* ── Hardcoded projects ──────────────────────────────── */
// Projects are now fetched dynamically from the API
const FALLBACK_PROJECTS: { id: string; name: string; methodology: string; extra_views: string[] }[] = [];

/** Returns the sidebar subitems for a project based on its methodology */
function projectSubitems(methodology: string, extraViews: string[]): { label: string; suffix: string }[] {
  const m = (methodology ?? '').toLowerCase();

  const DEFAULTS: Record<string, string[]> = {
    scrum:    ['board', 'backlog', 'epicas'],
    kanban:   ['board', 'lista'],
    shape_up: ['lista'],
  };
  const LABELS: Record<string, string> = {
    board: 'Board', lista: 'Lista', backlog: 'Backlog', epicas: 'Épicas',
  };
  const ORDER = ['board', 'lista', 'backlog', 'epicas'];

  const defaults  = DEFAULTS[m] ?? ['board', 'lista'];
  const merged    = [...new Set([...defaults, ...(extraViews ?? [])])];
  const ordered   = ORDER.filter((v) => merged.includes(v));
  return ordered.map((suffix) => ({ label: LABELS[suffix] ?? suffix, suffix }));
}

/* ── Avatar fallback SVG ────────────────────────────── */
function AvatarFallback() {
  return (
    <svg viewBox="0 0 38 38" fill="none" width="38" height="38" aria-hidden="true">
      <circle cx="19" cy="19" r="19" fill="#e0e0e0" />
      <circle cx="19" cy="15" r="6" fill="#999" />
      <path d="M7 34c0-6 5.5-10 12-10s12 4 12 10" fill="#999" />
    </svg>
  );
}

/* ── Arrow chevron ──────────────────────────────────── */
const ArrowSvg = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

/* ── Component ──────────────────────────────────────── */
export default function Sidebar({
  sections: sectionsProp,
  bottomItems: bottomItemsProp,
}: Omit<SidebarProps, 'user'>) {
  const [collapsed, setCollapsed] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const dispatch = useUIDispatch();
  const { projectsVersion } = useUIState();
  const { user, logout } = useAuth();
  const { t } = useLang();

  const sections: NavSection[] = sectionsProp ?? [
    {
      label: t('sectionMe'),
      items: [
        { label: t('navHome'),    href: '/inicio',     icon: <HomeSvg /> },
        { label: t('navMyTasks'), href: '/mis-tareas', icon: <CheckSquareSvg /> },
        { label: t('navInbox'),   href: '/inbox',      icon: <InboxSvg />, badge: undefined },
      ],
    },
    {
      label: t('sectionTeam'),
      items: [
        { label: t('navProjects'), href: '/proyectos', icon: <LayersSvg /> },
        { label: t('navCycles'),   href: '/cycles',    icon: <RefreshCwSvg /> },
        { label: t('navMembers'),  href: '/miembros',  icon: <UsersSvg /> },
      ],
    },
    {
      label: t('sectionTools'),
      items: [
        { label: t('navDocuments'), href: '/herramientas/documentos',  icon: <FileTextSvg /> },
        { label: t('navReports'),   href: '/herramientas/reportes',    icon: <BarChart2Svg /> },
        { label: t('navCalendar'),  href: '/herramientas/calendario',  icon: <CalendarToolSvg /> },
        { label: t('navWiki'),      href: '/herramientas/wiki',        icon: <BookSvg /> },
      ],
    },
    {
      label: t('sectionConfig'),
      items: [
        { label: t('navPreferences'),   href: '/preferencias',  icon: <SettingsSvg /> },
        { label: t('navIntegrations'),  href: '/integraciones', icon: <LinkSvg /> },
      ],
    },
  ];

  void bottomItemsProp; // prop kept for external overrides, not used internally

  useEffect(() => {
    apiGet<ApiWrapped<WorkspaceSummary[]>>('/workspaces')
      .then((res) => setWorkspaces(res.data))
      .catch(() => {/* silencioso en error de red */});
  }, [projectsVersion]);

  useEffect(() => {
    apiGet<ApiWrapped<number>>('/notifications/unread-count')
      .then((res) => setUnreadCount(res.data))
      .catch(() => {});
  }, []);

  const cx = (...classes: (string | false | undefined)[]) =>
    classes.filter(Boolean).join(' ');

  return (
    <div className={s.shell}>
      {/* Toggle button */}
      <button
        className={cx(s.toggleBtn, collapsed && s.toggleBtnCollapsed)}
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? t('navExpandSidebar') : t('navCollapseSidebar')}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M6 2L4 5l2 3" />
        </svg>
      </button>

      <aside className={cx(s.sidebar, collapsed && s.sidebarCollapsed)}>
        {/* User section */}
        <header className={cx(s.userSection, collapsed && s.userSectionCollapsed)}>
          <Link
            href="/perfil"
            className={s.avatar}
            style={!user?.avatar_url && user?.avatar_color ? { background: user.avatar_color } : undefined}
            title="Editar perfil"
            aria-label="Editar perfil"
          >
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.name} className={s.avatarImg} />
            ) : (
              <div
                className={s.avatarInitials}
                style={user?.avatar_color ? { color: '#fff' } : undefined}
                aria-hidden="true"
              >
                {user?.initials ?? '?'}
              </div>
            )}
          </Link>
          <div className={cx(s.userInfo, collapsed && s.userInfoCollapsed)}>
            <span className={s.userRole}>{user?.role ?? t('roleMember')}</span>
            <span className={s.userName}>{user?.name ?? 'Usuario'}</span>
          </div>
        </header>

        {/* Scrollable nav */}
        <nav className={s.navScroll} aria-label="Navegación principal">
          {sections.map((section, si) => (
            <div key={si}>
              {si > 0 && <hr className={s.divider} aria-hidden="true" />}

              <span
                className={cx(s.navLabel, collapsed && s.navLabelCollapsed)}
                aria-hidden="true"
              >
                {section.label}
              </span>

              <ul className={s.navList}>
                {section.items.map((item, ii) =>
                  item.children ? (
                    /* Accordion group */
                    <li key={ii}>
                      <details className={s.navGroup}>
                        <summary
                          className={cx(
                            s.navItem,
                            collapsed && s.navItemCollapsed,
                            cx(s.tooltip, collapsed && s.tooltipVisible),
                          )}
                          data-tip={item.label}
                        >
                          <span className={s.navIcon}>{item.icon}</span>
                          <span className={cx(s.navText, collapsed && s.navTextHidden)}>
                            {item.label}
                          </span>
                          <span className={cx(s.navArrow, collapsed && s.navArrowHidden)}>
                            <ArrowSvg />
                          </span>
                        </summary>
                        <ul
                          className={cx(
                            s.submenu,
                            collapsed && s.submenuCollapsed,
                          )}
                        >
                          {item.children.map((child, ci) => (
                            <li key={ci} className={s.submenuItem}>
                              <Link
                                href={child.href}
                                className={cx(
                                  s.subItem,
                                  pathname === child.href && s.subItemActive,
                                )}
                                aria-current={pathname === child.href ? 'page' : undefined}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ) : (
                    /* Simple link — active state + optional badge */
                    <li key={ii}>
                      <Link
                        href={item.href ?? '#'}
                        className={cx(
                          s.navItem,
                          pathname === item.href && s.navItemActive,
                          collapsed && s.navItemCollapsed,
                          cx(s.tooltip, collapsed && s.tooltipVisible),
                        )}
                        data-tip={item.label}
                        aria-current={pathname === item.href ? 'page' : undefined}
                      >
                        <span className={s.navIcon}>{item.icon}</span>
                        <span className={cx(s.navText, collapsed && s.navTextHidden)}>
                          {item.label}
                        </span>
                        {(item.href === '/inbox' ? badgeCount(unreadCount) : item.badge) && !collapsed && (
                          <span className={s.badge}>
                            {item.href === '/inbox' ? badgeCount(unreadCount) : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ),
                )}
              </ul>

              {/* ── Grupo PROYECTOS — se inyecta después de EQUIPO (si=1) ── */}
              {si === 1 && (
                <>
                  <hr className={s.divider} aria-hidden="true" />
                  <div className="flex items-center justify-between pr-2">
                    <span className={cx(s.navLabel, collapsed && s.navLabelCollapsed)} aria-hidden="true">
                      {t('sectionWorkspaces')}
                    </span>
                    {!collapsed && (
                      <Link
                        href="/espacios"
                        className="flex-shrink-0 text-[var(--c-muted)] hover:text-[var(--c-text-sub)] transition-colors pb-1"
                        aria-label={t('navManageWorkspaces')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                             strokeLinecap="round" strokeLinejoin="round"
                             width={13} height={13} aria-hidden="true">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                      </Link>
                    )}
                  </div>
                  <ul className={s.navList}>
                    {workspaces.map((ws) => {
                      const wsCollapsed = collapsedWorkspaces.has(ws.id);
                      function toggleWs() {
                        setCollapsedWorkspaces((prev) => {
                          const next = new Set(prev);
                          if (next.has(ws.id)) next.delete(ws.id);
                          else next.add(ws.id);
                          return next;
                        });
                      }
                      return (
                      <li key={ws.id}>
                        {/* Workspace header — always visible, clickable to collapse */}
                        {!collapsed && (
                          <button
                            type="button"
                            onClick={toggleWs}
                            className="flex items-center gap-2 px-3 pt-2 pb-0.5 w-full text-left cursor-pointer bg-transparent border-none group"
                            aria-expanded={!wsCollapsed}
                          >
                            <WsIcon icon={ws.icon ?? 'layers'} size={11} color={ws.color} />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)] truncate flex-1 group-hover:text-[var(--c-text-sub)] transition-colors">
                              {ws.name}
                            </span>
                            <svg
                              viewBox="0 0 10 10" width="8" height="8"
                              fill="none" stroke="currentColor" strokeWidth="1.5"
                              aria-hidden="true"
                              className="text-[var(--c-muted)] shrink-0 transition-transform duration-200"
                              style={{ transform: wsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                            >
                              <path d="M2 3.5l3 3 3-3" />
                            </svg>
                          </button>
                        )}
                        {!wsCollapsed && (
                          <ul className={s.navList}>
                            {ws.projects.length === 0 && !collapsed && (
                              <li>
                                <span className="px-3 py-1.5 text-[11px] text-[var(--c-muted)] block">
                                  Sin proyectos
                                </span>
                              </li>
                            )}
                            {ws.projects.map((proj) => {
                              const slug = proj.code.toLowerCase();
                              const basePath = `/proyectos/${slug}`;
                              return (
                                <li key={proj.id}>
                                  <details className={s.navGroup}>
                                    <summary
                                      className={cx(
                                        s.navItem,
                                        collapsed && s.navItemCollapsed,
                                        cx(s.tooltip, collapsed && s.tooltipVisible),
                                      )}
                                      data-tip={proj.name}
                                    >
                                      <span className={s.navIcon}>
                                        <svg viewBox="0 0 24 24" fill="none"
                                             stroke={ws.color ?? 'currentColor'}
                                             strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                                             width={14} height={14} aria-hidden="true">
                                          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                                        </svg>
                                      </span>
                                      <span className={cx(s.navText, collapsed && s.navTextHidden)}>
                                        <span className={s.projectCode}>{proj.code}</span>
                                        {proj.name}
                                      </span>
                                      <span className={cx(s.navArrow, collapsed && s.navArrowHidden)}>
                                        <ArrowSvg />
                                      </span>
                                    </summary>
                                    <ul className={cx(s.submenu, collapsed && s.submenuCollapsed)}>
                                      {projectSubitems(proj.methodology, proj.extra_views ?? []).map(({ label, suffix }) => {
                                        const href = `${basePath}/${suffix}`;
                                        return (
                                          <li key={suffix} className={s.submenuItem}>
                                            <Link
                                              href={href}
                                              className={cx(s.subItem, pathname === href && s.subItemActive)}
                                              aria-current={pathname === href ? 'page' : undefined}
                                            >
                                              {label}
                                            </Link>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </details>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                      );
                    })}
                    {!collapsed && (
                      <li>
                        <button
                          type="button"
                          className={s.newProjectBtn}
                          onClick={() => dispatch(openCreateModal('workspace'))}
                        >
                          {t('navNewWorkspace')}
                        </button>
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom fixed items */}
        <footer className={s.sidebarBottom}>
          <ul className={s.navList}>
            <li>
              <button
                type="button"
                onClick={logout}
                className={cx(
                  s.navItem,
                  s.navItemDanger,
                  collapsed && s.navItemCollapsed,
                  cx(s.tooltip, collapsed && s.tooltipVisible),
                )}
                data-tip={t('navLogout')}
              >
                <span className={s.navIcon}><LogoutSvg /></span>
                <span className={cx(s.navText, collapsed && s.navTextHidden)}>
                  {t('navLogout')}
                </span>
              </button>
            </li>
          </ul>
        </footer>
      </aside>
    </div>
  );
}

