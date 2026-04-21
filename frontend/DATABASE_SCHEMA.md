# Rxflow — Entidades del dominio (referencia para diseño de BD)

Documento generado a partir del frontend actual. Refleja **todos los campos, tipos y relaciones** que ya se muestran en la UI.

---

## 1. Entidades principales

### `users` — Usuarios / Miembros

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | varchar(100) | |
| `email` | varchar(255) UNIQUE | |
| `password_hash` | varchar | auth |
| `role` | varchar(50) | 'Tech Lead', 'Backend Dev', 'Frontend Dev', 'Full Stack Dev'… |
| `initials` | varchar(4) | calculado o manual, ej. 'AN' |
| `avatar_url` | varchar NULLABLE | |
| `last_seen_at` | timestamptz NULLABLE | para indicador online/away/offline |
| `presence_status` | enum('online','away','offline') | derivable de `last_seen_at` |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz | |

---

### `projects` — Proyectos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `code` | varchar(4) UNIQUE | identificador corto: 'ENG', 'DES', 'MKT' |
| `name` | varchar(100) | |
| `description` | text NULLABLE | |
| `methodology` | enum('scrum','kanban','shape_up') | elegida al crear |
| `status` | enum('activo','pausado','archivado') | |
| `created_by` | uuid FK → users.id | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Campos derivados / calculados** (no almacenar, computar en query):
- `progress_pct` = tareas completadas / total × 100
- `tasks_done` / `tasks_total` = COUNT desde `tasks`
- `active_cycle` = JOIN con `cycles`

---

### `project_members` — Miembros de proyecto _(tabla pivote)_

| Campo | Tipo | Notas |
|---|---|---|
| `project_id` | uuid FK → projects.id | |
| `user_id` | uuid FK → users.id | |
| `role` | varchar(50) NULLABLE | rol dentro del proyecto |
| `joined_at` | timestamptz | |

PK compuesta: (`project_id`, `user_id`)

---

### `epics` — Épicas

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid FK → projects.id | |
| `name` | varchar(100) | 'Auth & Onboarding', 'Design System', 'DevOps'… |
| `description` | text NULLABLE | |
| `status` | enum('activa','completada','archivada') | |
| `hill_position` | float NULLABLE | 0–100, posición en hill chart |
| `created_by` | uuid FK → users.id | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `cycles` — Sprints / Cycles

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid FK → projects.id | |
| `name` | varchar(50) | 'Cycle 4', 'Cycle 5'… |
| `number` | int | número secuencial dentro del proyecto |
| `status` | enum('planificado','activo','completado') | |
| `start_date` | date | |
| `end_date` | date | |
| `scope_pct` | int DEFAULT 100 | % del alcance original no modificado |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Campos derivados:**
- `days_left` = end_date - CURRENT_DATE (cuando status = 'activo')
- `tasks_done` / `tasks_total` = COUNT desde `tasks` WHERE `cycle_id`

---

### `tasks` — Tareas

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `sequential_id` | int | número secuencial por proyecto (ENG-12 = project ENG, seq 12) |
| `project_id` | uuid FK → projects.id | |
| `epic_id` | uuid FK → epics.id NULLABLE | |
| `cycle_id` | uuid FK → cycles.id NULLABLE | |
| `parent_task_id` | uuid FK → tasks.id NULLABLE | para subtareas |
| `title` | varchar(255) | |
| `description` | text NULLABLE | |
| `status` | enum('backlog','en_progreso','en_revision','bloqueado','completada') | |
| `priority` | enum('urgente','alta','media','baja') | |
| `assignee_id` | uuid FK → users.id NULLABLE | |
| `created_by` | uuid FK → users.id | |
| `due_date` | date NULLABLE | |
| `completed_at` | timestamptz NULLABLE | |
| `blocked_reason` | text NULLABLE | solo si status = 'bloqueado' |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Índices importantes:**
- `(project_id, sequential_id)` UNIQUE
- `(assignee_id)` para "Mis tareas"
- `(cycle_id)` para board de cycle
- `(epic_id)` para agrupación por épica
- `(parent_task_id)` para subtareas

**Campos derivados:**
- `identifier` = project.code + '-' + sequential_id → ej. 'ENG-12'

---

### `columns` — Columnas del kanban _(opcional si quieren columnas custom)_

Si las columnas son fijas (Backlog / En progreso / En revisión / Bloqueado / Completado), no hace falta tabla. Si el usuario puede crear columnas custom:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid FK → projects.id | |
| `name` | varchar(100) | |
| `position` | int | orden |
| `wip_limit` | int NULLABLE | límite WIP (ej. 3) |

