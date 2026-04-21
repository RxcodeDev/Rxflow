# Rxflow — Índice de Contexto

> Pega este archivo completo al inicio de cada conversación con Copilot.

> Si no estan levando el frontend en local levantalo el backend y bd es mediante docker

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

---

## Mapa de archivos clave

### Frontend (`frontend/`)
```
app/(dashboard)/layout.tsx        ← UIProvider + Sidebar + Navbar + modales globales
app/(dashboard)/inicio/page.tsx   ← Dashboard ('use client', datos reales)
app/(dashboard)/mis-tareas/       ← Tareas por status
app/(dashboard)/inbox/            ← Notificaciones
app/(dashboard)/proyectos/        ← Lista + [id]/board (kanban)
app/(dashboard)/cycles/           ← Cycles
app/(dashboard)/miembros/         ← Equipo
app/(dashboard)/preferencias/     ← Server Component, visual only
app/(dashboard)/integraciones/    ← Server Component, visual only

components/layouts/Sidebar.tsx    ← Sidebar desktop ('use client')
components/layouts/Navbar.tsx     ← Bottom nav mobile ('use client')
components/features/tasks/
  CreateTaskModal.tsx             ← Modal global — NO montar en páginas individuales
  TaskDrawer.tsx                  ← Drawer global — NO montar en páginas individuales
components/ui/                    ← Button, Input, Card, Modal, Spinner, ConfirmModal

store/UIContext.tsx                ← UIProvider, useUIState(), useUIDispatch()
store/slices/uiSlice.ts           ← openCreateModal, closeCreateModal, openDrawer, closeDrawer, bumpProjects
lib/api.ts                        ← apiGet, apiPost, apiPatch, apiDelete
types/api.types.ts                ← ApiWrapped<T>, ProjectSummary, TaskItem, CycleSummary, MemberItem, NotificationItem
middleware.ts                     ← Protege rutas, redirige a /login si no hay cookie rxflow_token
```

### Backend (`backend/src/`)
```
main.ts                           ← CORS, ValidationPipe global, HttpExceptionFilter, TransformInterceptor
app.module.ts                     ← Importa todos los módulos
modules/auth/                     ← POST /auth/register, /auth/login, GET /auth/me
modules/users/                    ← GET /users
modules/projects/                 ← GET /projects, /projects/:code, /projects/:code/tasks
modules/tasks/                    ← GET/POST/PATCH /tasks, /tasks/mine, /tasks/:id
modules/cycles/                   ← GET /cycles, /cycles/:id
modules/notifications/            ← GET /notifications, PATCH mark-read
modules/seed/                     ← POST /seed, GET /seed/status
modules/workspaces/               ← Workspaces CRUD
common/guards/jwt-auth.guard.ts   ← JwtAuthGuard — usar en todo controlador protegido
common/decorators/current-user.decorator.ts  ← @CurrentUser()
common/interceptors/transform.interceptor.ts ← Envuelve todo en { ok, data }
config/database.config.ts         ← getPool() singleton (raw pg, sin ORM)
```

---

## Páginas pendientes (no existen aún)

```
frontend/app/(dashboard)/herramientas/documentos/page.tsx
frontend/app/(dashboard)/herramientas/reportes/page.tsx
frontend/app/(dashboard)/herramientas/calendario/page.tsx
frontend/app/(dashboard)/herramientas/wiki/page.tsx
```

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
GET  /projects/:code/tasks → TaskItem[]

GET  /tasks/mine          → TaskItem[]  (usa @CurrentUser)
GET  /tasks?projectCode=&status=&cycleId=  → TaskItem[]
GET  /tasks/:id           → TaskDetail
POST /tasks               { projectCode, title, priority, status, assigneeId?, epicId?, cycleId?, dueDate? }
PATCH /tasks/:id          { ...campos }
POST /tasks/:id/comments  { content }

GET  /cycles              → CycleSummary[]
GET  /cycles/:id          → CycleSummary

GET  /notifications       → NotificationItem[]
GET  /notifications/unread-count → number
PATCH /notifications/:id/read
PATCH /notifications/read-all

GET  /users               → MemberItem[]

POST /seed                (solo dev)
GET  /seed/status         → { users, projects, tasks, cycles }
```

Respuesta siempre: `{ ok: boolean; data: T }`

---

## State UI

```ts
// Leer estado
const { isDrawerOpen, activeTaskId, isCreateModalOpen } = useUIState();

// Disparar acciones
const dispatch = useUIDispatch();
dispatch(openCreateModal('task'));          // 'task' | 'subtask' | 'project' | 'workspace'
dispatch(closeCreateModal());
dispatch(openDrawer({ taskId, projectId }));
dispatch(closeDrawer());
dispatch(bumpProjects());                  // fuerza re-fetch de /projects en Sidebar
```

---

## Credenciales demo

```
ana@rxflow.io  / password123
luis@rxflow.io / password123
sara@rxflow.io / password123
juan@rxflow.io / password123
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
