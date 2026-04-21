#!/usr/bin/env bash
# ============================================================
#  setup-nest.sh
#  Ejecuta desde la raiz del proyecto NestJS (donde esta src/)
#  bash setup-nest.sh
# ============================================================

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
head() { echo -e "\n${CYAN}══════════════════════════════════${NC}\n${CYAN}  $1${NC}\n${CYAN}══════════════════════════════════${NC}"; }
t()    { [ -f "$1" ] || touch "$1"; }

head "NestJS — src/"

mkdir -p src/modules/users/dto
mkdir -p src/modules/users/entities
mkdir -p src/modules/auth/dto
mkdir -p src/modules/auth/entities
mkdir -p src/common/guards
mkdir -p src/common/pipes
mkdir -p src/common/decorators
mkdir -p src/common/filters
mkdir -p src/common/interceptors
mkdir -p src/config
mkdir -p src/database/migrations
mkdir -p src/database/seeds
mkdir -p src/shared/interfaces
mkdir -p src/shared/utils
mkdir -p src/shared/constants
log "Carpetas creadas"

# Users
t src/modules/users/users.module.ts
t src/modules/users/users.controller.ts
t src/modules/users/users.service.ts
t src/modules/users/users.repository.ts
t src/modules/users/dto/create-user.dto.ts
t src/modules/users/dto/update-user.dto.ts
t src/modules/users/entities/user.entity.ts

# Auth
t src/modules/auth/auth.module.ts
t src/modules/auth/auth.controller.ts
t src/modules/auth/auth.service.ts
t src/modules/auth/dto/login.dto.ts
t src/modules/auth/dto/register.dto.ts

# Common
t src/common/guards/jwt-auth.guard.ts
t src/common/guards/roles.guard.ts
t src/common/pipes/validation.pipe.ts
t src/common/decorators/roles.decorator.ts
t src/common/decorators/current-user.decorator.ts
t src/common/filters/http-exception.filter.ts
t src/common/interceptors/transform.interceptor.ts

# Config
t src/config/app.config.ts
t src/config/database.config.ts
t src/config/jwt.config.ts

# Shared
t src/shared/interfaces/pagination.interface.ts
t src/shared/interfaces/api-response.interface.ts
t src/shared/utils/hash.util.ts
t src/shared/utils/date.util.ts
t src/shared/constants/roles.constant.ts
t src/shared/constants/messages.constant.ts

log "Archivos creados"
echo ""
echo "  src/"
echo "  ├── modules/"
echo "  │   ├── users/   (controller · service · repository · dto · entity)"
echo "  │   └── auth/    (controller · service · dto)"
echo "  ├── common/      (guards · pipes · decorators · filters · interceptors)"
echo "  ├── config/      (app · database · jwt)"
echo "  ├── database/    (migrations · seeds)"
echo "  └── shared/      (interfaces · utils · constants)"
echo ""
echo -e "${GREEN}¡Listo! → $(pwd)/src${NC}"
