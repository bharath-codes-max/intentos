#!/usr/bin/env node
/**
 * Intentos ChatGPT Desktop (Codex) connector installer — macOS only.
 *
 * Run via: curl -fsSL <dashboard>/install-codex-desktop.sh | bash
 *
 * ChatGPT Desktop runs Codex through its OWN app-server process rather than reading
 * ~/.codex/hooks.json directly the way the CLI does — so governing it needs more than a
 * hook file. This installer sets up the full mechanism confirmed to work in practice:
 *
 *   1. Everything connect-codex.mjs does: downloads the hook script, runs device approval,
 *      writes the global ~/.codex/hooks.json (the CLI and VS Code Terminal use this too).
 *   2. A background app-server process, managed by a LaunchAgent, that Desktop is pointed
 *      at instead of the private process it would otherwise spawn for itself.
 *   3. A disabled stub for [mcp_servers.codex_app] in ~/.codex/config.toml — without this,
 *      Desktop crashes on that external connection with "invalid transport in
 *      mcp_servers.codex_app" (a confirmed upstream Codex issue, not an Intentos bug).
 *   4. A second LaunchAgent that, on every login, sets the required environment variable,
 *      waits for the app-server to actually answer healthy (not just "started"), and only
 *      then launches Desktop — correcting for macOS's own session-restore racing ahead of us.
 *
 * IMPORTANT — what this trades away: disabling the codex_app stub above also disables
 * Desktop's own automation features (Scheduled tasks' underlying create_thread/
 * automation_update tools, if they depend on it — this was not fully characterized in
 * testing). Everyday chat, file actions, and approvals are unaffected.
 *
 * This installs two background services (LaunchAgents) that run at every login. Nothing
 * here is hidden — see the printed summary at the end, and uninstall-codex-desktop.sh to
 * remove everything this script adds.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, appendFileSync, copyFileSync } from "node:fs";
import { homedir, hostname, platform } from "node:os";
import { join } from "node:path";
import { execFile, execFileSync } from "node:child_process";

if (platform() !== "darwin") {
  console.error("The ChatGPT Desktop connector currently only supports macOS.");
  process.exit(1);
}

const DASHBOARD_URL = process.env.INTENTOS_DASHBOARD_URL || "https://intentos-ecru.vercel.app";
const API_URL = process.env.INTENTOS_API_URL || "https://intentos-cqn3.onrender.com";
const APP_SERVER_PORT = 45789;
const APP_SERVER_WS_URL = `ws://127.0.0.1:${APP_SERVER_PORT}`;

const HOME = homedir();
const INTENTOS_DIR = join(HOME, ".intentos");
const HOOKS_DIR = join(INTENTOS_DIR, "hooks");
const SCRIPTS_DIR = join(INTENTOS_DIR, "scripts");
const LOGS_DIR = join(INTENTOS_DIR, "logs");
const CODEX_DIR = join(HOME, ".codex");
const CODEX_HOOKS_FILE = join(CODEX_DIR, "hooks.json");
const CODEX_CONFIG_FILE = join(CODEX_DIR, "config.toml");
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");

function openBrowser(url) {
  execFile("open", [url], () => {});
}

async function downloadTo(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  writeFileSync(path, await res.text());
}

function mergeHookBlock(existing, token) {
  const HOOK_CMD = `sh -c 'INTENTOS_TOKEN=${token} node ${join(HOOKS_DIR, "intentos-hook.mjs")} codex'`;
  const HOOK_CMD_REVIEW = `sh -c 'INTENTOS_TOKEN=${token} INTENTOS_REVIEW_POLL_BUDGET_MS=3540000 node ${join(HOOKS_DIR, "intentos-hook.mjs")} codex'`;
  const block = (command, timeout) => ({ hooks: [{ type: "command", command, timeout }] });
  const settings = existing && typeof existing === "object" ? { ...existing } : {};
  settings.hooks = settings.hooks && typeof settings.hooks === "object" ? { ...settings.hooks } : {};
  const alreadyWired = (eventName) =>
    Array.isArray(settings.hooks[eventName]) &&
    settings.hooks[eventName].some((group) =>
      (group.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes("intentos-hook.mjs"))
    );
  const events = {
    SessionStart: { command: HOOK_CMD, timeout: 15 },
    UserPromptSubmit: { command: HOOK_CMD, timeout: 15 },
    PreToolUse: { command: HOOK_CMD_REVIEW, timeout: 3600, matcher: ".*" },
    PostToolUse: { command: HOOK_CMD, timeout: 15, matcher: ".*" },
    SessionEnd: { command: HOOK_CMD, timeout: 3 },
  };
  for (const [event, cfg] of Object.entries(events)) {
    if (alreadyWired(event)) continue;
    const entry = block(cfg.command, cfg.timeout);
    if (cfg.matcher) entry.matcher = cfg.matcher;
    settings.hooks[event] = Array.isArray(settings.hooks[event]) ? [...settings.hooks[event], entry] : [entry];
  }
  return settings;
}

/** Text-level check/append — avoids needing a TOML parser dependency for one narrow, known-safe edit. */
function ensureCodexAppStub() {
  mkdirSync(CODEX_DIR, { recursive: true });
  if (!existsSync(CODEX_CONFIG_FILE)) {
    writeFileSync(CODEX_CONFIG_FILE, "");
  }
  const current = readFileSync(CODEX_CONFIG_FILE, "utf8");
  if (current.includes("[mcp_servers.codex_app]")) {
    console.log("✓ config.toml already has a [mcp_servers.codex_app] entry — leaving it untouched");
    return;
  }
  copyFileSync(CODEX_CONFIG_FILE, `${CODEX_CONFIG_FILE}.backup-${Date.now()}`);
  appendFileSync(
    CODEX_CONFIG_FILE,
    `\n[mcp_servers.codex_app]\ncommand = "/usr/bin/true"\nenabled = false\n`
  );
  console.log("✓ Added the required [mcp_servers.codex_app] stub to ~/.codex/config.toml (backup saved alongside it)");
}

