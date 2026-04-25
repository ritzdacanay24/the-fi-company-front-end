#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${1:-/var/www/html/frontend/dist/web}"
DEST_DIR="/var/www/html/portal/web"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Source build folder not found: $SRC_DIR"
  echo "Usage: bash /var/www/html/tasks/deploy-portal-build.sh /path/to/build"
  exit 1
fi

mkdir -p "$DEST_DIR"
rsync -a --delete "$SRC_DIR"/ "$DEST_DIR"/

# Ensure index base href points at portal path.
if [[ -f "$DEST_DIR/index.html" ]]; then
  sed -i 's#<base href="/dist/web/">#<base href="/portal/web/">#g' "$DEST_DIR/index.html"
  sed -i 's#<base href="/portal/">#<base href="/portal/web/">#g' "$DEST_DIR/index.html"
fi

# Hotfix hardcoded dist/web references in built static files.
find "$DEST_DIR" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.webmanifest' \) -print0 \
  | xargs -0 sed -i 's#/dist/web/#/portal/web/#g'

# Keep /portal index aligned with deployed build entrypoint.
cp "$DEST_DIR/index.html" /var/www/html/portal/index.html

echo "Portal build deployed from: $SRC_DIR"
echo "Portal URL: https://dashboard.eye-fi.com/portal/"
