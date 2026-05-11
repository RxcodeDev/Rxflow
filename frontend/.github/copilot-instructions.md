# Rxflow Frontend — Copilot Instructions

Next.js 16.2.1 · React 19.2.4 · TypeScript 5 · Tailwind CSS v4 · Port **3001**

> **⚠ Regla:** Al completar cualquier cambio, actualizar este archivo y `CONTEXT.md` si se agregó una página, componente global, tipo, endpoint consumido o token CSS.

---

## Architecture Overview

```
app/
  (auth)/                    ← Login / Register — no layout, full-screen card
  (dashboard)/               ← Protected area — Sidebar + BottomNav layout
    layout.tsx               ← UIProvider + Sidebar + Navbar + CreateTaskModal + TaskDrawer
    inicio/page.tsx          ← Dashboard overview ('use client', real API data)
    dashboard/page.tsx       ← Vista de dashboard alternativa ('use client')
    mis-tareas/page.tsx      ← Mis tareas grouped by status ('use client')
    inbox/page.tsx           ← Notificaciones — mark read on click ('use client')
    proyectos/page.tsx       ← Lista de proyectos — tabs Activos/Archivados/Todos ('use client')
    proyectos/[id]/board/    ← Kanban board por proyecto ('use client')
    proyectos/[id]/lista/    ← Vista lista
    proyectos/[id]/backlog/  ← Backlog
    proyectos/[id]/epicas/   ← Épicas del proyecto
    proyectos/[id]/cycles/   ← Cycles del proyecto
    proyectos/[id]/tareas/[taskId]/  ← Detalle de tarea
    cycles/page.tsx          ← Cycles globales agrupados por estado ('use client')
    miembros/page.tsx        ← Tabla+cards de miembros ('use client')
    espacios/page.tsx        ← Workspaces ('use client')
    perfil/page.tsx          ← Perfil de usuario ('use client')
    preferencias/page.tsx    ← Preferencias (Server Component, visual only)
    integraciones/page.tsx   ← Integraciones grid (Server Component, visual only)
    herramientas/calendario/ ← Calendario
    herramientas/documentos/ ← Documentos
    herramientas/reportes/   ← Reportes
    herramientas/wiki/       ← Wiki

components/
  ui/                        ← Button, Input, Card, Modal, Spinner, ConfirmModal
  layouts/
    Sidebar.tsx              ← Desktop sidebar ('use client', CSS module)
    Navbar.tsx               ← Mobile bottom nav ('use client', CSS module)
  features/
    auth/                    ← LoginForm, RegisterForm
    tasks/
      CreateTaskModal.tsx    ← Global modal — NEVER mount in individual pages
      TaskDrawer.tsx         ← Global drawer — NEVER mount in individual pages; header + properties fixed, center content scroll, comment composer fixed abajo, menú de 3 puntos para editar/eliminar, modo edición desbloquea título/descripción/asignados/épica/fecha/prioridad y usa calendario popover propio dentro del drawer
    projects/                ← Project-related feature components
    users/                   ← UserTable, UserForm

store/
  UIContext.tsx              ← UIProvider, useUIState(), useUIDispatch()
  slices/
    uiSlice.ts               ← UiState, actions, reducer
    authSlice.ts             ← Auth state helpers

lib/
  api.ts                     ← apiGet, apiPost, apiPatch, apiDelete
  auth.ts                    ← getToken, setToken, removeToken
  validations.ts             ← Client-side form validators

types/
  api.types.ts               ← ApiWrapped<T>, ProjectSummary, TaskItem, TaskAssignee,
                                CycleSummary, MemberItem, NotificationItem, EpicItem,
                                WorkspaceSummary, WorkspaceMember, PaginatedResponse
hooks/
  useAuth.ts
  useDebounce.ts
  useLocalStorage.ts
  usePagination.ts
  useSound.ts
```

Wiki notes:
- `components/features/wiki/WikiPageCard.tsx` usa un contenedor clickable con `router.push()`; no envolver toda la card en `Link` si existen acciones o sublinks internos.
- `components/features/wiki/wikiIcons.ts` debe producir keys únicas por primitiva SVG para evitar warnings de React al abrir el selector de iconos.
- `app/(dashboard)/herramientas/wiki/page.tsx` usa header apilado en mobile; selector de workspace, búsqueda y CTA deben ocupar ancho completo antes de `md`.
- `components/features/wiki/WikiPageCard.tsx` debe mantener visible el botón de opciones en touch; no depender solo de `group-hover`.
- `app/(dashboard)/herramientas/wiki/[id]/page.tsx` en mobile debe usar un trigger icon-only de acciones integrado en cabecera; evitar docks o botones circulares flotantes que se vean forzados.
- `app/(dashboard)/herramientas/wiki/[id]/editar/page.tsx` en mobile debe priorizar el editor y mover la configuración a un panel plegable secundario.
- `components/features/wiki/WikiEditor.tsx` en mobile debe permitir scroll horizontal en toolbar; no comprimir herramientas hasta romper el contenido.

