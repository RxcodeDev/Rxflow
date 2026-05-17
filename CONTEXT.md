# Rxflow — Índice de Contexto

> Pega este archivo completo al inicio de cada conversación con Copilot.

> Si no estan levando el frontend en local levantalo el backend y bd es mediante docker

> **⚠ Frontend corre en Docker — SIEMPRE hacer rebuild al cambiar código:**
> ```bash
> docker compose build frontend && docker compose up -d frontend
> ```
> Los cambios en archivos `.tsx`/`.ts` NO se reflejan hasta reconstruir el contenedor. No hay hot-reload en producción Docker.

> **⚠ Regla de mantenimiento:** Cada vez que Copilot haga un cambio en el proyecto (nueva página, nuevo endpoint, nuevo componente, cambio de arquitectura, nueva dependencia, etc.) **debe actualizar este archivo y el `.github/copilot-instructions.md` correspondiente** antes de terminar la tarea.

---

## Stack

| Capa | Tech | Puerto |
|------|------|--------|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 | **3001** |
| Backend | NestJS 11 + PostgreSQL (Docker) | **3000** |

```bash
# Iniciar todo
docker-compose up -d          # PostgreSQL
cd backend && npm run start:dev
cd frontend && npm run dev
```

---

## Instrucciones completas por carpeta

- **Raíz** → `.github/copilot-instructions.md`
- **Frontend** → `frontend/.github/copilot-instructions.md`
- **Backend** → `backend/.github/copilot-instructions.md`

## Scripts operativos

- `scripts/sql/restructure_accounts_and_users.sql` → Reasigna ownership por reglas de negocio (Michelle/Daniel => rxcode, soporte/REC => SOPORTE), consolida workspaces duplicados por nombre, conserva workspaces existentes y repara wiki huérfana.

---

## Mapa de archivos clave

