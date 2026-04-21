#!/usr/bin/env bash
# ============================================================
#  setup-next.sh
#  Ejecuta desde la raiz del proyecto Next.js (donde esta app/)
#  bash setup-next.sh
# ============================================================

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
head() { echo -e "\n${CYAN}══════════════════════════════════${NC}\n${CYAN}  $1${NC}\n${CYAN}══════════════════════════════════${NC}"; }
t()    { [ -f "$1" ] || touch "$1"; }

head "Next.js — app/"

# App Router
mkdir -p "app/(auth)/login"
mkdir -p "app/(auth)/register"
mkdir -p "app/(dashboard)"
mkdir -p "app/api/auth/[...nextauth]"

# Components
mkdir -p components/ui
mkdir -p components/features/users
mkdir -p components/features/auth
mkdir -p components/layouts

# Lib / Hooks / Store / Types / Utils
mkdir -p lib
mkdir -p hooks
mkdir -p store/slices
mkdir -p types
mkdir -p utils
log "Carpetas creadas"

# App Router
t "app/(auth)/login/page.tsx"
t "app/(auth)/login/loading.tsx"
t "app/(auth)/register/page.tsx"
t "app/(dashboard)/layout.tsx"
t "app/(dashboard)/page.tsx"
t "app/(dashboard)/loading.tsx"
t "app/api/auth/[...nextauth]/route.ts"

# Components
t components/ui/Button.tsx
t components/ui/Input.tsx
t components/ui/Modal.tsx
t components/ui/Card.tsx
t components/ui/Spinner.tsx
t components/features/users/UserTable.tsx
t components/features/users/UserForm.tsx
t components/features/auth/LoginForm.tsx
t components/features/auth/RegisterForm.tsx
t components/layouts/Sidebar.tsx
t components/layouts/Navbar.tsx

# Lib
t lib/api.ts
t lib/auth.ts
t lib/utils.ts
t lib/validations.ts

# Hooks
t hooks/useAuth.ts
t hooks/usePagination.ts
t hooks/useDebounce.ts
t hooks/useLocalStorage.ts

# Store
t store/index.ts
t store/slices/authSlice.ts
t store/slices/uiSlice.ts

# Types
t types/user.types.ts
t types/auth.types.ts
t types/api.types.ts
t types/index.ts

# Utils
t utils/format.ts
t utils/cn.ts

log "Archivos creados"
echo ""
echo "  app/"
echo "  ├── (auth)/login · register"
echo "  ├── (dashboard)/"
echo "  └── api/auth/[...nextauth]"
echo "  components/"
echo "  ├── ui/       (Button · Input · Modal · Card · Spinner)"
echo "  ├── features/ (users · auth)"
echo "  └── layouts/  (Sidebar · Navbar)"
echo "  lib/          (api · auth · utils · validations)"
echo "  hooks/        (useAuth · usePagination · useDebounce)"
echo "  store/        (index · slices)"
echo "  types/"
echo "  utils/"
echo ""
echo -e "${GREEN}¡Listo! → $(pwd)${NC}"
