#!/usr/bin/env bash
# Vercel build for the demo link. Migrations and seeds use Neon's direct
# (unpooled) connection; SEED_DEMO=true reloads the demo data on every deploy.
set -euo pipefail
DIRECT_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
npx prisma generate
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
if [ "${SEED_DEMO:-}" = "true" ]; then
  # the seed scripts only add sample users outside production
  DATABASE_URL="$DIRECT_URL" NODE_ENV=development npx tsx prisma/seed.ts
  DATABASE_URL="$DIRECT_URL" NODE_ENV=development npx tsx prisma/seed-demo.ts
fi
npx next build