### Frontend (`frontend/`)
```
app/page.tsx                                   ← Landing pública de entrada con botones a /login y /register
app/(dashboard)/layout.tsx                      ← UIProvider + Sidebar + Navbar + modales globales
app/(dashboard)/inicio/page.tsx                 ← Dashboard overview ('use client', datos reales)
app/(dashboard)/dashboard/page.tsx              ← Vista de dashboard alternativa
app/(dashboard)/mis-tareas/page.tsx             ← Tareas por status ('use client')
app/(dashboard)/inbox/page.tsx                  ← Notificaciones
app/(dashboard)/proyectos/page.tsx              ← Proyectos — patrón 100dvh (regla 14): header fijo (título + toolbar + tabs) + scroll solo en el contenido. Buscador en vivo (nombre/código), orden (SearchSelect: nombre/progreso/tareas/estado), toggle Grid/Tabla (persistido en localStorage 'rxflow_projects_view', desktop only — mobile siempre cards), tarjetas con barra de acento por color de código (paletteColor) + progreso con color por % + avatares reales (componente compartido `components/ui/Avatar.tsx`) + estado con dot de color, tabla con cabeceras ordenables; menú contextual Importar/Exportar/Editar/Eliminar
app/(dashboard)/proyectos/[id]/board/page.tsx   ← Kanban board
app/(dashboard)/proyectos/[id]/lista/page.tsx   ← Vista lista
app/(dashboard)/proyectos/[id]/backlog/page.tsx ← Backlog
app/(dashboard)/proyectos/[id]/epicas/page.tsx  ← Épicas
app/(dashboard)/proyectos/[id]/cycles/page.tsx  ← Cycles de proyecto
app/(dashboard)/proyectos/[id]/tareas/[taskId]/page.tsx ← Detalle de tarea
app/(dashboard)/cycles/page.tsx                 ← Cycles globales
app/(dashboard)/miembros/page.tsx               ← Gestión de miembros de licencia — panel split (lista izquierda + detalle derecho), control de acceso por workspace/proyecto por miembro, modal AddMember con 2 modos: "Invitar via link" (genera token) y "Crear cuenta" (formulario completo)
app/invitar/[token]/page.tsx                    ← Página pública (sin auth) para aceptar invitaciones — muestra info de la licencia/rol, formulario nombre+correo+pwd, auto-login tras aceptar
app/(dashboard)/espacios/page.tsx               ← Workspaces — panel split (lista izquierda con buscador + detalle derecho), patrón 100dvh (regla 14), scrolls internos, mobile bottom sheet (h-[88dvh]). Avatares de miembros/equipo usan el componente compartido `components/ui/Avatar.tsx`. "Asignar proyecto" en la cabecera del detalle, no en footer.
app/(dashboard)/perfil/page.tsx                 ← Perfil de usuario
app/(dashboard)/preferencias/page.tsx           ← Preferencias (Server Component)
app/(dashboard)/integraciones/page.tsx          ← Integraciones (Server Component)
app/(dashboard)/herramientas/calendario/page.tsx
app/(dashboard)/herramientas/documentos/page.tsx
app/(dashboard)/herramientas/reportes/page.tsx
app/(dashboard)/herramientas/wiki/page.tsx              ← Wiki home — árbol + lista de páginas ('use client', header apilado en mobile)
app/(dashboard)/herramientas/wiki/nueva/page.tsx        ← Crear nueva página wiki ('use client')
app/(dashboard)/herramientas/wiki/[id]/page.tsx         ← Ver página wiki ('use client', trigger icon-only de acciones en cabecera mobile + sidebar solo desktop)
app/(dashboard)/herramientas/wiki/[id]/editar/page.tsx  ← Editar página wiki ('use client', editor primero y configuración plegable en mobile)

components/features/wiki/
  WikiEditor.tsx       ← Editor Tiptap (StarterKit + Link + Placeholder, toolbar horizontal scroll en mobile)
  WikiViewer.tsx       ← Render read-only Tiptap JSON
  WikiPageTree.tsx     ← Árbol recursivo colapsable (targets táctiles ampliados en mobile)
  WikiBreadcrumb.tsx   ← Breadcrumb de jerarquía
  WikiRelationBadges.tsx ← Badges de workspace/proyecto/épica/tarea
  WikiPageCard.tsx     ← Card de página en vista grid (contenedor clickable, sin Link padre, menú visible en touch)
  WikiRelationPicker.tsx ← Pickers para vincular página a entidades

components/layouts/Sidebar.tsx    ← Sidebar desktop ('use client')
components/layouts/Navbar.tsx     ← Bottom nav mobile ('use client')
components/features/tasks/
  CreateTaskModal.tsx             ← Modal global — NO montar en páginas individuales; crea tareas asociadas a una épica. La sección "Nuevo proyecto" delega en el componente reciclable `ProjectForm` (mode="create")
  TaskDrawer.tsx                  ← Drawer global — NO montar en páginas individuales; cabecera + propiedades fijas, scroll solo en contenido central, composer de comentarios fijo abajo, menú de 3 puntos para editar/eliminar, modo edición desbloquea título/descripción/asignados/épica/fecha/prioridad y usa calendario popover propio dentro del drawer
components/features/projects/
  ImportProjectModal.tsx          ← Modal para contexto IA + importación JSON y exportación completa por proyecto
  ProjectForm.tsx                 ← Formulario reciclable de proyecto (mismo patrón visual para crear y editar). Props discriminadas por `mode`: "create" (identificador editable + auto-generado con chequeo de unicidad, POST /projects + router.push) | "edit" (identificador read-only, Estado, PATCH /projects/:id + onSaved). "Vistas habilitadas" se muestra en AMBOS modos (las vistas por defecto de la metodología quedan marcadas y bloqueadas; el resto opcionales) y se envían como extra_views tanto al crear como al editar. Espacio de trabajo siempre con SearchSelect (sin <select> nativo). Exporta Field, PillGroup, baseCls, METHODOLOGIES
  EditProjectModal.tsx            ← Wrapper fino: Modal + <ProjectForm mode="edit">. Sin lógica propia
components/ui/                    ← Button, Input, Card, Modal, Spinner, ConfirmModal, SearchSelect, Tooltip, Avatar
  Avatar.tsx                      ← Avatar reutilizable (patrón Sidebar): imagen real o inicial con avatar_color + dot de presencia. Props: name, initials, url, color, presence ('online'|'away'|'offline'), size, ring. Exporta Presence y PRESENCE_COLOR. Usar SIEMPRE este componente para avatares de usuario/equipo (no recrear el patrón inline).

store/UIContext.tsx                ← UIProvider, useUIState(), useUIDispatch()
store/slices/uiSlice.ts           ← openCreateModal, closeCreateModal, openDrawer, closeDrawer, bumpProjects
lib/api.ts                        ← apiGet, apiPost, apiPatch, apiDelete
types/api.types.ts                ← ApiWrapped<T>, ProjectSummary, TaskItem, TaskAssignee, CycleSummary,
                                     MemberItem, NotificationItem, EpicItem, WorkspaceSummary, PaginatedResponse,
                                     License, WikiPageSummary, WikiPageDetail, WikiTreeNode,
                                     LicenseMemberAccess, LicenseMemberAccessWorkspace, LicenseMemberAccessProject
middleware.ts                     ← Protege rutas, redirige a /login si no hay cookie rxflow_token
proxy.ts                          ← Guard de rutas: permite /, /login y /register sin token
```

