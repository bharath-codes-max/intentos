#!/bin/sh
# Removes everything install-codex-desktop.sh added. Safe to run even if it was
# never installed (each step is a no-op in that case).
set -u

UID_NUM="$(id -u)"

echo "Stopping Intentos LaunchAgents…"
launchctl bootout "gui/$UID_NUM/com.intentos.codex-appserver" 2>/dev/null || true
launchctl bootout "gui/$UID_NUM/com.intentos.codex-desktop-launcher" 2>/dev/null || true

echo "Removing LaunchAgent files…"
rm -f "$HOME/Library/LaunchAgents/com.intentos.codex-appserver.plist"
rm -f "$HOME/Library/LaunchAgents/com.intentos.codex-desktop-launcher.plist"

echo "Clearing the environment variable…"
launchctl unsetenv CODEX_APP_SERVER_WS_URL 2>/dev/null || true

echo "Removing the orchestrator script…"
rm -f "$HOME/.intentos/scripts/launch-desktop-ordered.sh"

LATEST_BACKUP="$(ls -t "$HOME/.codex/config.toml.backup-"* 2>/dev/null | head -1 || true)"
if [ -n "$LATEST_BACKUP" ]; then
  echo "Restoring ~/.codex/config.toml from backup: $LATEST_BACKUP"
  cp "$LATEST_BACKUP" "$HOME/.codex/config.toml"
else
  echo "No config.toml backup found — leaving it as-is. If you added the"
  echo "[mcp_servers.codex_app] stub manually, remove that section yourself."
fi

echo ""
echo "Done. Quit and reopen ChatGPT Desktop — it will go back to spawning its own"
echo "private app-server, exactly as it did before Intentos was connected."
