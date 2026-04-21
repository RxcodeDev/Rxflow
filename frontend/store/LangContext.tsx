'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'es' | 'en';

const dict = {
  es: {
    /* Preferences page */
    preferences:        'Preferencias',
    editProfile:        'Editar perfil',
    notifications:      'Notificaciones',
    mentions:           'Menciones',
    mentionsDesc:       'Notificar cuando alguien te menciona',
    assignments:        'Asignaciones',
    assignmentsDesc:    'Notificar cuando te asignan una tarea',
    comments:           'Comentarios',
    commentsDesc:       'Notificar en tareas donde participas',
    updates:            'Actualizaciones',
    updatesDesc:        'Resumen diario de actividad del equipo',
    appearance:         'Apariencia',
    theme:              'Tema',
    light:              'Claro',
    dark:               'Oscuro',
    system:             'Sistema',
    language:           'Idioma',
    accessibility:      'Accesibilidad',
    reduceMotion:       'Reducir movimiento',
    reduceMotionDesc:   'Minimizar animaciones y transiciones',
    densityLabel:       'Densidad',
    densityCompact:     'Compacta',
    densityNormal:      'Normal',
    densitySpacious:    'Espaciosa',
    privacy:            'Privacidad',
    activityStatus:     'Estado de actividad',
    activityStatusDesc: 'Mostrar cuando estás en línea a tus compañeros',
    exportData:         'Exportar mis datos',
    exportDataDesc:     'Descargar un archivo con toda tu información',
    exportBtn:          'Descargar',
    dangerZone:         'Zona de peligro',
    deleteAccount:      'Eliminar cuenta',
    deleteAccountDesc:  'Esta acción es irreversible y eliminará todos tus datos',
    deleteBtn:          'Eliminar cuenta',
    /* Navigation */
    navHome:              'Inicio',
    navMyTasks:           'Mis tareas',
    navInbox:             'Bandeja',
    navProjects:          'Proyectos',
    navCycles:            'Cycles',
    navMembers:           'Miembros',
    navPreferences:       'Preferencias',
    navIntegrations:      'Integraciones',
    navDocuments:         'Documentos',
    navReports:           'Reportes',
    navCalendar:          'Calendario',
    navWiki:              'Wiki',
    navLogout:            'Cerrar sesión',
    navNewWorkspace:      '+ Nuevo workspace',
    navMoreOptions:       'Más opciones',
    navExpandSidebar:     'Expandir sidebar',
    navCollapseSidebar:   'Colapsar sidebar',
    navManageWorkspaces:  'Gestionar espacios de trabajo',
    sectionMe:            'Yo',
    sectionTeam:          'Equipo',
    sectionTools:         'Herramientas internas',
    sectionConfig:        'Configuración',
    sectionWorkspaces:    'Espacios de trabajo',
    roleMember:           'Miembro',
  },
  en: {
    /* Preferences page */
    preferences:        'Preferences',
    editProfile:        'Edit profile',
    notifications:      'Notifications',
    mentions:           'Mentions',
    mentionsDesc:       'Notify when someone mentions you',
    assignments:        'Assignments',
    assignmentsDesc:    'Notify when a task is assigned to you',
    comments:           'Comments',
    commentsDesc:       'Notify on tasks you participate in',
    updates:            'Updates',
    updatesDesc:        'Daily summary of team activity',
    appearance:         'Appearance',
    theme:              'Theme',
    light:              'Light',
    dark:               'Dark',
    system:             'System',
    language:           'Language',
    accessibility:      'Accessibility',
    reduceMotion:       'Reduce motion',
    reduceMotionDesc:   'Minimize animations and transitions',
    densityLabel:       'Density',
    densityCompact:     'Compact',
    densityNormal:      'Normal',
    densitySpacious:    'Spacious',
    privacy:            'Privacy',
    activityStatus:     'Activity status',
    activityStatusDesc: 'Show when you are online to your teammates',
    exportData:         'Export my data',
    exportDataDesc:     'Download a file with all your information',
    exportBtn:          'Download',
    dangerZone:         'Danger zone',
    deleteAccount:      'Delete account',
    deleteAccountDesc:  'This action is irreversible and will delete all your data',
    deleteBtn:          'Delete account',
    /* Navigation */
    navHome:              'Home',
    navMyTasks:           'My tasks',
    navInbox:             'Inbox',
    navProjects:          'Projects',
    navCycles:            'Cycles',
    navMembers:           'Members',
    navPreferences:       'Preferences',
    navIntegrations:      'Integrations',
    navDocuments:         'Documents',
    navReports:           'Reports',
    navCalendar:          'Calendar',
    navWiki:              'Wiki',
    navLogout:            'Log out',
    navNewWorkspace:      '+ New workspace',
    navMoreOptions:       'More options',
    navExpandSidebar:     'Expand sidebar',
    navCollapseSidebar:   'Collapse sidebar',
    navManageWorkspaces:  'Manage workspaces',
    sectionMe:            'Me',
    sectionTeam:          'Team',
    sectionTools:         'Internal tools',
    sectionConfig:        'Settings',
    sectionWorkspaces:    'Workspaces',
    roleMember:           'Member',
  },
} as const;

export type TranslationKey = keyof typeof dict.es;

interface LangCtxValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangCtx = createContext<LangCtxValue>({
  lang: 'es',
  setLang: () => {},
  t: (key) => dict.es[key],
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    const stored = localStorage.getItem('rxflow_lang');
    if (stored === 'es' || stored === 'en') {
      setLangState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('rxflow_lang', l);
    document.documentElement.lang = l;
  }

  function t(key: TranslationKey): string {
    return dict[lang][key];
  }

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