Notas Wiki:
- `components/features/wiki/wikiIcons.ts` debe generar keys únicas por primitiva SVG para evitar warnings de React al abrir el selector de iconos.
- `components/features/wiki/WikiPageCard.tsx` no debe envolver toda la card en `Link` si contiene acciones internas o subpáginas navegables.
- El borrado desde `app/(dashboard)/herramientas/wiki/page.tsx` elimina la página y todos sus descendientes del estado local.
- En mobile, `app/(dashboard)/herramientas/wiki/page.tsx` debe apilar selector, búsqueda y CTA a ancho completo; evitar reutilizar la barra horizontal de desktop.
- En mobile, `app/(dashboard)/herramientas/wiki/[id]/page.tsx` debe priorizar lectura: usar trigger icon-only de acciones integrado en cabecera, evitar FABs/círculos flotantes forzados y reservar el sidebar completo para `md+`.
- En mobile, `app/(dashboard)/herramientas/wiki/[id]/editar/page.tsx` debe priorizar el editor: contenido arriba y configuración como panel plegable secundario debajo.
- En mobile, `components/features/wiki/WikiPageCard.tsx` no debe depender de `group-hover` para mostrar el menú de opciones.

### Backend (`backend/src/`)
```
main.ts                           ← CORS, ValidationPipe global, HttpExceptionFilter, TransformInterceptor
app.module.ts                     ← Importa todos los módulos
modules/auth/                     ← POST /auth/register, /auth/login, GET /auth/me
modules/users/                    ← GET /users, GET /users/:id
modules/projects/                 ← GET /projects, /projects/:code, /projects/:code/tasks, /projects/:code/epics
modules/tasks/                    ← GET/POST/PATCH /tasks, /tasks/mine, /tasks/:id
modules/cycles/                   ← GET /cycles, /cycles/:id
modules/notifications/            ← GET /notifications, PATCH mark-read
modules/seed/                     ← POST /seed, GET /seed/status
modules/workspaces/               ← Workspaces CRUD + miembros + proyectos
modules/licenses/                 ← Licenses CRUD + miembros + workspaces (usa Prisma)
modules/wiki/                     ← Wiki CRUD + filtros por proyecto/workspace/épica/tarea (usa Prisma)
modules/export/                   ← Export full/markdown + export por proyecto + contexto IA para LLM
modules/import/                   ← Import masivo por proyecto (épicas/tareas/subtareas desde JSON)
prisma/                           ← PrismaModule + PrismaService (licenses + wiki)
common/guards/jwt-auth.guard.ts   ← JwtAuthGuard — usar en todo controlador protegido
common/decorators/current-user.decorator.ts  ← @CurrentUser()
common/interceptors/transform.interceptor.ts ← Envuelve todo en { ok, data }
config/database.config.ts         ← getPool() singleton (raw pg, sin ORM)
```

> **Nota arquitectura:** la mayoría de módulos usa raw `pg` via `getPool()`. Solo el módulo `licenses` usa Prisma (PrismaService). No mezclar: si extiendes un módulo existente, mantén su patrón de acceso a DB.

