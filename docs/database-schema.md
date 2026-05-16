# Rxflow — Esquema de Base de Datos

> Estado actual: 2026-05-15  
> Motor: PostgreSQL 16  
> Tablas de dominio: 18 (excluye `_prisma_migrations`, `_raw_migrations`)

---

## Índice de tablas

| Tabla | Descripción |
|---|---|
| [users](#users) | Usuarios del sistema |
| [licenses](#licenses) | Cuentas / tenants |
| [license_members](#license_members) | Pivot usuarios ↔ licencias |
| [workspaces](#workspaces) | Espacios de trabajo |
| [workspace_members](#workspace_members) | Pivot usuarios ↔ workspaces |
| [workspace_projects](#workspace_projects) | Pivot workspaces ↔ proyectos |
| [projects](#projects) | Proyectos |
| [project_members](#project_members) | Pivot usuarios ↔ proyectos |
| [project_task_sequences](#project_task_sequences) | Contador de sequential_id por proyecto |
| [epics](#epics) | Épicas (jerarquía árbol) |
| [cycles](#cycles) | Sprints / iteraciones |
| [tasks](#tasks) | Tareas (items de trabajo hoja) |
| [task_assignees](#task_assignees) | Pivot tareas ↔ asignados (múltiples) |
| [comments](#comments) | Comentarios de tareas |
| [activity_log](#activity_log) | Registro de actividad por tarea |
| [notifications](#notifications) | Notificaciones por usuario |
| [user_notification_prefs](#user_notification_prefs) | Preferencias de notificación |
| [wiki_pages](#wiki_pages) | Páginas de wiki (jerarquía árbol) |
| [license_invites](#license_invites) | Invitaciones de licencia |
| [positions](#positions) | Catálogo de puestos |
### license_invites

Invitaciones para sumar usuarios a una licencia (tenant). Permite gestión de onboarding y control de acceso por invitación.

| Columna      | Tipo         | Nullable | Default                | Descripción                                  |
|--------------|--------------|----------|------------------------|----------------------------------------------|
| `id`         | uuid         | NO       | gen_random_uuid()      | PK                                           |
| `license_id` | uuid         | NO       |                        | FK → licenses.id (CASCADE)                   |
| `email`      | varchar(255) | NO       |                        | Email invitado                               |
| `invited_by` | uuid         | NO       |                        | FK → users.id (SET NULL)                     |
| `status`     | varchar(20)  | NO       | 'pending'              | Estado de la invitación                      |
| `created_at` | timestamptz  | NO       | now()                  | Fecha de creación                            |
| `accepted_at`| timestamptz  | SÍ       |                        | Fecha de aceptación                          |

**FKs:** `license_id` → licenses, `invited_by` → users

---

### positions

Catálogo de puestos/roles funcionales para usuarios, proyectos u organización.

| Columna      | Tipo         | Nullable | Default                | Descripción                                  |
|--------------|--------------|----------|------------------------|----------------------------------------------|
| `id`         | uuid         | NO       | gen_random_uuid()      | PK                                           |
| `name`       | varchar(100) | NO       |                        | Nombre del puesto                            |
| `description`| text         | SÍ       |                        | Descripción opcional                         |
| `created_at` | timestamptz  | NO       | now()                  | Fecha de creación                            |

---

---

## Tablas de dominio

### users

Usuarios del sistema. Soporta presencia, avatares base64 y roles normalizados.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | varchar(100) | NO | | Nombre completo |
| `email` | varchar(255) | NO | | Email único |
| `password_hash` | varchar(255) | NO | | Hash bcrypt |
| `role` | varchar(50) | NO | `'member'` | Rol legacy (compatibilidad) |
| `user_type` | varchar(20) | NO | `'member'` | `member` \| `owner` \| `admin` |
| `role_type` | varchar(100) | YES | | `Tech Lead` \| `Backend Dev` \| `Frontend Dev` \| `Full Stack Dev` \| `Designer` \| `Product Manager` |
| `initials` | varchar(4) | NO | | Iniciales (ej. `AN`) |
| `avatar_url` | text | YES | | URL o data URL base64 |
| `avatar_color` | varchar(20) | YES | | Color hex del avatar generado |
| `presence_status` | text | NO | `'offline'` | `online` \| `away` \| `offline` |
| `last_seen_at` | timestamptz | YES | | Última vez visto |
| `is_active` | boolean | NO | `true` | Soft-delete |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Índices:** `email` (unique), `is_active`  
**Trigger:** `trg_users_updated_at`

---

### licenses

Cuenta / tenant raíz del sistema multi-tenant. Cada workspace y wiki page pertenece a una licencia.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | varchar(200) | NO | | Nombre de la cuenta |
| `owner_id` | uuid | NO | | FK → users.id (RESTRICT delete) |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | |

---

### license_members

Pivot usuarios ↔ licencias. Un usuario puede pertenecer a múltiples licencias con diferentes roles.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `license_id` | uuid | NO | | FK → licenses.id (CASCADE) |
| `user_id` | uuid | NO | | FK → users.id (CASCADE) |
| `role` | varchar(20) | NO | `'member'` | `owner` \| `admin` \| `member` |
| `joined_at` | timestamptz | NO | now() | |

**PK:** `(license_id, user_id)`

---

### workspaces

Espacios de trabajo que agrupan proyectos. Pertenecen a una licencia.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `license_id` | uuid | YES | | FK → licenses.id (CASCADE) |
| `name` | text | NO | | Nombre del workspace |
| `description` | text | YES | | |
| `color` | text | NO | `'#6366f1'` | Color hex identificador |
| `icon` | text | NO | `'layers'` | Nombre de ícono Feather |
| `created_by` | uuid | YES | | FK → users.id (SET NULL) |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Trigger:** `trg_workspaces_updated_at`

---

### workspace_members

Pivot usuarios ↔ workspaces.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `workspace_id` | uuid | NO | | FK → workspaces.id (CASCADE) |
| `user_id` | uuid | NO | | FK → users.id (CASCADE) |
| `added_at` | timestamptz | NO | now() | |

**PK:** `(workspace_id, user_id)`

---

### workspace_projects

Pivot workspaces ↔ proyectos. Un proyecto puede estar en múltiples workspaces.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `workspace_id` | uuid | NO | | FK → workspaces.id (CASCADE) |
| `project_id` | uuid | NO | | FK → projects.id (CASCADE) |
| `added_at` | timestamptz | NO | now() | |

**PK:** `(workspace_id, project_id)`

---

### projects

Proyectos. Identificados por un código corto único (ej. `ENG`, `DES`).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `code` | varchar(4) | NO | | Código único (ej. `ENG`) — unique |
| `name` | varchar(100) | NO | | |
| `description` | text | YES | | |
| `methodology` | text | NO | `'kanban'` | `kanban` \| `scrum` \| `shape_up` |
| `status` | text | NO | `'activo'` | `activo` \| `pausado` \| `archivado` |
| `extra_views` | jsonb | NO | `[]` | Array de slugs de vistas adicionales habilitadas |
| `created_by` | uuid | YES | | FK → users.id |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Índices:** `code` (unique), `status`, `created_by`  
**Trigger:** `trg_projects_updated_at`

---

### project_members

Pivot usuarios ↔ proyectos con rol dentro del proyecto.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `project_id` | uuid | NO | | FK → projects.id (CASCADE) |
| `user_id` | uuid | NO | | FK → users.id (CASCADE) |
| `role` | varchar(50) | NO | `'member'` | `owner` \| `admin` \| `member` \| `viewer` |

**PK:** `(project_id, user_id)`  
**Índices:** `user_id`

---

### project_task_sequences

Contador de `sequential_id` por proyecto. Usado por el trigger `trg_tasks_sequential_id` para generar identificadores tipo `ENG-12`.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `project_id` | uuid | NO | | PK + FK → projects.id (CASCADE) |
| `last_seq` | integer | NO | `0` | Último sequential_id asignado |

---

### epics

Épicas de proyecto. Soportan jerarquía árbol vía `parent_epic_id`. Las tareas se asocian a épicas vía `tasks.epic_id`.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `project_id` | uuid | NO | | FK → projects.id (CASCADE) |
| `name` | varchar(100) | NO | | |
| `description` | text | YES | | |
| `status` | epic_status_enum | NO | `'activa'` | `activa` \| `completada` \| `archivada` |
| `parent_epic_id` | uuid | YES | | FK → epics.id (SET NULL) — auto-referencia para jerarquía |
| `created_by` | uuid | NO | | FK → users.id |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Índices:** `project_id`, `status`, `parent_epic_id`  
**Trigger:** `trg_epics_updated_at`  
**Nota:** La API valida que no se generen ciclos en la jerarquía antes de guardar.

---

### cycles

Sprints / iteraciones de un proyecto.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `project_id` | uuid | NO | | FK → projects.id (CASCADE) |
| `name` | varchar(50) | NO | | |
| `number` | integer | NO | | Número de ciclo dentro del proyecto |
| `status` | cycle_status_enum | NO | `'planificado'` | `planificado` \| `activo` \| `completado` |
| `start_date` | date | NO | | |
| `end_date` | date | NO | | Debe ser > start_date |
| `scope_pct` | integer | NO | `100` | 0–100 |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Unique:** `(project_id, number)`  
**Índices:** `project_id`, `status`  
**Trigger:** `trg_cycles_updated_at`

---

### tasks

Items de trabajo hoja. Se asocian a un proyecto, opcionalmente a una épica y a un ciclo.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `sequential_id` | integer | NO | trigger | Número secuencial dentro del proyecto (ej. `12` en `ENG-12`) |
| `project_id` | uuid | NO | | FK → projects.id (CASCADE) |
| `epic_id` | uuid | YES | | FK → epics.id (SET NULL) |
| `cycle_id` | uuid | YES | | FK → cycles.id (SET NULL) |
| `title` | varchar(255) | NO | | |
| `description` | text | YES | | |
| `status` | text | NO | `'backlog'` | `backlog` \| `en_progreso` \| `en_revision` \| `bloqueado` \| `completada` |
| `priority` | text | NO | `'media'` | `baja` \| `media` \| `alta` \| `urgente` |
| `assignee_id` | uuid | YES | | FK → users.id (SET NULL) — asignado primario (denormalizado desde task_assignees) |
| `blocked_reason` | text | YES | | Motivo de bloqueo, relevante cuando `status = 'bloqueado'` |
| `position` | integer | NO | `0` | Orden dentro de columna kanban |
| `due_date` | date | YES | | |
| `created_by` | uuid | NO | | FK → users.id |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Unique:** `(project_id, sequential_id)`  
**Índices:** `project_id`, `epic_id`, `cycle_id`, `assignee_id`, `status`, `due_date` (parcial)  
**Triggers:** `trg_tasks_updated_at`, `trg_tasks_sequential_id` (asigna sequential_id automáticamente)  
**Nota:** Los asignados reales se almacenan en `task_assignees`. `assignee_id` es el asignado primario denormalizado para performance.

---

### task_assignees

Pivot tareas ↔ usuarios. Soporta múltiples asignados por tarea.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `task_id` | uuid | NO | | FK → tasks.id (CASCADE) |
| `user_id` | uuid | NO | | FK → users.id (CASCADE) |
| `assigned_at` | timestamptz | NO | now() | |

**PK:** `(task_id, user_id)`  
**Índices:** `task_id`, `user_id`

---

### comments

Comentarios de tareas. Soportan menciones (@nombre) con generación automática de notificaciones.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `task_id` | uuid | NO | | FK → tasks.id (CASCADE) |
| `author_id` | uuid | NO | | FK → users.id |
| `body` | text | NO | | Contenido del comentario |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Índices:** `task_id`, `author_id`  
**Trigger:** `trg_comments_updated_at`

---

### activity_log

Registro histórico de acciones sobre tareas (cambios de estado, asignación, comentarios, etc.).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `task_id` | uuid | YES | | FK → tasks.id (CASCADE) |
| `project_id` | uuid | YES | | FK → projects.id (CASCADE) |
| `user_id` | uuid | NO | | FK → users.id |
| `action` | varchar(100) | NO | | Descripción de la acción (ej. `"cambió el estado a en_progreso"`) |
| `payload` | jsonb | YES | | Datos adicionales opcionales |
| `created_at` | timestamptz | NO | now() | |

**Índices:** `task_id` (parcial), `project_id` (parcial), `user_id`, `created_at DESC`

---

### notifications

Notificaciones push para usuarios. Generadas por menciones, asignaciones y comentarios.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `recipient_id` | uuid | NO | | FK → users.id (CASCADE) |
| `sender_id` | uuid | NO | | FK → users.id |
| `type` | notification_type_enum | NO | | `mention` \| `asignado` \| `comentario` \| `completado` \| `bloqueado` |
| `task_id` | uuid | YES | | FK → tasks.id (CASCADE) |
| `project_id` | uuid | YES | | FK → projects.id (CASCADE) |
| `message` | varchar(255) | NO | | |
| `read` | boolean | NO | `false` | |
| `created_at` | timestamptz | NO | now() | |

**Índices:** `recipient_id`, `recipient_id WHERE read=false` (parcial), `created_at DESC`

---

### user_notification_prefs

Preferencias de notificación por usuario. Si no existe fila, se usan los defaults.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `user_id` | uuid | NO | | PK + FK → users.id (CASCADE) |
| `mentions` | boolean | NO | `true` | |
| `assignments` | boolean | NO | `true` | |
| `comments` | boolean | NO | `false` | |
| `updates` | boolean | NO | `false` | |
| `updated_at` | timestamptz | NO | now() | |

---

### wiki_pages

Páginas de la base de conocimiento interna. Jerarquía árbol vía `parent_page_id`. Contenido en formato Tiptap/ProseMirror JSON.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `license_id` | uuid | YES | | FK → licenses.id (CASCADE) — aislamiento multi-tenant |
| `workspace_id` | uuid | YES | | Workspace al que pertenece (al menos uno requerido en app layer) |
| `title` | varchar(500) | NO | | |
| `slug` | varchar(255) | NO | | URL-friendly, único por `(workspace_id, slug)` |
| `content` | jsonb | NO | `{type:doc,content:[]}` | Documento Tiptap/ProseMirror |
| `icon` | varchar(10) | YES | | Emoji o ícono de la página |
| `project_code` | varchar(4) | YES | | Referencia soft al proyecto |
| `epic_id` | uuid | YES | | Referencia soft a épica |
| `task_id` | uuid | YES | | Referencia soft a tarea |
| `parent_page_id` | uuid | YES | | FK → wiki_pages.id (SET NULL) — jerarquía |
| `is_archived` | boolean | NO | `false` | |
| `created_by` | uuid | NO | | UUID de usuario |
| `updated_by` | uuid | YES | | UUID de usuario |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-update por trigger |

**Unique:** `(workspace_id, slug)`  
**Índices:** `license_id`, `workspace_id`, `project_code`, `epic_id`, `task_id`, `parent_page_id`

---

## Enumeraciones (tipos nativos PostgreSQL)

| Enum | Valores |
|---|---|
| `epic_status_enum` | `activa`, `completada`, `archivada` |
| `cycle_status_enum` | `planificado`, `activo`, `completado` |
| `notification_type_enum` | `mention`, `asignado`, `comentario`, `completado`, `bloqueado` |

> `tasks.status` y `tasks.priority` fueron convertidos a `TEXT` (V008) para compatibilidad con Prisma.  
> `projects.methodology` y `projects.status` también son `TEXT`.

---

## Relaciones — resumen

```
licenses ──< license_members >── users
licenses ──< workspaces
workspaces ──< workspace_members >── users
workspaces ──< workspace_projects >── projects
projects ──< project_members >── users
projects ──< project_task_sequences
projects ──< epics
projects ──< cycles
projects ──< tasks
epics ──< epics (parent_epic_id, auto-ref jerarquía)
epics ──< tasks (epic_id)
cycles ──< tasks (cycle_id)
tasks ──< task_assignees >── users
tasks ──< comments
tasks ──< activity_log
tasks ──< notifications
users ──< notifications (recipient, sender)
users ──1 user_notification_prefs
licenses ──< wiki_pages
wiki_pages ──< wiki_pages (parent_page_id, auto-ref jerarquía)
```

---

## Comportamiento ON DELETE

| Relación | ON DELETE |
|---|---|
| project → tasks | CASCADE |
| project → epics | CASCADE |
| project → cycles | CASCADE |
| epic → tasks (epic_id) | SET NULL |
| cycle → tasks (cycle_id) | SET NULL |
| task → comments | CASCADE |
| task → task_assignees | CASCADE |
| task → activity_log | CASCADE |
| task → notifications | CASCADE |
| user → tasks (assignee_id) | SET NULL |
| user deleted que es owner de license | RESTRICT (no se puede borrar) |
| license → workspaces | CASCADE |
| license → wiki_pages | CASCADE |
| workspace → wiki_pages | (sin FK directa, solo referencia) |
| epic (parent) → child epics | SET NULL |
| wiki_page (parent) → child pages | SET NULL |
