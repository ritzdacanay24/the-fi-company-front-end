#!/usr/bin/env bash

set -euo pipefail

# Zero/near-zero downtime rolling deployment for two backend services behind Apache.
#
# Strategy:
# 1) Keep both backend instances running behind a balancer.
# 2) Restart instance A and wait for health.
# 3) Restart instance B and wait for health.
#
# Optional env vars:
#   SERVICES_CSV         Comma-separated service names.
#                        Default: eyefi-nest-api,eyefi-nest-api-2
#   HEALTH_URLS_CSV      Comma-separated health URLs aligned by index with SERVICES_CSV.
#                        Default: http://127.0.0.1:3002/health,http://127.0.0.1:3003/health
#   HEALTH_MAX_WAIT_SEC  Max wait per instance health check. Default: 120
#   HEALTH_POLL_SEC      Poll interval for health checks. Default: 2
#   HEALTH_CONSECUTIVE_OK Number of consecutive successful health checks required. Default: 3
#   POST_RESTART_STABILIZE_SEC Extra wait after each instance becomes healthy. Default: 5
#   FRONTEND_ACTION      Optional frontend action after backend rollout: skip|reload|restart.
#                        Default: skip
#   FRONTEND_SERVICE     Frontend service name if FRONTEND_ACTION != skip. Default: apache2
#
# Usage:
#   ./backend/scripts/deploy/rolling-deploy.sh

SERVICES_CSV="${SERVICES_CSV:-eyefi-nest-api,eyefi-nest-api-2}"
HEALTH_URLS_CSV="${HEALTH_URLS_CSV:-http://127.0.0.1:3002/health,http://127.0.0.1:3003/health}"
HEALTH_MAX_WAIT_SEC="${HEALTH_MAX_WAIT_SEC:-120}"
HEALTH_POLL_SEC="${HEALTH_POLL_SEC:-2}"
HEALTH_CONSECUTIVE_OK="${HEALTH_CONSECUTIVE_OK:-3}"
POST_RESTART_STABILIZE_SEC="${POST_RESTART_STABILIZE_SEC:-5}"
FRONTEND_ACTION="${FRONTEND_ACTION:-skip}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-apache2}"

log() {
  printf '[rolling-deploy] %s\n' "$1"
}

split_csv() {
  local input="$1"
  local -n out_arr=$2
  IFS=',' read -r -a out_arr <<< "$input"
}

wait_for_health() {
  local url="$1"
  local waited=0
  local ok_count=0

  while (( waited < HEALTH_MAX_WAIT_SEC )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      ok_count=$((ok_count + 1))
      if (( ok_count >= HEALTH_CONSECUTIVE_OK )); then
        return 0
      fi
    else
      ok_count=0
    fi

    sleep "$HEALTH_POLL_SEC"
    waited=$((waited + HEALTH_POLL_SEC))
  done

  return 1
}

if [[ "$FRONTEND_ACTION" != "skip" && "$FRONTEND_ACTION" != "reload" && "$FRONTEND_ACTION" != "restart" ]]; then
  log "Invalid FRONTEND_ACTION: $FRONTEND_ACTION (expected skip|reload|restart)"
  exit 1
fi

declare -a SERVICES
declare -a HEALTH_URLS
split_csv "$SERVICES_CSV" SERVICES
split_csv "$HEALTH_URLS_CSV" HEALTH_URLS

if (( ${#SERVICES[@]} == 0 )); then
  log "No services provided in SERVICES_CSV."
  exit 1
fi

if (( ${#SERVICES[@]} != ${#HEALTH_URLS[@]} )); then
  log "SERVICES_CSV and HEALTH_URLS_CSV length mismatch."
  log "SERVICES_CSV=$SERVICES_CSV"
  log "HEALTH_URLS_CSV=$HEALTH_URLS_CSV"
  exit 1
fi

log "Starting rolling deployment across ${#SERVICES[@]} backend instances."

for i in "${!SERVICES[@]}"; do
  service="${SERVICES[$i]}"
  health_url="${HEALTH_URLS[$i]}"

  log "Restarting service: $service"
  sudo systemctl restart "$service"

  log "Waiting for health: $health_url"
  if ! wait_for_health "$health_url"; then
    log "Health check failed for $service after ${HEALTH_MAX_WAIT_SEC}s."
    log "Aborting rollout. Previously updated instances remain up."
    exit 1
  fi

  if (( POST_RESTART_STABILIZE_SEC > 0 )); then
    log "Stabilizing for ${POST_RESTART_STABILIZE_SEC}s: $service"
    sleep "$POST_RESTART_STABILIZE_SEC"
  fi

  log "Service healthy: $service"
done

if [[ "$FRONTEND_ACTION" != "skip" ]]; then
  log "Running frontend action: $FRONTEND_ACTION $FRONTEND_SERVICE"
  sudo systemctl "$FRONTEND_ACTION" "$FRONTEND_SERVICE"
fi

log "Rolling deployment completed successfully."