> **Nota avatar:** `users.avatar_url` debe soportar data URLs/base64 de la UI de perfil; el campo en BD no debe limitarse a `varchar(500)`.

---

## Modelo de datos — jerarquía de Épicas y Tareas

- **Épicas** son entidades de agrupación que pueden tener una épica padre (`parent_epic_id`), formando una jerarquía árbol. Una épica pertenece a un proyecto.
- **Tareas** son los items de trabajo hoja. Cada tarea puede asociarse a una épica (`epic_id`). Las tareas son conceptualmente las "subtareas" de una épica.
- **No existe tarea-subtarea**: el campo `parent_task_id` existe en la BD como artefacto histórico pero NO se usa en la UI ni en los endpoints activos. No crear ni documentar lógica de subtareas entre tareas.

```
Proyecto
 └── Épica A
      ├── Épica A.1  (épica hija, vía parent_epic_id)
      │    └── Tarea 3
      ├── Tarea 1
      └── Tarea 2
```

## Trabajo pendiente

TaskDrawer y CreateTaskModal aún usan datos demo hardcodeados (pendiente conectar a API real).

---

## Design Tokens (todos los colores)

```css
--c-bg         #fff      fondos
--c-text       #111      texto principal
--c-text-sub   #555      texto secundario
--c-muted      #bbb      iconos inactivos
--c-border     #e0e0e0   bordes
--c-hover      #f5f5f5   hover / skeleton
--c-line       #efefef   divisores
--c-danger     #c0392b   acciones destructivas
--c-success    #16a34a   confirmaciones / estados exitosos
--c-active-pill #f0f0f0  nav activo
--nav-h        4.25rem
--ease         0.25s ease
```

Uso en Tailwind: `bg-[var(--c-hover)]`, `text-[var(--c-text)]`, `border-[var(--c-border)]`

---

## API — Todos los endpoints