---

## Design Tokens — ALL colors MUST use these variables

```css
--c-bg:         #fff        /* page/card backgrounds */
--c-text:       #111        /* primary text, active items */
--c-text-sub:   #555        /* secondary text, labels */
--c-muted:      #bbb        /* inactive icons, placeholders */
--c-border:     #e0e0e0     /* all borders */
--c-hover:      #f5f5f5     /* hover backgrounds, skeleton pulse */
--c-line:       #efefef     /* <hr>, tree lines */
--c-danger:     #c0392b     /* destructive buttons, errors */
--c-active-pill:#f0f0f0     /* bottom nav active pill */
--c-tooltip-bg: #1c1c1c     /* sidebar tooltip */
--c-avatar-bg:  #e0e0e0     /* avatar circle background */
--c-avatar-fg:  #999        /* avatar initials color */
--sidebar-w:    min(13.75rem, calc(100vw - 2rem))
--sidebar-collapsed-w: min(4.25rem, calc(100vw - 2rem))
--nav-h:        4.25rem
--ease:         0.25s ease
```

Tailwind usage: `text-[var(--c-text)]`, `bg-[var(--c-hover)]`, `border-[var(--c-border)]`

---

## API Layer (`lib/api.ts`)

```ts
// All functions auto-inject JWT from localStorage + redirect to /login on 401
apiGet<T>(path: string): Promise<T>
apiPost<T>(path: string, body: unknown): Promise<T>
apiPatch<T>(path: string, body: unknown): Promise<T>
apiDelete<T>(path: string): Promise<T>
```

- `BASE_URL` = `process.env.NEXT_PUBLIC_API_URL` || `http://localhost:3000`
- Token stored in localStorage as `rxflow_token`
- Throws `ApiError(status, message)` on non-2xx responses
- On **401** → auto-redirects to `/login`

All responses from backend are wrapped:
```ts
interface ApiWrapped<T> { ok: boolean; data: T }
```

---

## Domain Types (`types/api.types.ts`)

```ts
ProjectSummary {
  id, code, name, description, methodology, status,
  extra_views[], tasks_total, tasks_done, progress_pct,
  team[], active_cycle
}

TaskAssignee {
  id, name, initials, avatar_color, avatar_url
}

TaskItem {
  id, sequential_id, identifier, project_name, project_code,
  title, priority, status, epic_id, epic_name,
  assignees: TaskAssignee[],
  /** @deprecated */ assignee_id, /** @deprecated */ assignee_initials,
  due_date
}

CycleSummary {
  id, name, number, status, start_date, end_date,
  scope_pct, project_code, project_name,
  tasks_total, tasks_done, days_left
}

MemberItem {
  id, name, email, role, effective_role, initials,
  avatar_url, avatar_color,
  presence_status, last_seen_at, projects[], tasks_open
}

NotificationItem {
  id, type, message, read, created_at,
  sender: { initials, name },
  task: { id, identifier, title } | null,
  project: { name } | null
}

EpicItem {
  id, name, description, status, parent_epic_id, parent_epic_name
}

WorkspaceMember { id, name, initials }

WorkspaceSummary {
  id, name, description, color, icon,
  created_by, created_at, updated_at,
  members: WorkspaceMember[],
  projects: ProjectSummary[]
}

PaginatedResponse<T> { data: T[], total, page, limit }
```

---

## State Management (`store/`)

**No Redux** — pure `useReducer` + Context.

```ts
// UiState shape (uiSlice.ts)
{
  loading: boolean;
  sidebarOpen: boolean;
  isCreateModalOpen: boolean;
  createModalContext: 'task' | 'subtask' | 'project' | 'workspace' | null;
  isDrawerOpen: boolean;
  activeTaskId: string | null;
  activeProjectId: string | null;
  projectsVersion: number;   // increment → Sidebar re-fetches projects
}

// Action creators
openCreateModal(context: 'task'|'subtask'|'project'|'workspace')
closeCreateModal()
openDrawer({ taskId: string, projectId: string })
closeDrawer()
bumpProjects()   // force Sidebar to re-fetch /projects
```

Usage in any `'use client'` component:
```ts
const dispatch = useUIDispatch();
const state = useUIState();
dispatch(openCreateModal('task'));
dispatch(openDrawer({ taskId: 'ENG-12', projectId: 'ENG' }));
dispatch(bumpProjects());
```

