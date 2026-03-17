#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/tp/deploy"
BACKUP_DIR="/opt/tp/backups/postgres"

DB_USER="$(sed -n 's/^POSTGRES_USER=//p' "${DEPLOY_DIR}/.env.db")"
DB_PASS="$(sed -n 's/^POSTGRES_PASSWORD=//p' "${DEPLOY_DIR}/.env.db")"
DB_NAME="$(sed -n 's/^POSTGRES_DB=//p' "${DEPLOY_DIR}/.env.db")"
TEST_DB="${DB_NAME}_restore_test"
LATEST_BACKUP="$(ls -1t "${BACKUP_DIR}"/*.sql.gz | sed -n '1p')"

if [[ -z "${LATEST_BACKUP}" ]]; then
  echo "no_backup_found"
  exit 1
fi

docker exec -e PGPASSWORD="${DB_PASS}" tp-postgres psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"
docker exec -e PGPASSWORD="${DB_PASS}" tp-postgres psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${TEST_DB};"

gunzip -c "${LATEST_BACKUP}" | docker exec -i -e PGPASSWORD="${DB_PASS}" tp-postgres psql -U "${DB_USER}" -d "${TEST_DB}" > /dev/null

USER_COUNT="$(docker exec -e PGPASSWORD="${DB_PASS}" tp-postgres psql -U "${DB_USER}" -d "${TEST_DB}" -Atc "SELECT COUNT(*) FROM app_users;")"
PRODUCT_COUNT="$(docker exec -e PGPASSWORD="${DB_PASS}" tp-postgres psql -U "${DB_USER}" -d "${TEST_DB}" -Atc "SELECT COUNT(*) FROM products;")"

docker exec -e PGPASSWORD="${DB_PASS}" tp-postgres psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" > /dev/null

echo "restore_drill_ok backup=${LATEST_BACKUP} app_users=${USER_COUNT} products=${PRODUCT_COUNT}"