```
POST /auth/register       { name, email, password }
POST /auth/login          { email, password }  → JWT
GET  /auth/me             [JWT]

GET  /projects            → ProjectSummary[]
GET  /projects/:code      → ProjectSummary
POST /projects            { name, code, description?, methodology?, extra_views? }
PATCH /projects/:id       { name?, description?, methodology?, status?, extra_views? }
GET  /projects/:code/tasks → TaskItem[]
GET  /projects/:code/epics → EpicItem[]
POST /projects/:code/epics { name, description?, parent_epic_id? }
PATCH /projects/:code/epics/:epicId { name?, description?, status?, parent_epic_id? }
DELETE /projects/:code/epics/:epicId

GET  /tasks/mine          → TaskItem[]  (usa @CurrentUser)
GET  /tasks?projectCode=&status=&cycleId=  → TaskItem[]
GET  /tasks/:id           → TaskDetail
POST /tasks               { projectCode, title, priority, status, assigneeId?, epicId?, cycleId?, dueDate? }
PATCH /tasks/:id          { ...campos }
DELETE /tasks/:id         → elimina la tarea permanentemente
POST /tasks/:id/comments  { content }

GET  /cycles              → CycleSummary[]
GET  /cycles/:id          → CycleSummary

GET  /notifications       → NotificationItem[]
GET  /notifications/unread-count → number
PATCH /notifications/:id/read
PATCH /notifications/read-all

GET  /users               → MemberItem[]
GET  /users/:id           → MemberItem

Normalizacion de roles de usuario:
- `POST /users`, `POST /users/invite` y `PATCH /users/:id` aceptan formato canonico `userType` + `roleType` (tambien `user_type` + `role_type`).
- `role` se mantiene por compatibilidad legacy.
- `userType`: `member` | `owner` | `admin`.
- `roleType`: `Tech Lead` | `Backend Dev` | `Frontend Dev` | `Full Stack Dev` | `Designer` | `Product Manager`.
- Esquema fisico en BD: `users.user_type` (NOT NULL) y `users.role_type` (NULLABLE).
- `GET /users` y `GET /users/:id` exponen `user_type` y `role_type` ademas de `role`.

GET  /workspaces          → WorkspaceSummary[]
GET  /workspaces/unassigned-projects → ProjectSummary[]
GET  /workspaces/:id      → WorkspaceSummary
POST /workspaces          { name, description?, color?, icon? }
PATCH /workspaces/:id     { ...campos }
DELETE /workspaces/:id
POST /workspaces/:id/projects  { projectId }
DELETE /workspaces/:id/projects/:projectId
POST /workspaces/:id/members   { userId }
DELETE /workspaces/:id/members/:userId

POST /licenses            { name }
GET  /licenses            → License[]
GET  /licenses/:id        → License
POST /licenses/:id/members       { userId, role? }
DELETE /licenses/:id/members/:userId
POST /licenses/:id/assign-workspace    { workspaceId }
DELETE /licenses/:id/assign-workspace  { workspaceId }
POST /licenses/:id/assign-project     { projectId }
DELETE /licenses/:id/assign-project   { projectId }
GET  /licenses/:id/members                            → LicenseMemberAccess[] (miembros + acceso por workspace/proyecto)
PATCH /licenses/:id/members/:userId                  { role } → cambia rol en la licencia (solo owner puede)
DELETE /licenses/:id/members/:userId/projects/:projectId → quita acceso al proyecto para ese miembro
GET  /licenses/:id/my-workspaces → WorkspaceSummary[]

GET  /wiki?licenseId=                      → WikiPageSummary[]
GET  /wiki/tree?licenseId=                 → WikiTreeNode[]  (árbol recursivo)
GET  /wiki/search?licenseId=&q=            → WikiPageSummary[]
GET  /wiki/by-project/:code?licenseId=     → WikiPageSummary[]
GET  /wiki/by-workspace/:id?licenseId=     → WikiPageSummary[]
GET  /wiki/by-epic/:id?licenseId=          → WikiPageSummary[]
GET  /wiki/by-task/:id?licenseId=          → WikiPageSummary[]
GET  /wiki/:id                             → WikiPageDetail (+ breadcrumb + children)
POST /wiki                                 { licenseId, title, content?, workspaceId?, projectCode?, epicId?, taskId?, parentPageId? }
PATCH /wiki/:id                            { title?, content?, ...relaciones }
DELETE /wiki/:id
PATCH /wiki/:id/archive                    → toggle is_archived

GET  /invites/:token                → info pública de la invitación (sin auth)
POST /invites/:token/accept         { name, email, password } → crea usuario, une a licencia, devuelve JWT (sin auth)
POST /licenses/:id/invites          { role, roleType? } → genera token de invitación válido 7 días [JWT]

GET  /export/full
GET  /export/markdown
GET  /export/project/:code                 → JSON completo de un proyecto
GET  /export/project/:code/context         → contexto para LLM (IDs, relaciones, valores válidos, esquema)

POST /import/project/:code/preview         → valida/normaliza sin insertar; devuelve preview + errores
POST /import/project/:code                 { epics?: ImportEpicDto[], tasks?: ImportTaskDto[] }

POST /seed                (solo dev)
GET  /seed/status         → { users, projects, tasks, cycles }
```

Nota de seguridad multi-cuenta:
- `GET /users`, `GET /projects`, `GET /tasks`, `GET /tasks/mine` y `GET /cycles` deben devolver solo datos visibles dentro de las licencias/cuenta del usuario autenticado (owner/member), evitando mezclar cuentas.
- Regla de ownership en licencias: considerar owner tanto por `licenses.owner_id` como por `license_members.role = 'owner'` para visibilidad total de workspaces/proyectos dentro de la cuenta.

Respuesta siempre: `{ ok: boolean; data: T }`

---

## State UI

```ts
// Leer estado
const { isDrawerOpen, activeTaskId, isCreateModalOpen } = useUIState();

// Disparar acciones
const dispatch = useUIDispatch();
dispatch(openCreateModal('task'));          // 'task' | 'project' | 'workspace'
dispatch(closeCreateModal());
dispatch(openDrawer({ taskId, projectId }));
dispatch(closeDrawer());
dispatch(bumpProjects());                  // fuerza re-fetch de /projects en Sidebar
```

---

## Credenciales demo

