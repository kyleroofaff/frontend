#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/tp/deploy"
STATE_DIR="/opt/tp/ops/state"
MONITOR_LOG="/var/log/tp-monitor.log"
BACKUP_LOG="/var/log/tp-postgres-backup.log"

mkdir -p "${STATE_DIR}"

load_env() {
  set -a
  # shellcheck disable=SC1091
  source "${DEPLOY_DIR}/.env.backend"
  set +a
}

count_pattern_since_days() {
  local file="$1"
  local pattern="$2"
  local days="$3"
  if [[ ! -f "${file}" ]]; then
    echo "0"
    return
  fi
  local total=0
  local d date_prefix n
  for ((d=0; d<days; d++)); do
    date_prefix="$(date -u -d "-${d} day" +%Y-%m-%d)"
    n="$(grep -c "^${date_prefix}.*${pattern}" "${file}" || true)"
    total=$((total + n))
  done
  echo "${total}"
}

build_body() {
  local monitor_ok="$1"
  local monitor_fail="$2"
  local monitor_alerts="$3"
  local monitor_alert_send_fail="$4"
  local backup_created="$5"
  local report_time="$6"
  local host_name
  host_name="$(hostname)"

  cat <<EOF
Weekly production operations summary (last 7 days).

Generated at (UTC): ${report_time}
Host: ${host_name}

Health monitoring:
- monitor OK checks: ${monitor_ok}
- monitor FAIL checks: ${monitor_fail}
- alert emails sent: ${monitor_alerts}
- alert send failures: ${monitor_alert_send_fail}

Backups:
- backups created: ${backup_created}

Log files:
- ${MONITOR_LOG}
- ${BACKUP_LOG}
EOF
}

send_postmark_email() {
  local subject="$1"
  local body="$2"
  local token="${SMTP_USER:-}"
  local from_email="${SMTP_FROM:-no-reply@thailandpanties.com}"
  local to_email="${ADMIN_EMAIL:-admin@thailandpanties.com}"

  if [[ -z "${token}" ]]; then
    echo "Postmark token missing; cannot send weekly report."
    return 1
  fi

  local escaped_subject escaped_body
  escaped_subject="$(printf '%s' "${subject}" | sed 's/"/\\"/g')"
  escaped_body="$(printf '%s' "${body}" | sed ':a;N;$!ba;s/\n/\\n/g; s/"/\\"/g')"

  curl -fsSL --max-time 25 \
    -X POST "https://api.postmarkapp.com/email" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "X-Postmark-Server-Token: ${token}" \
    -d "$(cat <<EOF
{
  "From": "${from_email}",
  "To": "${to_email}",
  "Subject": "${escaped_subject}",
  "TextBody": "${escaped_body}"
}
EOF
)" > /dev/null
}

main() {
  load_env

  local now_utc
  now_utc="$(date -u +%FT%TZ)"
  local monitor_ok monitor_fail monitor_alerts monitor_alert_send_fail backup_created
  monitor_ok="$(count_pattern_since_days "${MONITOR_LOG}" " OK " 7)"
  monitor_fail="$(count_pattern_since_days "${MONITOR_LOG}" " FAIL " 7)"
  monitor_alerts="$(count_pattern_since_days "${MONITOR_LOG}" " ALERT_SENT " 7)"
  monitor_alert_send_fail="$(count_pattern_since_days "${MONITOR_LOG}" " ALERT_SEND_FAILED " 7)"
  backup_created="$(count_pattern_since_days "${BACKUP_LOG}" "backup_created=" 7)"

  local subject="[thailandpanties] Weekly ops summary"
  local body
  body="$(build_body "${monitor_ok}" "${monitor_fail}" "${monitor_alerts}" "${monitor_alert_send_fail}" "${backup_created}" "${now_utc}")"

  send_postmark_email "${subject}" "${body}"
  echo "${now_utc} WEEKLY_REPORT_SENT ok=${monitor_ok} fail=${monitor_fail} backups=${backup_created}" >> "${MONITOR_LOG}"
  echo "weekly_report_sent_to=${ADMIN_EMAIL:-admin@thailandpanties.com}"
}

main "$@"
