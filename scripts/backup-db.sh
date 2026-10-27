#!/usr/bin/env bash
# پشتیبان کامل دیتابیس از کانتینر Postgres (بدون نیاز به رمز؛ از متغیرهای خود کانتینر)
# اجرا: bash scripts/backup-db.sh   ← خروجی در backups/ ، ۳۰ نسخه آخر نگه داشته می‌شود
set -euo pipefail
cd "$(dirname "$0")/.."
CONTAINER="${PG_CONTAINER:-maya-spirulina-postgres}"
KEEP="${BACKUP_KEEP:-30}"
mkdir -p backups
out="backups/maya-$(date +%Y%m%d-%H%M%S).sql.gz"
docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$out.tmp"
# فایل خالی یعنی dump شکست خورده؛ نسخه‌های قبلی دست نمی‌خورند
[ -s "$out.tmp" ] && gunzip -t "$out.tmp" && mv "$out.tmp" "$out" || { rm -f "$out.tmp"; echo "backup failed" >&2; exit 1; }
ls -1t backups/maya-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "saved $out"