---

### `comments` — Comentarios en tareas

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid FK → tasks.id | |
| `author_id` | uuid FK → users.id | |
| `body` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `activity_log` — Log de actividad

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid FK → tasks.id NULLABLE | |
| `project_id` | uuid FK → projects.id NULLABLE | |
| `user_id` | uuid FK → users.id | quien realizó la acción |
| `action` | varchar(100) | 'cambió estado', 'asignó a', 'creó tarea', 'comentó'… |
| `payload` | jsonb NULLABLE | datos extra: { from, to }, { assignee }… |
| `created_at` | timestamptz | |

---

### `notifications` — Bandeja de entrada

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `recipient_id` | uuid FK → users.id | |
| `sender_id` | uuid FK → users.id | |
| `type` | enum('mention','asignado','comentario','completado','bloqueado') | |
| `task_id` | uuid FK → tasks.id NULLABLE | |
| `project_id` | uuid FK → projects.id NULLABLE | |
| `message` | varchar(255) | texto descriptivo |
| `read` | boolean DEFAULT false | |
| `created_at` | timestamptz | |

---

### `integrations` — Integraciones de workspace

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `provider` | varchar(50) | 'github', 'slack', 'figma' |
| `connected_as` | varchar(255) NULLABLE | nombre de cuenta/org conectada |
| `access_token_enc` | text NULLABLE | token cifrado |
| `status` | enum('conectado','desconectado') | |
| `connected_by` | uuid FK → users.id | |
| `connected_at` | timestamptz | |

---

## 2. Relaciones clave

```
users ──< project_members >── projects
projects ──< epics
projects ──< cycles
projects ──< tasks
epics ──< tasks
cycles ──< tasks
tasks ──< tasks          (parent_task_id → subtareas)
tasks ──< comments
tasks ──< activity_log
tasks ──< notifications
users ──< notifications  (recipient + sender)
users ──< comments       (author)
users ──< activity_log   (actor)
```

---

## 3. Enumeraciones a definir en BD

```sql
-- Priority
CREATE TYPE priority_enum AS ENUM ('urgente', 'alta', 'media', 'baja');

-- Task status
CREATE TYPE task_status_enum AS ENUM ('backlog', 'en_progreso', 'en_revision', 'bloqueado', 'completada');

-- Project status
CREATE TYPE project_status_enum AS ENUM ('activo', 'pausado', 'archivado');

-- Cycle status
CREATE TYPE cycle_status_enum AS ENUM ('planificado', 'activo', 'completado');

-- Epic status
CREATE TYPE epic_status_enum AS ENUM ('activa', 'completada', 'archivada');

-- Methodology
CREATE TYPE methodology_enum AS ENUM ('scrum', 'kanban', 'shape_up');

-- Notification type
CREATE TYPE notification_type_enum AS ENUM ('mention', 'asignado', 'comentario', 'completado', 'bloqueado');

-- Presence
CREATE TYPE presence_enum AS ENUM ('online', 'away', 'offline');
```

---

## 4. Campos que actualmente son hardcodeados en el frontend

Estos valores están quemados y necesitan venir de la BD:

| Dónde | Qué | Valor actual |
|---|---|---|
| Sidebar | Lista de proyectos | ENG, DES |
| CreateTaskModal | PROJECTS | ENG, DES, MKT |
| CreateTaskModal | EPICS por proyecto | Auth & Onboarding, Core, DevOps, Design System, Campaña Q2 |
| CreateTaskModal | ASSIGNEES | AN, LM, SC, JR |
| Board page | COLUMNS + tasks | datos demo de ENG |
| Proyectos page | PROJECTS array | 5 proyectos |
| Cycles page | CYCLES array | 6 cycles |
| Miembros page | MEMBERS array | 4 miembros |
| Inbox page | NOTIFICATIONS array | 8 notificaciones |
| TaskDrawer | DEMO_TASK, DEMO_SUBTASKS, DEMO_COMMENTS, DEMO_ACTIVITY | todo demo |

---

## 5. Herramientas internas (páginas pendientes)

Estas entidades son necesarias cuando se implementen:

- **Documentos** → tabla `documents` (id, project_id, title, body: text/mdx, author_id, created_at)
- **Reportes** → tabla `reports` o vistas agregadas sobre tasks + cycles
- **Calendario** → tabla `events` o join de due_date + cycle start/end
- **Wiki** → tabla `wiki_pages` (id, project_id, slug, title, content, author_id)
