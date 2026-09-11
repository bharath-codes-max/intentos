#!/bin/sh
# Intentos ChatGPT Desktop (Codex) connector — one-line installer. macOS only.
# Usage: curl -fsSL https://<your-intentos-dashboard>/install-codex-desktop.sh | bash
set -e

if [ "$(uname)" != "Darwin" ]; then
  echo "The ChatGPT Desktop connector currently only supports macOS." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Intentos requires Node.js (v18+). Install it from https://nodejs.org and re-run this command." >&2
  exit 1
fi

DASHBOARD_URL="${INTENTOS_DASHBOARD_URL:-https://intentos-ecru.vercel.app}"
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t intentos-connect-codex-desktop)"
TMP_FILE="$TMP_DIR/connect-codex-desktop.mjs"
curl -fsSL "$DASHBOARD_URL/connect-codex-desktop.mjs" -o "$TMP_FILE"
node "$TMP_FILE"
rm -rf "$TMP_DIR"
