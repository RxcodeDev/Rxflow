# Rxflow Backend — Copilot Instructions

NestJS 11 · TypeScript · PostgreSQL (raw `pg`) · JWT Auth · Port **3000**

> **⚠ Regla:** Al completar cualquier cambio, actualizar este archivo y `CONTEXT.md` si se agregó un módulo, endpoint, entidad o config.

---

## Architecture Overview

```
src/
  main.ts                    ← Bootstrap: CORS, global pipe/filter/interceptor
  app.module.ts              ← Root module — imports all feature modules
  app.controller.ts          ← Health check / root
  app.service.ts             ← App-level service

  common/
    decorators/
      current-user.decorator.ts  ← @CurrentUser() — extracts req.user
      roles.decorator.ts         ← @Roles('admin','member') — SetMetadata
    filters/
      http-exception.filter.ts   ← Global: { ok:false, statusCode, message, path, timestamp }
    guards/
      jwt-auth.guard.ts          ← extends AuthGuard('jwt') — use on every protected route
      roles.guard.ts             ← CanActivate — reads @Roles() metadata
    interceptors/
      transform.interceptor.ts   ← Global: wraps all responses as { ok:true, data }
    pipes/
      validation.pipe.ts         ← Global: ValidationPipe(whitelist, transform)

  config/
    app.config.ts              ← { port, frontendUrl }
    database.config.ts         ← getPool() singleton (pg.Pool, max:20 connections)
    jwt.config.ts              ← { secret, expiresIn: '7d' }

  database/
    migrations/                ← Flyway: V001__initial_schema.sql, V002__, V003__
    seeds/                     ← SQL seed scripts

  modules/
    auth/                      ← register, login, /me
    users/                     ← GET /users
    projects/                  ← GET /projects, GET /projects/:code
    tasks/                     ← GET/POST/PATCH /tasks, /tasks/mine, /tasks/:id
    cycles/                    ← GET /cycles, GET /cycles/:id
    notifications/             ← GET /notifications, PATCH mark-read
    seed/                      ← POST /seed, GET /seed/status
    workspaces/                ← Workspaces CRUD

  shared/
    constants/                 ← roles.constant.ts, messages.constant.ts
    interfaces/                ← Shared type definitions
    mail/                      ← Email service
    utils/                     ← Utility functions
```

---

## Response Envelope (EVERY endpoint)

The `TransformInterceptor` wraps all successful responses globally:
```ts
// Success
{ ok: true, data: T }

// Error (HttpExceptionFilter)
{ ok: false, statusCode: number, message: string, path: string, timestamp: string }
```

**Never return raw data** — let the interceptor handle wrapping.

---

## Database Layer

**No ORM** (no TypeORM, no Prisma). Raw SQL via `pg` library.

```ts
// Pattern in every repository
import { getPool } from '@/config/database.config';

@Injectable()
export class FooRepository {
  private get pool() { return getPool(); }  // singleton getter

  async findById(id: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM foo WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }
}
```

**Rules:**
- Always use parameterized queries (`$1, $2, ...`) — never string interpolation
- `getPool()` returns the shared singleton pool (max 20 connections)
- Complex aggregations use `LEFT JOIN LATERAL` and JSON aggregation
- All INSERT/UPDATE operations use `ON CONFLICT` for upsert safety

---

## Module Structure (one per feature)

Each module follows the same 4-file pattern:

```
modules/foo/
  foo.module.ts       ← @Module({ controllers, providers, imports, exports })
  foo.controller.ts   ← @Controller('/foo') + @UseGuards(JwtAuthGuard)
  foo.service.ts      ← @Injectable() thin wrapper, delegates to repository
  foo.repository.ts   ← @Injectable() raw SQL queries
  entities/
    foo.entity.ts     ← TypeScript interfaces (not ORM entities)
  dto/                ← class-validator DTOs (optional)
```

**Service is a thin wrapper** — business logic lives in the repository.

---

## Authentication & Guards

```ts
// Protect any endpoint
@UseGuards(JwtAuthGuard)

// Protect whole controller
@Controller('/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController { ... }

// Get the logged-in user
@Get('/mine')
findMine(@CurrentUser() user: SafeUser) { ... }

// Role-based access
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
remove() { ... }
```

JWT token extracted from `Authorization: Bearer <token>` header.  
Token payload: `{ sub: userId, email, name, role }`

---

## Auth Endpoints

```
POST /auth/register   { name, email, password }  → { token: string, user: SafeUser }
POST /auth/login      { email, email, password } → { token: string, user: SafeUser }
GET  /auth/me         [requires JwtAuthGuard]    → SafeUser
```

Password hashing: `bcrypt` with salt rounds.  
JWT TTL: `7d` (from `jwtConfig.expiresIn`).

