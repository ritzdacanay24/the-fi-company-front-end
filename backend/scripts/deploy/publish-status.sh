#!/usr/bin/env bash

set -euo pipefail

# Quick post-publish status for Nest API rollout.

NEST_DIR="${NEST_DIR:-/var/www/html/backend/nest-api}"
SERVICE_A="${SERVICE_A:-eyefi-nest-api}"
SERVICE_B="${SERVICE_B:-eyefi-nest-api-2}"
HEALTH_A="${HEALTH_A:-http://127.0.0.1:3002/health}"
HEALTH_B="${HEALTH_B:-http://127.0.0.1:3003/health}"

say() {
  printf '%s\n' "$1"
}

json_field() {
  local file="$1"
  local field="$2"
  grep -E "\"$field\"" "$file" | head -n 1 | sed -E 's/.*: *"?([^",]+)"?,?$/\1/'
}

say "=== Publish Status (Nest API) ==="
say "time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ -f "$NEST_DIR/package.json" ]]; then
  version="$(json_field "$NEST_DIR/package.json" version || true)"
  say "app_version: ${version:-unknown}"
else
  say "app_version: unknown (missing $NEST_DIR/package.json)"
fi

if command -v git >/dev/null 2>&1; then
  git_sha="$(git -C "$NEST_DIR" rev-parse --short HEAD 2>/dev/null || true)"
  say "git_sha: ${git_sha:-unknown}"
fi

say ""
say "services:"
for svc in "$SERVICE_A" "$SERVICE_B"; do
  state="$(systemctl is-active "$svc" 2>/dev/null || true)"
  main_pid="$(systemctl show -p MainPID --value "$svc" 2>/dev/null || true)"
  say "- $svc state=${state:-unknown} pid=${main_pid:-unknown}"
done

say ""
say "health:"
if curl -fsS "$HEALTH_A" >/dev/null 2>&1; then
  say "- $HEALTH_A ok"
else
  say "- $HEALTH_A fail"
fi

if curl -fsS "$HEALTH_B" >/dev/null 2>&1; then
  say "- $HEALTH_B ok"
else
  say "- $HEALTH_B fail"
fi
