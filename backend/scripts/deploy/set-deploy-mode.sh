#!/usr/bin/env bash

set -euo pipefail

# Manual deploy-status toggle helper.
#
# Usage:
#   ./backend/scripts/deploy/set-deploy-mode.sh on
#   ./backend/scripts/deploy/set-deploy-mode.sh off
#
# Optional env vars:
#   DEPLOY_STATUS_FILE   Path to deploy-status.json (default: ./deploy-status.json)
#   DEPLOY_MESSAGE       Banner message (default depends on mode)
#   RETRY_AFTER_SECONDS  Retry-After value for ON mode (default: 20)

MODE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEFAULT_DEPLOY_STATUS_FILE="$REPO_ROOT/backend/nest-api/deploy-status.json"

DEPLOY_STATUS_FILE="${DEPLOY_STATUS_FILE:-$DEFAULT_DEPLOY_STATUS_FILE}"
RETRY_AFTER_SECONDS="${RETRY_AFTER_SECONDS:-20}"

if [[ "$MODE" != "on" && "$MODE" != "off" ]]; then
  echo "Usage: $0 <on|off>"
  exit 1
fi

if [[ "$MODE" == "on" ]]; then
  DEPLOYING=true
  DEFAULT_MESSAGE="A new version is currently being deployed. Please retry in a moment."
else
  DEPLOYING=false
  DEFAULT_MESSAGE="Deployment complete."
fi

DEPLOY_MESSAGE="${DEPLOY_MESSAGE:-$DEFAULT_MESSAGE}"

utc_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

mkdir -p "$(dirname "$DEPLOY_STATUS_FILE")"

cat > "$DEPLOY_STATUS_FILE" <<EOF
{
  "deploying": ${DEPLOYING},
  "message": "${DEPLOY_MESSAGE}",
  "retryAfterSeconds": ${RETRY_AFTER_SECONDS},
  "updatedAt": "$(utc_now)"
}
EOF

echo "[deploy] Wrote deploy status to: $DEPLOY_STATUS_FILE"
echo "[deploy] deploying=$DEPLOYING"
echo "[deploy] message=$DEPLOY_MESSAGE"
echo "[deploy] retryAfterSeconds=$RETRY_AFTER_SECONDS"
