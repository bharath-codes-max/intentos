#!/bin/sh
# Intentos Claude Code connector — one-line installer.
# Usage: curl -fsSL https://<your-intentos-dashboard>/install.sh | bash
set -e

if ! command -v node >/dev/null 2>&1; then
  echo "Intentos requires Node.js (v18+). Install it from https://nodejs.org and re-run this command." >&2
  exit 1
fi

DASHBOARD_URL="${INTENTOS_DASHBOARD_URL:-https://intentos-ecru.vercel.app}"
TMP_FILE="$(mktemp -t intentos-connect.XXXXXX.mjs 2>/dev/null || mktemp)"
curl -fsSL "$DASHBOARD_URL/connect.mjs" -o "$TMP_FILE"
node "$TMP_FILE"
rm -f "$TMP_FILE"