function writeOrchestratorScript() {
  mkdirSync(SCRIPTS_DIR, { recursive: true });
  mkdirSync(LOGS_DIR, { recursive: true });
  const scriptPath = join(SCRIPTS_DIR, "launch-desktop-ordered.sh");
  const log = join(LOGS_DIR, "desktop-launcher.log");
  writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu
WS_URL="${APP_SERVER_WS_URL}"
HEALTHZ_URL="http://127.0.0.1:${APP_SERVER_PORT}/healthz"
LOG="${log}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

log "=== startup orchestrator running ==="
/bin/launchctl setenv CODEX_APP_SERVER_WS_URL "$WS_URL"
log "env var set"

i=0
until /usr/bin/curl -s -o /dev/null -w "%{http_code}" "$HEALTHZ_URL" 2>/dev/null | grep -q "^200$"; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    log "ERROR: app-server never became healthy after 30s — aborting"
    exit 1
  fi
  sleep 1
done
log "app-server healthy after \${i}s"

if /usr/bin/pgrep -f "ChatGPT.app/Contents/MacOS/ChatGPT" >/dev/null 2>&1; then
  log "ChatGPT already running (session restore) — quitting before relaunch"
  /usr/bin/osascript -e 'quit app "ChatGPT"' >/dev/null 2>&1 || true
  j=0
  while /usr/bin/pgrep -f "ChatGPT.app/Contents/MacOS/ChatGPT" >/dev/null 2>&1; do
    j=$((j + 1))
    [ "$j" -ge 15 ] && break
    sleep 1
  done
fi

log "launching ChatGPT Desktop"
/usr/bin/open -a "ChatGPT"
log "=== orchestrator complete ==="
`
  );
  execFileSync("chmod", ["+x", scriptPath]);
  console.log("✓ Orchestrator script installed to ~/.intentos/scripts");
  return scriptPath;
}

function writeLaunchAgents(scriptPath) {
  mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });

  const appServerPlist = join(LAUNCH_AGENTS_DIR, "com.intentos.codex-appserver.plist");
  writeFileSync(
    appServerPlist,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.intentos.codex-appserver</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/node</string>
    <string>/opt/homebrew/lib/node_modules/@openai/codex/bin/codex.js</string>
    <string>app-server</string>
    <string>--listen</string>
    <string>${APP_SERVER_WS_URL}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${join(LOGS_DIR, "codex-appserver.log")}</string>
  <key>StandardErrorPath</key><string>${join(LOGS_DIR, "codex-appserver.err.log")}</string>
  <key>ProcessType</key><string>Interactive</string>
</dict>
</plist>
`
  );

  const launcherPlist = join(LAUNCH_AGENTS_DIR, "com.intentos.codex-desktop-launcher.plist");
  writeFileSync(
    launcherPlist,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.intentos.codex-desktop-launcher</string>
  <key>ProgramArguments</key>
  <array><string>/bin/sh</string><string>${scriptPath}</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><false/>
  <key>StandardOutPath</key><string>${join(LOGS_DIR, "codex-desktop-launcher.log")}</string>
  <key>StandardErrorPath</key><string>${join(LOGS_DIR, "codex-desktop-launcher.err.log")}</string>
</dict>
</plist>
`
  );

  const uid = execFileSync("id", ["-u"], { encoding: "utf8" }).trim();
  for (const label of ["com.intentos.codex-appserver", "com.intentos.codex-desktop-launcher"]) {
    try {
      execFileSync("launchctl", ["bootout", `gui/${uid}/${label}`], { stdio: "ignore" });
    } catch {
      /* not loaded yet — fine */
    }
  }
  execFileSync("launchctl", ["bootstrap", `gui/${uid}`, appServerPlist]);
  execFileSync("launchctl", ["bootstrap", `gui/${uid}`, launcherPlist]);
  console.log("✓ LaunchAgents installed and running (app-server + login launcher)");
}

async function main() {
  console.log("Intentos — connecting ChatGPT Desktop (Codex)…\n");

  mkdirSync(HOOKS_DIR, { recursive: true });
  await downloadTo(`${DASHBOARD_URL}/hooks/intentos-hook.mjs`, join(HOOKS_DIR, "intentos-hook.mjs"));
  await downloadTo(`${DASHBOARD_URL}/hooks/project-identity.mjs`, join(HOOKS_DIR, "project-identity.mjs"));
  console.log("✓ Connector installed to ~/.intentos/hooks");

  const startRes = await fetch(`${API_URL}/v1/devices/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_type: "codex", hostname: `${hostname()} (Desktop)` }),
  });
  if (!startRes.ok) throw new Error(`Could not start device connection (${startRes.status})`);
  const { device_code, user_code, interval } = await startRes.json();

  const approveUrl = `${DASHBOARD_URL}/connect?code=${encodeURIComponent(user_code)}`;
  console.log(`\nYour connection code: ${user_code}`);
  console.log(`Opening your browser to approve this device: ${approveUrl}\n`);
  openBrowser(approveUrl);

  console.log("Waiting for approval…");
  const deadline = Date.now() + 10 * 60 * 1000;
  let token = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, (interval || 3) * 1000));
    const pollRes = await fetch(`${API_URL}/v1/devices/poll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code }),
    });
    const body = await pollRes.json();
    if (body.status === "approved" && body.token) {
      token = body.token;
      break;
    }
    if (body.status === "denied") {
      console.error("\nConnection was denied from the dashboard. Nothing was connected.");
      process.exit(1);
    }
    if (body.status === "expired") {
      console.error("\nCode expired before it was approved. Run this installer again.");
      process.exit(1);
    }
  }
  if (!token) {
    console.error("\nTimed out waiting for approval. Run this installer again.");
    process.exit(1);
  }
  console.log("✓ Device approved");

  const existingHooks = existsSync(CODEX_HOOKS_FILE) ? JSON.parse(readFileSync(CODEX_HOOKS_FILE, "utf8")) : {};
  writeFileSync(CODEX_HOOKS_FILE, JSON.stringify(mergeHookBlock(existingHooks, token), null, 2));
  console.log("✓ Codex global hooks updated (~/.codex/hooks.json)");

  ensureCodexAppStub();
  const scriptPath = writeOrchestratorScript();
  writeLaunchAgents(scriptPath);

  console.log(
    "\nChatGPT Desktop is now connected. What changed on this Mac:\n" +
    "  • Two background services (LaunchAgents) run at every login — the governed Codex\n" +
    "    app-server, and a launcher that starts Desktop only after it's confirmed healthy.\n" +
    "  • ~/.codex/config.toml has one added entry disabling Desktop's own automation tools\n" +
    "    (Scheduled tasks' automation — everyday chat and file actions are unaffected).\n" +
    "  • Quit and reopen ChatGPT Desktop now (or just wait for next login) to connect.\n" +
    "\nTo remove all of this later: curl -fsSL " + DASHBOARD_URL + "/uninstall-codex-desktop.sh | bash"
  );
}

main().catch((err) => {
  console.error(`\nIntentos connector failed: ${err.message}`);
  process.exit(1);
});
