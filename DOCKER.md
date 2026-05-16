# Rxflow — Comandos Docker

## Modos de uso

| Comando | Modo | Cuándo usarlo |
|---|---|---|
| `docker compose up -d` | **Dev (hot reload)** | Desarrollo diario — sin rebuild, cambios reflejados al instante |
| `npm install` + `docker compose up -d --build` | **Dev + reinstalar deps** | Cuando cambias `package.json` |
| `docker compose -f docker-compose.yml up -d` | **Producción** | Deploy — build completo optimizado |
| `docker compose -f docker-compose.yml up -d --build` | **Producción + rebuild** | Deploy tras cambios de código |

---

## Desarrollo diario (hot reload)

El override se activa automáticamente. NestJS y Next.js recargan solos al guardar archivos.

```bash
# Levantar todo el stack en modo dev
docker compose up -d

# Solo BD + backend (frontend en local)
docker compose up -d postgres backend
cd frontend && npm run dev
```

> El único momento que necesitas `--build` en dev es cuando agregas/quitas dependencias (`package.json`).

---

## Rebuild (solo cuando cambia package.json)

> **Siempre sincroniza el lockfile primero** — `npm ci` dentro de Docker falla si el `package-lock.json` no está actualizado.

```bash
# Solo backend
cd backend && npm install && cd ..
docker compose build backend && docker compose up -d backend

# Solo frontend
cd frontend && npm install && cd ..
docker compose build frontend && docker compose up -d frontend

# Ambos
cd backend && npm install && cd .. && cd frontend && npm install && cd ..
docker compose build backend frontend && docker compose up -d backend frontend
```

---

## Producción

```bash
# Levantar con imágenes ya construidas
docker compose -f docker-compose.yml up -d

# Rebuild completo y levantar
docker compose -f docker-compose.yml up -d --build

# Solo un servicio
docker compose -f docker-compose.yml build backend && docker compose -f docker-compose.yml up -d backend
```

---

## Ver logs en tiempo real

```bash
# Backend
docker compose logs -f backend

# Frontend
docker compose logs -f frontend

# Todos
docker compose logs -f
```

---

## Bajar el stack

```bash
docker compose down
```

> Con `--volumes` también borra la base de datos (¡destructivo!):
> ```bash
> docker compose down --volumes
> ```

---

## Estado de los contenedores

```bash
docker compose ps
```

---

## Acceder al shell de un contenedor

```bash
docker compose exec backend sh
docker compose exec frontend sh
docker compose exec postgres psql -U rxflow -d rxflow
```

---

## Notas importantes

- **En dev, el hot reload está activo** — NestJS con `--watch`, Next.js con HMR. No hace falta rebuild al cambiar código.
- **El backend ejecuta migraciones automáticamente** al arrancar via `entrypoint.sh`:
  1. Corre las migraciones SQL (`V001__…sql`, `V002__…sql`, …)
  2. Corre `prisma migrate deploy` para el schema de Prisma
- **NEXT_PUBLIC_API_URL** se inyecta en build time del frontend, no en runtime. Si cambia la URL de la API hay que hacer rebuild del frontend.
