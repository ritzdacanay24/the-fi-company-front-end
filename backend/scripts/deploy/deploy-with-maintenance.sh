#!/usr/bin/env bash

set -euo pipefail

# Maintenance-aware single-server deployment wrapper.
#
# What it does:
# 1) Marks deploy mode ON (backend blocks write requests with 503 + Retry-After)
# 2) Restarts backend and frontend services via systemctl
# 3) Waits for backend health endpoint to pass
# 4) Marks deploy mode OFF
#
# Optional env vars:
#   DEPLOY_STATUS_FILE     Path to deploy-status.json (default: ./deploy-status.json)
#   RETRY_AFTER_SECONDS    Retry-After seconds sent to clients during deploy (default: 20)
#   DEPLOY_MESSAGE         Message shown in frontend banner (default below)
#   BACKEND_SERVICE        systemctl backend service name (default: nest-api)
#   FRONTEND_SERVICE       systemctl frontend service name (default: nginx)
#   HEALTH_URL             Health URL to probe (default: http://127.0.0.1:3000/health)
#   HEALTH_MAX_WAIT_SEC    Max health wait in seconds (default: 120)
#
# Usage:
#   ./backend/scripts/deploy/deploy-with-maintenance.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEFAULT_DEPLOY_STATUS_FILE="$REPO_ROOT/backend/nest-api/deploy-status.json"

DEPLOY_STATUS_FILE="${DEPLOY_STATUS_FILE:-$DEFAULT_DEPLOY_STATUS_FILE}"
RETRY_AFTER_SECONDS="${RETRY_AFTER_SECONDS:-20}"
DEPLOY_MESSAGE="${DEPLOY_MESSAGE:-A new version is currently being deployed. Please retry in a moment.}"
BACKEND_SERVICE="${BACKEND_SERVICE:-eyefi-nest-api}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-apache2}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3002/health}"
HEALTH_MAX_WAIT_SEC="${HEALTH_MAX_WAIT_SEC:-120}"

log() {
  printf '[deploy] %s\n' "$1"
}

utc_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

write_deploy_status() {
  local deploying="$1"
  local message="$2"
  local retry_after="$3"

  mkdir -p "$(dirname "$DEPLOY_STATUS_FILE")"

  cat > "$DEPLOY_STATUS_FILE" <<EOF
{
  "deploying": ${deploying},
  "message": "${message}",
  "retryAfterSeconds": ${retry_after},
  "updatedAt": "$(utc_now)"
}
EOF
}

wait_for_health() {
  local waited=0
  while (( waited < HEALTH_MAX_WAIT_SEC )); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    waited=$((waited + 2))
  done

  return 1
}

log "Enabling deploy mode: $DEPLOY_STATUS_FILE"
write_deploy_status true "$DEPLOY_MESSAGE" "$RETRY_AFTER_SECONDS"

log "Restarting backend service: $BACKEND_SERVICE"
sudo systemctl restart "$BACKEND_SERVICE"

log "Restarting frontend service: $FRONTEND_SERVICE"
sudo systemctl restart "$FRONTEND_SERVICE"

log "Waiting for backend health: $HEALTH_URL"
if ! wait_for_health; then
  log "Health check failed after ${HEALTH_MAX_WAIT_SEC}s. Deploy mode remains ON."
  log "Fix services, then set deploy status to OFF manually."
  exit 1
fi

log "Health check passed. Disabling deploy mode."
write_deploy_status false "Deployment complete." 5

log "Deployment completed successfully."