---

## Available Endpoints (all require JWT except auth)

```
POST /auth/register
POST /auth/login
GET  /auth/me

GET  /projects
GET  /projects/:code
GET  /projects/:code/tasks

GET  /tasks/mine             ← uses @CurrentUser()
GET  /tasks?projectCode=&status=&cycleId=
GET  /tasks/:id
POST /tasks                  { projectCode, title, priority, status, assigneeId?,
                               epicId?, cycleId?, parentTaskId?, dueDate? }
PATCH /tasks/:id             { any task fields }
POST /tasks/:id/comments     { content }
POST /tasks/:id/activity     { action, detail }

GET  /cycles
GET  /cycles/:id

GET  /notifications
GET  /notifications/unread-count
PATCH /notifications/:id/read
PATCH /notifications/read-all

GET  /users

POST /seed                   ← dev only (throws ForbiddenException in production)
GET  /seed/status            → { users, projects, tasks, cycles }
```

---

## Entities (TypeScript interfaces, NOT ORM)

```ts
// User
interface User {
  id: string; name: string; email: string; password_hash: string;
  role: string; initials: string; avatar_url: string | null;
  presence_status: string; last_seen_at: Date | null;
  is_active: boolean; created_at: Date; updated_at: Date;
}
type SafeUser = Omit<User, 'password_hash'>;

// Task (DB row)
interface Task {
  id: string; sequential_id: number; project_id: string; epic_id: string | null;
  cycle_id: string | null; parent_task_id: string | null; assignee_id: string | null;
  title: string; description: string | null; status: string; priority: string;
  position: number; due_date: Date | null; blocked_reason: string | null;
  created_by: string; created_at: Date; updated_at: Date;
}

// TaskItem (API response — denormalized)
interface TaskItem {
  id: string; sequential_id: number; identifier: string;
  project_name: string; project_code: string; title: string;
  priority: string; status: string; epic_name: string | null;
  assignee_initials: string | null; due_date: Date | null;
}
```

---

## Config Objects

```ts
// app.config.ts
export const appConfig = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
};

// jwt.config.ts
export const jwtConfig = {
  secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  expiresIn: '7d',
};

// database.config.ts
export function getPool(): Pool  // returns singleton pg.Pool
```

---

## Environment Variables

```env
PORT=3000
FRONTEND_URL=http://localhost:3001
JWT_SECRET=<secret>
DB_HOST=localhost
DB_PORT=5432
DB_USER=rxflow
DB_PASSWORD=<password>
DB_NAME=rxflow
NODE_ENV=development
```

---

## Validation Pattern (DTOs)

```ts
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class CreateFooDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

Global `ValidationPipe` handles: whitelist (strip unknown), forbidNonWhitelisted, transform (auto-cast).

---

## Seeding (Dev Only)

```bash
POST http://localhost:3000/seed
```

Creates:
- 4 users: `ana@rxflow.io`, `luis@rxflow.io`, `sara@rxflow.io`, `juan@rxflow.io` (password: `password123`)
- 3 projects: ENG (Backend), DES (Frontend), MKT (Marketing)
- Project members with roles
- Epics per project
- Cycles (completed/active/planned)
- Tasks across projects

Seed is **transactional** (`BEGIN … COMMIT`) and uses `ON CONFLICT DO NOTHING` for idempotency.  
Throws `ForbiddenException` in `NODE_ENV=production`.

---

## Database Migrations

Located in `database/migrations/`, Flyway naming convention:
```
V001__initial_schema.sql   ← users, projects, tasks, cycles, notifications
V002__add_extra_views.sql  ← project extra_views column
V003__workspaces.sql       ← workspaces table
```

---

## Adding a New Module — Checklist

1. Create `src/modules/foo/` with: `foo.module.ts`, `foo.controller.ts`, `foo.service.ts`, `foo.repository.ts`, `entities/foo.entity.ts`
2. Add `@UseGuards(JwtAuthGuard)` to controller
3. Register `FooRepository` and `FooService` in `FooModule.providers`
4. Import `FooModule` in `AppModule`
5. Use `getPool()` in repository — parameterized queries only
6. Let `TransformInterceptor` handle wrapping — never `{ ok: true, data }` manually

---

## Commands

```bash
npm run start:dev   # Watch mode — :3000
npm run build       # Production build
npm run test        # Jest unit tests
npm run test:e2e    # E2E tests (test/)
npm run lint        # ESLint
```

---

## Security Rules

- Always `@UseGuards(JwtAuthGuard)` on protected controllers/routes
- Never return `password_hash` in responses — use `SafeUser`
- Parameterized SQL only — no string template queries
- `bcrypt` for all password hashing
- JWT secret from env — never hardcode in source