---

## Standard Page Pattern (with real API data)

```tsx
'use client';
import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import type { FooItem, ApiWrapped } from '@/types/api.types';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--c-hover)] rounded animate-pulse ${className}`} />;
}

export default function FooPage() {
  const [data, setData] = useState<FooItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ApiWrapped<FooItem[]>>('/foo')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-8 w-full" />;
  // render data...
}
```

---

## ⛔ REGLA ESTRICTA: Nunca usar `<select>` nativo

**PROHIBIDO** usar `<select>` nativo en ningún formulario del proyecto.  
**SIEMPRE** usar un componente custom dropdown con este patrón:

### Patrón obligatorio para selects

Cualquier campo select debe cumplir:

1. **Trigger estilizado** — botón con borde `var(--c-border)`, `rounded-[0.625rem]`, ícono a la izquierda representando el ítem seleccionado, flecha chevron a la derecha.
2. **Dropdown propio** — `position: absolute`, `z-50`, `bg-[var(--c-bg)]`, `border-[var(--c-border)]`, `rounded-xl`, `shadow-[0_8px_24px_rgba(0,0,0,0.12)]`.
3. **Búsqueda interna** — input con ícono lupa al inicio del dropdown para filtrar opciones.
4. **Íconos por opción** — cada opción lleva un ícono SVG inline (Feather) que represente su categoría o estado.
5. **Tooltip en hover** — `position: fixed` para escapar `overflow-hidden`, con `bg-[var(--c-bg)]`, `border-[var(--c-border)]`, flecha CSS triangular doble (borde + fill).
6. **Chips de categoría** — si aplica, mostrar a qué grupo/proyecto/categoría pertenece cada opción con color único derivado del identificador (hash → paleta de colores).
7. **Cero `<select>` nativo** — no usar `<select>` ni `NativeSelect` para dropdowns que el usuario ve. Los `NativeSelect` solo están permitidos para selectores de workspace/proceso padre donde no hay íconos ni búsqueda requeridos (campos de metadatos simples).

### Componente de referencia

`components/features/wiki/TaskSearchSelect.tsx` — implementación completa con:
- Paleta de colores por proyecto via hash determinista
- Estado de carga (spinner)
- Íconos por status de tarea (done ✓, in_progress reloj, in_review lupa, cancelled ×, backlog círculo)
- Tooltip fixed con nombre completo + proyecto coloreado
- Búsqueda en tiempo real
- Cierre con Escape y clic fuera

**Al crear un nuevo select**, copiar como base `TaskSearchSelect.tsx` y adaptarlo al dominio correspondiente.

---

## UI Atoms (`components/ui/`)

| Component | Key Props | Notes |
|-----------|-----------|-------|
| `Button` | `variant?: 'primary'\|'ghost'\|'danger'`, `loading?`, `onClick` | Full-width by default |
| `Input` | `label?`, `icon?` (ReactNode), `error?` | Icon absolute-left |
| `Card` | `className?` + HTML div props | White bordered rounded |
| `Modal` | `open`, `onClose`, `title?`, `children` | Esc + backdrop closes |
| `ConfirmModal` | `open`, `onConfirm`, `onCancel`, `message` | Destructive actions |
| `Spinner` | `size?: number` | SVG stroke spinner |

---

## Layout Rules (CRITICAL)

### Mobile-first — always start with 1 column
```tsx
// ✅ correct
<div className="grid grid-cols-1 md:grid-cols-[3fr_2fr]">

// ❌ breaks mobile
<div className="grid grid-cols-[3fr_2fr]">
```

### Viewport-constrained layout is DESKTOP ONLY
```tsx
// ✅ correct — mobile scrolls naturally
<div className="flex flex-col gap-3 md:h-full">
  <div className="md:flex-1 md:min-h-0 overflow-auto">

// ❌ wrong — breaks mobile scroll
<div className="h-full flex flex-col">
  <div className="flex-1 min-h-0">
```

### Tables always have mobile card alternative
```tsx
{/* Mobile */}
<div className="flex flex-col gap-3 md:hidden"> {/* cards */} </div>
{/* Desktop */}
<div className="hidden md:block overflow-x-auto"> <table> </div>
```

### Filter bars use flex-wrap
```tsx
<div className="flex flex-wrap items-center gap-2">
```

### Kanban boards — horizontal scroll on mobile is OK
```tsx
<div className="md:flex-1 md:min-h-0 overflow-x-auto">
```

### Touch targets — minimum 44×44px

---

## Global Overlays — CRITICAL RULE

`CreateTaskModal` and `TaskDrawer` are **already mounted** in `(dashboard)/layout.tsx`.

**NEVER mount them again in individual pages.**

To open them, dispatch the action:
```ts
dispatch(openCreateModal('task'))
dispatch(openDrawer({ taskId: '...', projectId: '...' }))
```

---

## Icons

All icons are **inline SVGs** from the Feather icon set:
```tsx
<svg viewBox="0 0 24 24" width={16} height={16}
     fill="none" stroke="currentColor"
     strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
     aria-hidden="true">
  <path d="..." />
