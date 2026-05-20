#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/var/www/html}"
PUBLISH_SCRIPT="$ROOT_DIR/backend/scripts/deploy/publish-nest-zero-downtime.sh"
STATUS_SCRIPT="$ROOT_DIR/backend/scripts/deploy/publish-status.sh"

echo "[deploy-now] Starting publish..."
"$PUBLISH_SCRIPT"

echo "[deploy-now] Publish finished. Current status:"
"$STATUS_SCRIPT"

echo "[deploy-now] Done."
