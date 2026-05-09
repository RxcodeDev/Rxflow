/**
 * Shared wiki icon definitions.
 * Icons are stored as short string keys (≤10 chars) in the DB.
 * Use renderWikiIcon() to render any key as an SVG element.
 */

import React from 'react';

// ── helpers to build SVG child elements without JSX ──────────────────────────
const pa = (d: string) => React.createElement('path', { key: `path:${d}`, d });
const pl = (points: string) => React.createElement('polyline', { key: `polyline:${points}`, points });
const li = (x1: string | number, y1: string | number, x2: string | number, y2: string | number) =>
  React.createElement('line', { key: `line:${x1}:${y1}:${x2}:${y2}`, x1, y1, x2, y2 });
const ci = (cx: number, cy: number, r: number) =>
  React.createElement('circle', { key: `circle:${cx}:${cy}:${r}`, cx, cy, r });
const rc = (x: number, y: number, width: number, height: number, rx?: number) =>
  React.createElement('rect', { key: `rect:${x}:${y}:${width}:${height}:${rx ?? ''}`, x, y, width, height, ...(rx !== undefined && { rx }) });
const pg = (points: string) => React.createElement('polygon', { key: `polygon:${points}`, points });
const el = (cx: number, cy: number, rx: number, ry: number) =>
  React.createElement('ellipse', { key: `ellipse:${cx}:${cy}:${rx}:${ry}`, cx, cy, rx, ry });

// ── Icon SVG children indexed by key ──────────────────────────────────────────
const ICON_PATHS: Record<string, React.ReactNode[]> = {
  // Documentos
  doc:    [pa('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), pl('14 2 14 8 20 8')],
  book:   [pa('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'), pa('M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z')],
  list:   [li(8,6,21,6), li(8,12,21,12), li(8,18,21,18), li(3,6,'3.01',6), li(3,12,'3.01',12), li(3,18,'3.01',18)],
  edit:   [pa('M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z')],
  clip:   [pa('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'), rc(8,2,8,4,1)],
  // Proceso
  gear:   [ci(12,12,3), pa('M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z')],
  wrench: [pa('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z')],
  layers: [pg('12 2 2 7 12 12 22 7 12 2'), pl('2 17 12 22 22 17'), pl('2 12 12 17 22 12')],
  gitbranch:[li(6,3,6,15), ci(18,6,3), ci(6,18,3), pa('M18 9a9 9 0 0 1-9 9')],
  zap:    [pg('13 2 3 14 12 14 11 22 21 10 12 10 13 2')],
  // Comunicación
  chat:   [pa('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')],
  mail:   [pa('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'), pl('22,6 12,13 2,6')],
  bell:   [pa('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'), pa('M13.73 21a2 2 0 0 1-3.46 0')],
  send:   [li(22,2,11,13), pg('22 2 15 22 11 13 2 9 22 2')],
  users:  [pa('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'), ci(9,7,4), pa('M23 21v-2a4 4 0 0 0-3-3.87'), pa('M16 3.13a4 4 0 0 1 0 7.75')],
  // Datos
  chart:  [li(18,20,18,10), li(12,20,12,4), li(6,20,6,14)],
  trend:  [pl('23 6 13.5 15.5 8.5 10.5 1 18'), pl('17 6 23 6 23 12')],
  db:     [el(12,5,9,3), pa('M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'), pa('M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5')],
  server: [rc(2,2,20,8,2), rc(2,14,20,8,2), li(6,6,'6.01',6), li(6,18,'6.01',18)],
  code:   [pl('16 18 22 12 16 6'), pl('8 6 2 12 8 18')],
  // Estado
  check:  [pa('M22 11.08V12a10 10 0 1 1-5.93-9.14'), pl('22 4 12 14.01 9 11.01')],
  flag:   [pa('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'), li(4,22,4,15)],
  lock:   [rc(3,11,18,11,2), pa('M7 11V7a5 5 0 0 1 10 0v4')],
  star:   [pg('12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2')],
  award:  [ci(12,8,7), pl('8.21 13.89 7 23 12 20 17 23 15.79 13.88')],
  // General
  home:   [pa('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'), pl('9 22 9 12 15 12 15 22')],
  globe:  [ci(12,12,10), li(2,12,22,12), pa('M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z')],
  folder: [pa('M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z')],
  box:    [pa('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'), pl('3.27 6.96 12 12.01 20.73 6.96'), li(12,'22.08',12,12)],
  target: [ci(12,12,10), ci(12,12,6), ci(12,12,2)],
};

export interface WikiIconGroup {
  label: string;
  icons: Array<{ key: string; label: string }>;
}

export const WIKI_ICON_GROUPS: WikiIconGroup[] = [
  { label: 'Documentos', icons: [
    { key: 'doc',    label: 'Documento' },
    { key: 'book',   label: 'Libro' },
    { key: 'list',   label: 'Lista' },
    { key: 'edit',   label: 'Editar' },
    { key: 'clip',   label: 'Portapapeles' },
  ]},
  { label: 'Proceso', icons: [
    { key: 'gear',      label: 'Configuración' },
    { key: 'wrench',    label: 'Herramienta' },
    { key: 'layers',    label: 'Capas' },
    { key: 'gitbranch', label: 'Flujo' },
    { key: 'zap',       label: 'Acción rápida' },
  ]},
  { label: 'Comunicación', icons: [
    { key: 'chat',  label: 'Mensajes' },
    { key: 'mail',  label: 'Correo' },
    { key: 'bell',  label: 'Alertas' },
    { key: 'send',  label: 'Enviar' },
    { key: 'users', label: 'Equipo' },
  ]},
  { label: 'Datos', icons: [
    { key: 'chart',  label: 'Gráfico' },
    { key: 'trend',  label: 'Tendencia' },
    { key: 'db',     label: 'Base de datos' },
    { key: 'server', label: 'Servidor' },
    { key: 'code',   label: 'Código' },
  ]},
  { label: 'Estado', icons: [
    { key: 'check', label: 'Completado' },
    { key: 'flag',  label: 'Bandera' },
    { key: 'lock',  label: 'Bloqueado' },
    { key: 'star',  label: 'Destacado' },
    { key: 'award', label: 'Premio' },
  ]},
  { label: 'General', icons: [
    { key: 'home',   label: 'Inicio' },
    { key: 'globe',  label: 'Global' },
    { key: 'folder', label: 'Carpeta' },
    { key: 'box',    label: 'Paquete' },
    { key: 'target', label: 'Objetivo' },
  ]},
];

/** Render a wiki icon as a React SVG element. Returns null for unknown / empty keys. */
export function renderWikiIcon(
  key: string | null | undefined,
  size = 16,
  className = '',
): React.ReactElement | null {
  if (!key) return null;
  const children = ICON_PATHS[key];
  if (!children) return null;
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      stroke: 'currentColor',
      fill: 'none',
      strokeWidth: '1.75',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      className,
    },
    ...children,
  );
}