```
ana@rxflow.io  / audit1234
luis@rxflow.io / audit1234
sara@rxflow.io / audit1234
juan@rxflow.io / audit1234
```

---

## Reglas críticas (resumen)

1. **Cero colores hardcodeados** — siempre `var(--c-*)`
2. **`'use client'`** solo si usa hooks, estado, Browser APIs o Router hooks
3. **Mobile-first** — `grid-cols-1` base, luego `md:grid-cols-N`
4. **Tablas** = versión card en mobile (`md:hidden`) + tabla en desktop (`hidden md:block`)
5. **Una sola** `export default function` por `page.tsx`
6. **CreateTaskModal y TaskDrawer** ya están montados en `layout.tsx` — nunca volver a montarlos
7. **SQL parametrizado** en backend — nunca interpolación de strings
8. **Iconos** = Feather, SVG inline, `viewBox="0 0 24 24"`, stroke-based, `aria-hidden="true"`
9. **⛔ NUNCA `<select>` nativo** — siempre custom dropdown con búsqueda, íconos por opción y tooltip en hover. Referencia: `components/features/wiki/TaskSearchSelect.tsx`
10. **Empty states siempre centrados en su contenedor** — Cualquier mensaje de estado vacío ("No hay tareas", "Sin resultados", "Acceso restringido", etc.) debe centrarse verticalmente **dentro de su contenedor**, no con padding fijo:
    ```tsx
    // ✅ Correcto — se centra en el espacio disponible
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-[var(--c-muted)]">
      ...
    </div>

    // ❌ Incorrecto — padding fijo no centra en el contenedor
    <div className="py-16 flex flex-col items-center gap-3 text-center">
      ...
    </div>
    ```
    Si el contenedor tiene altura fija (`100dvh`, `flex-1`, etc.) el empty state hereda esa altura con `h-full`.

11. **Botones CRUD — estilos normalizados** — Tres variantes, siempre con variables CSS, nunca colores hardcodeados:
    ```tsx
    // Primario (crear, guardar, confirmar)
    "bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-80"

    // Secundario (cancelar, acción neutra)
    "border border-[var(--c-border)] text-[var(--c-text-sub)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)]"

    // Peligro (eliminar, acción destructiva)
    "border border-[var(--c-danger)] text-[var(--c-danger)] hover:bg-[var(--c-danger)] hover:text-[var(--c-bg)]"
    ```
    ❌ Nunca usar `hover:bg-[var(--c-hover)]` en botones de peligro — el hover gris en rojo es inconsistente.
    ❌ Nunca usar `hover:bg-[var(--c-hover)]` en botones secundarios — el relleno gris es opaco y sin intención; usar `hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)]` en su lugar.
    ❌ Nunca usar `hover:opacity-XX` en botones secundarios.

12. **⛔ NUNCA botones de solo texto sin estilo visual** — Un elemento `<button>` cuyo único estilo es `text-[color] hover:text-[otro]` no parece clickable y confunde al usuario. Para acciones inline secundarias (regenerar, limpiar, reintentar, etc.) usar siempre un **icono-botón** con borde y tamaño fijo:
    ```tsx
    // ✅ Correcto — icono-botón con borde y título descriptivo
    <button
      type="button"
      title="Generar nuevo enlace"
      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-muted)] hover:border-[var(--c-text-sub)] hover:text-[var(--c-text)] transition-colors cursor-pointer bg-transparent"
    >
      <svg .../>  {/* Feather: rotate-ccw, refresh-cw, x, etc. */}
    </button>

    // ❌ Incorrecto — texto plano que no parece botón
    <button className="text-[12px] text-[var(--c-muted)] hover:text-[var(--c-text-sub)]">
      Generar nuevo enlace
    </button>
    ```
    El `title` actúa como tooltip accesible. Posicionar el icono en el extremo del contexto donde aplica la acción (ej. esquina del label, junto al input).

