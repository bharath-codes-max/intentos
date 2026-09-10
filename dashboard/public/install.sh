#!/bin/sh
# Intentos Claude Code connector — one-line installer.
# Usage: curl -fsSL https://<your-intentos-dashboard>/install.sh | bash
set -e

if ! command -v node >/dev/null 2>&1; then
  echo "Intentos requires Node.js (v18+). Install it from https://nodejs.org and re-run this command." >&2
  exit 1
fi

DASHBOARD_URL="${INTENTOS_DASHBOARD_URL:-https://intentos-ecru.vercel.app}"
# A plain `mktemp -t` template is handled differently by BSD (macOS) vs GNU (Linux)
# mktemp — BSD appends its random suffix AFTER the whole template instead of
# substituting XXXXXX in place, which silently produces a file without a real
# .mjs extension and breaks Node's ESM loader. Making our own temp dir sidesteps
# the platform difference entirely: the filename inside it is always exact.
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t intentos-connect)"
TMP_FILE="$TMP_DIR/connect.mjs"
curl -fsSL "$DASHBOARD_URL/connect.mjs" -o "$TMP_FILE"
node "$TMP_FILE"
rm -rf "$TMP_DIR"
