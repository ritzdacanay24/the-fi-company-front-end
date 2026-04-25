#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_FILE="${SCRIPT_DIR}/dashboard-tasks.cron"

if [[ ! -f "${CRON_FILE}" ]]; then
  echo "Cron file not found: ${CRON_FILE}" >&2
  exit 1
fi

if ! command -v crontab >/dev/null 2>&1; then
  echo "crontab command not found" >&2
  exit 1
fi

TMP_FILE="$(mktemp)"
trap 'rm -f "${TMP_FILE}"' EXIT

if crontab -l >/dev/null 2>&1; then
  crontab -l > "${TMP_FILE}" || true
fi

# Remove previously installed block
sed -i '/# BEGIN EYEFI DASHBOARD TASKS/,/# END EYEFI DASHBOARD TASKS/d' "${TMP_FILE}"

{
  echo "# BEGIN EYEFI DASHBOARD TASKS"
  cat "${CRON_FILE}"
  echo "# END EYEFI DASHBOARD TASKS"
} >> "${TMP_FILE}"

crontab "${TMP_FILE}"

echo "Installed dashboard task cron jobs from ${CRON_FILE}"
crontab -l | sed -n '/# BEGIN EYEFI DASHBOARD TASKS/,/# END EYEFI DASHBOARD TASKS/p'
