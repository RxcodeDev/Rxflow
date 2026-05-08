#!/bin/sh
set -e

echo "▶ Waiting for PostgreSQL..."
until pg_isready -h "${DATABASE_HOST:-postgres}" -U "${DATABASE_USER:-postgres}" -q; do
  sleep 1
done
echo "✓ PostgreSQL ready"

# ── Raw SQL migrations tracker ─────────────────────────────────────────────
psql "$DATABASE_URL" -c "
  CREATE TABLE IF NOT EXISTS _raw_migrations (
    filename    VARCHAR(255) PRIMARY KEY,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
" > /dev/null

# ── Apply each V*.sql file if not yet tracked ──────────────────────────────
for file in /app/src/database/migrations/V*.sql; do
  filename=$(basename "$file")
  count=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM _raw_migrations WHERE filename = '$filename';" \
    | tr -d ' \n')

  if [ "$count" = "0" ]; then
    echo "  → Applying $filename ..."
    psql "$DATABASE_URL" -f "$file"
    psql "$DATABASE_URL" -c \
      "INSERT INTO _raw_migrations (filename) VALUES ('$filename');" > /dev/null
    echo "  ✓ $filename applied"
  else
    echo "  · $filename already applied"
  fi
done

# ── Prisma migrations (licenses, etc.) ────────────────────────────────────
echo "▶ Running prisma migrate deploy..."
npx prisma migrate deploy
echo "✓ Prisma migrations done"

# ── Start app ─────────────────────────────────────────────────────────────
echo "▶ Starting NestJS..."
exec node dist/main
