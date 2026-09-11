#!/bin/sh
# Intentos Codex CLI / VS Code Terminal connector — one-line installer.
# Usage: curl -fsSL https://<your-intentos-dashboard>/install-codex.sh | bash
set -e

if ! command -v node >/dev/null 2>&1; then
  echo "Intentos requires Node.js (v18+). Install it from https://nodejs.org and re-run this command." >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Intentos requires the Codex CLI to already be installed (npm install -g @openai/codex), then re-run this command." >&2
  exit 1
fi

DASHBOARD_URL="${INTENTOS_DASHBOARD_URL:-https://intentos-ecru.vercel.app}"
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t intentos-connect-codex)"
TMP_FILE="$TMP_DIR/connect-codex.mjs"
curl -fsSL "$DASHBOARD_URL/connect-codex.mjs" -o "$TMP_FILE"
node "$TMP_FILE"
rm -rf "$TMP_DIR"
