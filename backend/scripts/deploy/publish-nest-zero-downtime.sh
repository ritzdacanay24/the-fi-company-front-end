#!/usr/bin/env bash

set -euo pipefail

# Nest API zero-downtime publish helper.
#
# Flow:
# 1) Verify both backend instances are reachable before publish.
# 2) Install deps + build backend/nest-api once.
# 3) Roll restart services one-by-one with health checks.
#
# Optional env vars:
#   NEST_DIR             Path to nest-api project.
#                        Default: /var/www/html/backend/nest-api
#   SKIP_NPM_CI          true|false. Skip npm ci step. Default: false
#   SKIP_BUILD           true|false. Skip npm run build step. Default: false
#   PUBLISH_LOCK_FILE    File lock path to prevent overlapping publishes.
#                        Default: /tmp/eyefi-nest-publish.lock
#
#   SERVICES_CSV         Passed through to rolling-deploy.sh
#   HEALTH_URLS_CSV      Passed through to rolling-deploy.sh
#   HEALTH_MAX_WAIT_SEC  Passed through to rolling-deploy.sh
#   HEALTH_POLL_SEC      Passed through to rolling-deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLING_SCRIPT="$SCRIPT_DIR/rolling-deploy.sh"

NEST_DIR="${NEST_DIR:-/var/www/html/backend/nest-api}"
SKIP_NPM_CI="${SKIP_NPM_CI:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
PUBLISH_LOCK_FILE="${PUBLISH_LOCK_FILE:-/tmp/eyefi-nest-publish.lock}"

SERVICES_CSV="${SERVICES_CSV:-eyefi-nest-api,eyefi-nest-api-2}"
HEALTH_URLS_CSV="${HEALTH_URLS_CSV:-http://127.0.0.1:3002/health,http://127.0.0.1:3003/health}"

log() {
  printf '[publish-nest] %s\n' "$1"
}

split_csv() {
  local input="$1"
  local -n out_arr=$2
  IFS=',' read -r -a out_arr <<< "$input"
}

check_health_all() {
  local -a urls
  split_csv "$HEALTH_URLS_CSV" urls

  for url in "${urls[@]}"; do
    if ! curl -fsS "$url" >/dev/null 2>&1; then
      log "Precheck failed: $url"
      return 1
    fi
  done
  return 0
}

if [[ ! -x "$ROLLING_SCRIPT" ]]; then
  log "Missing or non-executable rolling script: $ROLLING_SCRIPT"
  exit 1
fi

if [[ ! -f "$NEST_DIR/package.json" ]]; then
  log "Invalid NEST_DIR (package.json not found): $NEST_DIR"
  exit 1
fi

exec 9>"$PUBLISH_LOCK_FILE"
if ! flock -n 9; then
  log "Another publish is already running (lock: $PUBLISH_LOCK_FILE)."
  exit 1
fi

log "Precheck: verifying instance health before publish"
if ! check_health_all; then
  log "Aborting publish because one or more instances are unhealthy."
  exit 1
fi

if [[ "$SKIP_NPM_CI" != "true" ]]; then
  log "Running npm ci"
  npm --prefix "$NEST_DIR" ci
fi

if [[ "$SKIP_BUILD" != "true" ]]; then
  log "Running npm run build"
  npm --prefix "$NEST_DIR" run build
fi

log "Running rolling restart"
SERVICES_CSV="$SERVICES_CSV" \
HEALTH_URLS_CSV="$HEALTH_URLS_CSV" \
HEALTH_MAX_WAIT_SEC="${HEALTH_MAX_WAIT_SEC:-120}" \
HEALTH_POLL_SEC="${HEALTH_POLL_SEC:-2}" \
"$ROLLING_SCRIPT"

log "Publish completed successfully"
