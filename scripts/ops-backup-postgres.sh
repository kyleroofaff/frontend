#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/tp/deploy"
BACKUP_DIR="/opt/tp/backups/postgres"
KEEP_DAYS="${KEEP_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

DB_USER="$(sed -n 's/^POSTGRES_USER=//p' "${DEPLOY_DIR}/.env.db")"
DB_PASS="$(sed -n 's/^POSTGRES_PASSWORD=//p' "${DEPLOY_DIR}/.env.db")"
DB_NAME="$(sed -n 's/^POSTGRES_DB=//p' "${DEPLOY_DIR}/.env.db")"

mkdir -p "${BACKUP_DIR}"
OUT_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

docker exec -e PGPASSWORD="${DB_PASS}" tp-postgres pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  | gzip -9 > "${OUT_FILE}"

find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${KEEP_DAYS}" -delete

echo "backup_created=${OUT_FILE}"
