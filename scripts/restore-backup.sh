#!/bin/bash
# =============================================================================
# restore-backup.sh — Descarga el backup más reciente de prod y lo restaura
#                     en el contenedor Docker local.
#
# Uso:
#   bash scripts/restore-backup.sh
#          → usa backups@rxcode.com.mx por defecto
#
#   bash scripts/restore-backup.sh otro@host
#          → override manual
#
# Requiere: ssh, scp, docker, psql (local o dentro del contenedor)
# =============================================================================
set -e

SSH_HOST="${1:-backups@rxcode.com.mx}"
REMOTE_DIR="/opt/rxcloud/backups/rxflow"
LOCAL_DIR="$(dirname "$0")/../.backups"
DB_CONTAINER="rxflow_db"
DB_NAME="rxflow"
DB_USER="rxcode_dba"

mkdir -p "$LOCAL_DIR"

echo "▶ Buscando backup más reciente en $SSH_HOST:$REMOTE_DIR ..."
LATEST=$(ssh "$SSH_HOST" "ls -1 $REMOTE_DIR/rxflow_*.sql | sort | tail -1")
echo "  Archivo: $LATEST"

FILENAME=$(basename "$LATEST")
LOCAL_FILE="$LOCAL_DIR/$FILENAME"

if [ -f "$LOCAL_FILE" ]; then
  echo "  ✓ Ya existe localmente: $LOCAL_FILE"
else
  echo "▶ Descargando $FILENAME ..."
  scp "$SSH_HOST:$LATEST" "$LOCAL_FILE"
  echo "  ✓ Descargado en $LOCAL_FILE"
fi

echo "▶ Restaurando en el contenedor Docker '$DB_CONTAINER' ..."

# Elimina todas las conexiones activas y recrea la DB
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  > /dev/null 2>&1 || true

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
  "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
  "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null

echo "  Cargando SQL (puede tardar unos segundos)..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$LOCAL_FILE"

echo ""
echo "✓ Backup restaurado: $FILENAME"

echo "▶ Reconstruyendo e iniciando backend..."
docker compose up -d --build backend
echo "✓ Backend listo."