</svg>
```

---

## Sidebar (`components/layouts/Sidebar.tsx`)

- `'use client'` — collapse state via `useState`
- Fetches `/projects` from API via `useEffect` + `apiGet`, reactive to `projectsVersion`
- Sections: **Yo** | **Equipo** | **Herramientas internas** | **Configuración**
- Projects block injected after Equipo section as `<details>` accordions
- Active route: `usePathname()` → class `s.navItemActive`
- Collapsed mode: icons only + CSS tooltips via `data-tip`
- "+ Nuevo proyecto" → `dispatch(openCreateModal('project'))`
- CSS module: `Sidebar.module.css`

---

## Navbar (`components/layouts/Navbar.tsx`)

- `'use client'` — More sheet via `useState`
- Visible only on mobile (`md:hidden`)
- Bar: Inicio · Mis tareas · Proyectos · Bandeja
- More sheet: Cycles · Miembros · Preferencias · Integraciones · Cerrar sesión
- CSS module: `BottomNav.module.css`

---

## `'use client'` Rules

Only add `'use client'` when the component uses:
- `useState`, `useEffect`, `useReducer`, `useRef`
- `useContext`, `useUIState`, `useUIDispatch`
- `usePathname`, `useRouter`, `useSearchParams`
- Browser APIs (`localStorage`, `window`, `document`)
- Event handlers that need client interactivity

Server Components are the default — keep them pure.

---

## Anti-Duplication Rule (BUILD BREAKS)

Each `page.tsx` must have **exactly one** `export default function`.  
When rewriting a page, **replace the entire old function** — never leave two exports.

---

## Available API Endpoints

```
POST /auth/register          { name, email, password }
POST /auth/login             { email, password }  → returns JWT

GET  /projects               → ApiWrapped<ProjectSummary[]>
GET  /projects/:code         → ApiWrapped<ProjectSummary>
GET  /projects/:code/tasks   → ApiWrapped<TaskItem[]>
GET  /projects/:code/epics   → ApiWrapped<EpicItem[]>
POST /projects/:code/epics   { name, description?, parent_epic_id? }
PATCH /projects/:code/epics/:epicId  { name?, description?, status?, parent_epic_id? }
DELETE /projects/:code/epics/:epicId

GET  /tasks/mine             → ApiWrapped<TaskItem[]>
GET  /tasks?projectCode=&status=&cycleId=  → ApiWrapped<TaskItem[]>
GET  /tasks/:id              → ApiWrapped<TaskDetail>
POST /tasks                  → create task
PATCH /tasks/:id             → update task fields
POST /tasks/:id/comments     { content }

GET  /cycles                 → ApiWrapped<CycleSummary[]>
GET  /cycles/:id             → ApiWrapped<CycleSummary>

GET  /notifications          → ApiWrapped<NotificationItem[]>
GET  /notifications/unread-count → ApiWrapped<number>
PATCH /notifications/:id/read   → mark one read
PATCH /notifications/read-all   → mark all read

GET  /users                  → ApiWrapped<MemberItem[]>

GET  /workspaces             → ApiWrapped<WorkspaceSummary[]>
GET  /workspaces/unassigned-projects → ApiWrapped<ProjectSummary[]>
GET  /workspaces/:id         → ApiWrapped<WorkspaceSummary>
POST /workspaces             { name, description?, color?, icon? }
PATCH /workspaces/:id        { ...campos }
DELETE /workspaces/:id
POST /workspaces/:id/projects  { projectId }
DELETE /workspaces/:id/projects/:projectId
POST /workspaces/:id/members   { userId }
DELETE /workspaces/:id/members/:userId

POST /licenses               { name }
GET  /licenses               → License[]
GET  /licenses/:id           → License
GET  /licenses/:id/my-workspaces → ApiWrapped<WorkspaceSummary[]>
POST /licenses/:id/members   { userId, role? }
DELETE /licenses/:id/members/:userId

POST /seed                   → populate demo data (dev only)
GET  /seed/status            → { users, projects, tasks, cycles }
```

---

## Pending Work

- `TaskDrawer` — still uses DEMO_TASK / DEMO_SUBTASKS / DEMO_COMMENTS (needs real API)
- `CreateTaskModal` — PROJECTS/EPICS/ASSIGNEES still hardcoded (needs real API)
