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
    "SELECT COUNT(*) FROM _raw_migrations WHERE filename = '$(echo "$filename" | sed "s/'/''/g")';" \
    | tr -d ' \n')

  if [ "$count" = "0" ]; then
    echo "  → Applying $filename ..."
    # Run migration + mark as applied in a single transaction so partial
    # failures never leave an untracked half-applied migration.
    psql "$DATABASE_URL" <<SQL
BEGIN;
\i $file
INSERT INTO _raw_migrations (filename) VALUES ('$filename');
COMMIT;
SQL
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