13. **Tooltips — patrón único con `<Tooltip>`** — Usar siempre `components/ui/Tooltip.tsx`. Nunca `title=""` nativo ni tooltips ad-hoc con `position: absolute` (se cortan en contenedores `overflow`). El componente usa `getBoundingClientRect()` + `position: fixed` para escapar cualquier overflow:
    ```tsx
    import Tooltip from '@/components/ui/Tooltip';

    <Tooltip
      content="Texto del tooltip"
      side="right"           // 'top' | 'bottom' | 'left' | 'right'
      icon={<svg .../>}      // Feather icon opcional — da contexto visual
    >
      <button ...>
        <svg .../>
      </button>
    </Tooltip>
    ```
    Estilos del tooltip: `bg-[var(--c-bg)]`, `border-[var(--c-border)]`, `shadow-sm`, texto `font-semibold text-[11px]`, flecha apuntando al trigger.
    ❌ Nunca usar `title=""` en icono-botones visibles — no es consistente con el diseño.
    ❌ Nunca implementar tooltips con `position: absolute` dentro de contenedores con `overflow`.

15. **Vista mobile obligatoria en cada página** — Cada página o vista del dashboard **debe tener una UX/UI mobile dedicada**, no una versión reducida del desktop. Reglas:
    - En mobile (`< md`) ocultar paneles laterales y columnas extra; reemplazar por **bottom sheet** (handle visible, `h-[88dvh] flex flex-col`, inner `flex-1 min-h-0 overflow-y-auto`) activado al tocar un item.
    - Cuando el detalle tiene múltiples secciones, usar **tabs con indicador underline** en vez de scroll largo:
      ```tsx
      const TABS = ['perfil', 'permisos', 'acceso'] as const;
      type Tab = typeof TABS[number];
      const [tab, setTab] = useState<Tab>('perfil');
      // Tab bar: flex gap-1 border-b border-[var(--c-border)] — botón por tab con indicador absolute bottom-0
      // Contenido: flex-1 min-h-0 overflow-y-auto pb-4
      ```
    - La bottom sheet debe tener un handle visual (`w-10 h-1 rounded-full bg-[var(--c-border)]`) y cerrarse al tocar el backdrop.
    - Los botones de acción del panel en mobile deben ser **icon-buttons con Tooltip**, no texto largo.
    - Añadir `pb-[calc(var(--nav-h)+2rem)]` a columnas scrollables que puedan quedar tapadas por el nav mobile.
    ❌ Nunca usar `overflow-y-auto p-5 max-h-[X]` como wrapper del bottom sheet — el scroll externo rompe el scroll interno de los tabs.

14. **Patrón 100dvh (sin scroll general)** — Páginas que deben llenar la pantalla sin scroll del `<main>` padre.
    ⛔ **REGLA: el contenedor raíz NUNCA debe ser más alto que el sidebar.** Si lo es, el `<main>` (que es `overflow-auto`) scrollea y el footer del sidebar ("Cerrar sesión") queda desfasado.
    El root usa `style={{ height: '100dvh' }}` (resuelve siempre; `calc(100%+…)` NO sirve porque `%` no resuelve contra un `<main>` con `flex-grow` y cae a `auto`). `-m-6` cancela el `p-6` del `<main>`.
    **Lo que realmente evita el desbordamiento NO es el valor del height, sino que TODA la cadena desde el root hasta el área scrolleable lleve `flex-1 min-h-0`** (y `h-full` donde un hijo use `height:100%`). Si un solo wrapper intermedio omite `min-h-0`, su contenido (una lista larga, un panel de detalle) crece, empuja al root y el `<main>` scrollea pasando el sidebar.
    ```tsx
    <div className="-m-6 flex flex-col bg-[var(--c-bg)]" style={{ height: '100dvh' }}>
      <div className="flex-shrink-0 ...">Header</div>
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto ...">Left / main content</div>
        {/* panel/columna: cada nivel hasta el scroll lleva min-h-0 (y h-full si el hijo usa h-full) */}
        <aside className="hidden md:flex flex-1 min-w-0 min-h-0 ...">
          <div className="flex-1 min-w-0 min-h-0 h-full">{/* Detalle con su propio flex-1 min-h-0 overflow-y-auto */}</div>
        </aside>
      </div>
    </div>
    ```
    En mobile añadir `pb-[calc(var(--nav-h)+2rem)]` a la columna scrollable para no quedar tapado por el nav.
