#!/usr/bin/env bash

set -euo pipefail

# Emergency rollback helper:
# Restores ApiV2 routing to the single live backend instance (3002)
# using the preserved pre-balancer backups, then validates/reloads Apache.

ROOT_DIR="${ROOT_DIR:-/var/www/html}"

SERVER_HTACCESS="$ROOT_DIR/server/.htaccess"
SERVER_HTACCESS_BAK="$ROOT_DIR/server/.htaccess.bak.pre-balancer-2026-05-19-184951"

APIV2_HTACCESS="$ROOT_DIR/server/ApiV2/.htaccess"
APIV2_HTACCESS_BAK="$ROOT_DIR/server/ApiV2/.htaccess.bak.pre-balancer-2026-05-19-184951"

log() {
  printf '[rollback-apiv2] %s\n' "$1"
}

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    log "Missing required file: $file"
    exit 1
  fi
}

require_file "$SERVER_HTACCESS_BAK"
require_file "$APIV2_HTACCESS_BAK"

log "Restoring $SERVER_HTACCESS from backup"
cp "$SERVER_HTACCESS_BAK" "$SERVER_HTACCESS"

log "Restoring $APIV2_HTACCESS from backup"
cp "$APIV2_HTACCESS_BAK" "$APIV2_HTACCESS"

log "Validating Apache config"
sudo apachectl -t

log "Reloading Apache"
sudo systemctl reload apache2

log "Rollback completed. ApiV2 routes now target the single live instance (3002)."
