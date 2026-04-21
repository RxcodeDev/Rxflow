# Rxflow — Copilot Instructions (Root)

## Regla de mantenimiento de contexto

Cada vez que se haga un cambio en el proyecto, **actualizar los archivos de contexto afectados antes de terminar**:

| Si cambias... | Actualiza... |
|---------------|--------------|
| Nueva página o ruta frontend | `frontend/.github/copilot-instructions.md` + `CONTEXT.md` |
| Nuevo endpoint o módulo backend | `backend/.github/copilot-instructions.md` + `CONTEXT.md` |
| Nuevo componente UI global | `frontend/.github/copilot-instructions.md` |
| Nuevo tipo en `api.types.ts` | `frontend/.github/copilot-instructions.md` + `CONTEXT.md` |
| Nueva variable CSS / token | `frontend/.github/copilot-instructions.md` + `CONTEXT.md` |
| Nueva dependencia npm | El `.github/copilot-instructions.md` del paquete correspondiente |
| Página pendiente completada | Mover de "Pendientes" a "Con datos reales" en `CONTEXT.md` |

---

## Project Overview

Full-stack project management app.
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 → port **3001**
- **Backend:** NestJS 11 + PostgreSQL (Docker) → port **3000**
- **Monorepo:** `frontend/` and `backend/` are sibling folders

## Folder Map

```
rxflow/
├── frontend/          ← Next.js app (see frontend/.github/copilot-instructions.md)
├── backend/           ← NestJS API  (see backend/.github/copilot-instructions.md)
├── docker-compose.yml ← PostgreSQL + backend services
└── .github/
    └── copilot-instructions.md  ← you are here
```

## Commands

```bash
# Frontend (inside frontend/)
npm run dev      # :3001
npm run build
npm run lint

# Backend (inside backend/)
npm run start:dev
npm run build
npm run test

# Infrastructure
docker-compose up -d     # Start PostgreSQL + backend
docker-compose down
```

## API Contract

All backend endpoints require `Authorization: Bearer <jwt>` (except auth routes).

Response envelope — every endpoint returns:
```ts
{ ok: boolean; data: T }
```

Backend base URL: `http://localhost:3000`

## Auth Flow

1. `POST /auth/login` → returns JWT token
2. Frontend stores token in `localStorage` key `rxflow_token` AND as cookie `rxflow_token`
3. `middleware.ts` checks the cookie on every request — redirects to `/login` if missing
4. `lib/api.ts` reads token from localStorage for `Authorization` header injection

## Demo Credentials (seed)

```
ana@rxflow.io  / password123
luis@rxflow.io / password123
sara@rxflow.io / password123
juan@rxflow.io / password123
```

Seed endpoint: `POST /seed` — populates demo data (dev only).

## Global Rules (apply everywhere)

- **No hardcoded colors** — always CSS variables (`var(--c-*)`)
- **TypeScript strict** — no `any`, no `@ts-ignore` without comment
- **Feather icon set** — inline SVG, `viewBox="0 0 24 24"`, stroke-based, `aria-hidden="true"`
- **Mobile-first** — all layouts work at ≥320px, desktop enhancements at `md:` (768px)
- **Single export default per page** — duplicate named functions break the build

## Regla crítica: reescritura total de archivos

Cuando se reemplaza el contenido completo de un archivo existente con `replace_string_in_file`:

1. El `oldString` **DEBE incluir el contenido COMPLETO del archivo** — desde la primera línea hasta la última. Nunca reemplazar solo el inicio o solo una sección si la intención es reescribir todo el archivo.
2. Si el archivo es demasiado largo para incluirlo completo en `oldString`, usar múltiples reemplazos parciales que cubran todo el contenido de forma contigua (sin dejar fragmentos huérfanos).
3. Después de cualquier edición de "reescritura total", **verificar con `get_errors`** que no queden restos del contenido anterior causando errores de parseo.

> **Motivo:** `replace_string_in_file` reemplaza solo la primera ocurrencia del `oldString`. Si se usa un `oldString` parcial (p.ej. solo las primeras líneas del archivo), el resto del contenido original queda intacto y acumulado al final, causando errores de compilación como "Expression expected".
