#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/tp/deploy"
STATE_DIR="/opt/tp/ops/state"
LOG_FILE="/var/log/tp-monitor.log"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-1800}"

mkdir -p "${STATE_DIR}"
touch "${LOG_FILE}"

load_env() {
  set -a
  # shellcheck disable=SC1091
  source "${DEPLOY_DIR}/.env.backend"
  set +a
}

check_http_contains() {
  local url="$1"
  local needle="$2"
  local body
  body="$(curl -fsSL --max-time 15 "${url}")"
  if [[ "${body}" != *"${needle}"* ]]; then
    echo "Expected content '${needle}' missing from ${url}"
    return 1
  fi
}

check_http_ok_json() {
  local url="$1"
  local body
  body="$(curl -fsSL --max-time 15 "${url}")"
  if [[ "${body}" != *'"ok":true'* && "${body}" != *'"ok": true'* ]]; then
    echo "Endpoint did not return ok=true: ${url}"
    return 1
  fi
}

check_container_running() {
  local name="$1"
  local status
  status="$(docker inspect -f '{{.State.Status}}' "${name}" 2>/dev/null || true)"
  if [[ "${status}" != "running" ]]; then
    echo "Container not running: ${name} (status=${status:-missing})"
    return 1
  fi
}

check_disk_usage_under() {
  local mount_point="$1"
  local max_percent="$2"
  local usage
  usage="$(df -P "${mount_point}" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
  if [[ -z "${usage}" ]]; then
    echo "Could not read disk usage for ${mount_point}"
    return 1
  fi
  if (( usage > max_percent )); then
    echo "Disk usage too high on ${mount_point}: ${usage}% (limit ${max_percent}%)"
    return 1
  fi
}

check_tls_days_left() {
  local host="$1"
  local min_days="$2"
  if ! command -v openssl >/dev/null 2>&1; then
    echo "openssl not installed; cannot check TLS cert for ${host}"
    return 1
  fi
  local end_date
  end_date="$(echo | openssl s_client -servername "${host}" -connect "${host}:443" 2>/dev/null | openssl x509 -noout -enddate | sed 's/^notAfter=//')"
  if [[ -z "${end_date}" ]]; then
    echo "Could not read TLS cert expiry for ${host}"
    return 1
  fi
  local end_epoch now_epoch days_left
  end_epoch="$(date -d "${end_date}" +%s 2>/dev/null || true)"
  now_epoch="$(date +%s)"
  if [[ -z "${end_epoch}" ]]; then
    echo "Could not parse TLS cert expiry for ${host}: ${end_date}"
    return 1
  fi
  days_left="$(( (end_epoch - now_epoch) / 86400 ))"
  if (( days_left < min_days )); then
    echo "TLS cert for ${host} expires in ${days_left} days (min ${min_days})"
    return 1
  fi
}

send_postmark_alert() {
  local subject="$1"
  local message="$2"
  local token="${SMTP_USER:-}"
  local from_email="${SMTP_FROM:-no-reply@thailandpanties.com}"
  local to_email="${ADMIN_EMAIL:-admin@thailandpanties.com}"

  if [[ -z "${token}" ]]; then
    echo "Postmark token missing; cannot send alert email."
    return 1
  fi

  curl -fsSL --max-time 20 \
    -X POST "https://api.postmarkapp.com/email" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "X-Postmark-Server-Token: ${token}" \
    -d "$(cat <<EOF
{
  "From": "${from_email}",
  "To": "${to_email}",
  "Subject": "${subject}",
  "TextBody": "${message}"
}
EOF
)"
}

main() {
  load_env
  local now_epoch
  now_epoch="$(date +%s)"
  local failures=()

  check_http_contains "https://thailandpanties.com/" "id=\"root\"" || failures+=("frontend")
  check_http_ok_json "https://api.thailandpanties.com/api/health" || failures+=("api_health")
  check_http_ok_json "https://api.thailandpanties.com/api/health/ready" || failures+=("api_ready")
  check_container_running "tp-frontend" || failures+=("tp-frontend")
  check_container_running "tp-backend" || failures+=("tp-backend")
  check_container_running "tp-postgres" || failures+=("tp-postgres")
  check_disk_usage_under "/" 85 || failures+=("disk_root")
  check_tls_days_left "thailandpanties.com" 21 || failures+=("tls_frontend")
  check_tls_days_left "api.thailandpanties.com" 21 || failures+=("tls_api")

  if [[ ${#failures[@]} -eq 0 ]]; then
    echo "$(date -u +%FT%TZ) OK all checks passed" >> "${LOG_FILE}"
    exit 0
  fi

  local failed_csv
  failed_csv="$(IFS=,; echo "${failures[*]}")"
  echo "$(date -u +%FT%TZ) FAIL checks=${failed_csv}" >> "${LOG_FILE}"

  local marker_file="${STATE_DIR}/last_alert_epoch"
  local last_alert=0
  if [[ -f "${marker_file}" ]]; then
    last_alert="$(cat "${marker_file}" 2>/dev/null || echo 0)"
  fi

  if (( now_epoch - last_alert < COOLDOWN_SECONDS )); then
    exit 1
  fi

  local subject="[thailandpanties] Production health alert"
  local message
  message=$(
    cat <<EOF
One or more production health checks failed.

Failed checks: ${failed_csv}
Time (UTC): $(date -u +%FT%TZ)
Host: $(hostname)

Recent container status:
$(docker ps --format '{{.Names}} {{.Status}}')

Recent backend logs:
$(docker logs --tail 30 tp-backend 2>&1 || true)
EOF
  )

  if send_postmark_alert "${subject}" "${message}"; then
    echo "${now_epoch}" > "${marker_file}"
    echo "$(date -u +%FT%TZ) ALERT_SENT checks=${failed_csv}" >> "${LOG_FILE}"
  else
    echo "$(date -u +%FT%TZ) ALERT_SEND_FAILED checks=${failed_csv}" >> "${LOG_FILE}"
  fi

  exit 1
}

main "$@"
