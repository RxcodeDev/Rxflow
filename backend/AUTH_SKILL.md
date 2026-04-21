# AUTH — Skill de referencia

Documento de arquitectura, endpoints y patrones para el módulo de autenticación de Rxflow.

---

## 1. Arquitectura

```
Frontend (Next.js)          Backend (NestJS)           PostgreSQL
─────────────────           ─────────────────           ──────────
LoginPage                   POST /auth/login
  └─ useAuth.login()   →    AuthController
       └─ apiPost()          └─ AuthService
                                  ├─ bcrypt.compare()
                                  └─ JwtService.sign()   → users table
                             ← { ok, data: { user, access_token } }
  └─ setToken()        — localStorage + cookie
  └─ dispatch auth/login
  └─ router.push('/inicio')
```

---

## 2. Endpoints del API

| Método | Ruta | Auth | Body | Respuesta |
|---|---|---|---|---|
| `POST` | `/auth/register` | ❌ | `{ name, email, password }` | `{ ok, data: { user, access_token } }` |
| `POST` | `/auth/login` | ❌ | `{ email, password }` | `{ ok, data: { user, access_token } }` |
| `GET`  | `/auth/me` | ✅ Bearer | — | `{ ok, data: SafeUser }` |
| `GET`  | `/users/me` | ✅ Bearer | — | `{ ok, data: SafeUser }` |

**Formato de error:**
```json
{
  "ok": false,
  "statusCode": 401,
  "message": "Credenciales inválidas",
  "path": "/auth/login",
  "timestamp": "2026-04-20T00:00:00.000Z"
}
```

**SafeUser** (sin `password_hash`):
```typescript
{
  id: string;           // uuid
  name: string;
  email: string;
  role: string;         // 'member' | 'admin' | 'owner' | 'viewer'
  initials: string;     // 'AN', 'LM', ...
  avatar_url: null | string;
  presence_status: 'online' | 'away' | 'offline';
  last_seen_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## 3. Archivos del Backend

```
backend/src/
├── config/
│   ├── database.config.ts      ← Singleton pg.Pool
│   └── jwt.config.ts           ← secret + expiresIn
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   │   ├── login.dto.ts    ← email + password (class-validator)
│   │   │   └── register.dto.ts ← name + email + password
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts ← PassportStrategy(Strategy)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   └── users/
│       ├── entities/
│       │   └── user.entity.ts  ← User + SafeUser interfaces
│       ├── users.repository.ts ← Raw pg queries
│       ├── users.service.ts
│       ├── users.module.ts
│       └── users.controller.ts
└── common/
    ├── guards/
    │   ├── jwt-auth.guard.ts   ← extends AuthGuard('jwt')
    │   └── roles.guard.ts      ← lee @Roles() del reflector
    ├── decorators/
    │   ├── current-user.decorator.ts ← @CurrentUser()
    │   └── roles.decorator.ts        ← @Roles('admin')
    ├── filters/
    │   └── http-exception.filter.ts
    ├── interceptors/
    │   └── transform.interceptor.ts  ← wraps data en { ok, data }
    └── pipes/
        └── validation.pipe.ts        ← whitelist + transform
```

---

## 4. Archivos del Frontend

```
frontend/
├── store/
│   ├── AuthContext.tsx          ← AuthProvider, useAuthState, useAuthDispatch
│   └── slices/authSlice.ts     ← reducer: auth/login, auth/logout, auth/init
├── hooks/
│   └── useAuth.ts              ← login(), register(), logout()
├── lib/
│   ├── auth.ts                 ← getToken/setToken/clearAuth + cookie
│   └── api.ts                  ← apiGet/apiPost/apiPatch/apiDelete + auth header
├── types/
│   └── auth.types.ts           ← AuthUser, AuthApiResponse, ...
├── middleware.ts               ← protege rutas (lee cookie rxflow_token)
└── app/
    ├── layout.tsx              ← <AuthProvider> en el root
    └── (auth)/
        ├── login/page.tsx      ← 'use client', usa useAuth().login()
        └── register/page.tsx   ← 'use client', usa useAuth().register()
```

---

## 5. Flujo de tokens

1. **Login exitoso** → API devuelve `access_token` (JWT, 7 días)
2. Frontend guarda en `localStorage` bajo `rxflow_token`
3. Frontend guarda cookie JS `rxflow_token` (SameSite=Strict, 7 días)
4. Todas las llamadas API incluyen `Authorization: Bearer <token>`
5. **Middleware Next.js** lee la cookie para proteger rutas SSR
6. **Expiración o 401** → `clearAuth()` → redirect a `/login`

---

## 6. Protección de rutas

### Backend
```typescript
@UseGuards(JwtAuthGuard)  // protege endpoint individual
@UseGuards(JwtAuthGuard, RolesGuard)  // + control de roles
@Roles('admin')           // requiere rol específico
```

### Frontend (middleware.ts)
- Rutas públicas: `/login`, `/register`
- Todo lo demás requiere cookie `rxflow_token`

### Frontend (client-side)
- `useAuth().isAuthenticated` para condicionales en UI
- `useAuth().logout()` para cerrar sesión (limpia localStorage + cookie)

---

## 7. Seguridad

- Contraseñas hasheadas con **bcrypt** (10 rounds)
- JWT firmado con `JWT_SECRET` de env (nunca en código)
- `password_hash` nunca sale de la BD (SELECT excluye columna)
- CORS restringido a `FRONTEND_URL` (env var)
- class-validator con `whitelist: true` previene campos extra
- SQL parametrizado (sin concatenación → previene inyección)
- Errores de auth devuelven mensaje genérico ("Credenciales inválidas")

---

## 8. Variables de entorno requeridas

**Backend:**
```env
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=rxcode_dba
DATABASE_PASSWORD=...
DATABASE_NAME=rxflow
JWT_SECRET=...
PORT=3000
FRONTEND_URL=http://localhost:3001
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```
