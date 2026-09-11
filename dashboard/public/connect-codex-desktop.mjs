#!/usr/bin/env node
/**
 * Intentos Codex connector installer — CLI, VS Code integrated terminal, and Codex inside
 * ChatGPT Desktop, all from one run. Supports macOS and Windows.
 *
 * Run via: curl -fsSL <dashboard>/install-codex-desktop.sh | bash
 *
 * Always does, on every platform:
 *   1. Downloads the shared hook script, runs device approval, writes the global
 *      ~/.codex/hooks.json — this alone governs the `codex` CLI and VS Code's integrated
 *      terminal, since both run the identical binary and read the same config file.
 *
 * On macOS and Windows, additionally sets up governance for Codex running inside ChatGPT
 * Desktop, since Desktop runs Codex through its OWN app-server process rather than reading
 * hooks.json directly:
 *   2. A background app-server process, kept running via a per-user startup service (a
 *      LaunchAgent on macOS, a Startup-folder script on Windows), that Desktop is pointed at
 *      instead of the private process it would otherwise spawn for itself.
 *   3. A disabled stub for [mcp_servers.codex_app] in ~/.codex/config.toml — without this,
 *      Desktop crashes on that external connection with "invalid transport in
 *      mcp_servers.codex_app" (a confirmed upstream Codex issue, not an Intentos bug). This
 *      also turns off some of Desktop's own built-in automation tools — everyday chat and
 *      file actions are unaffected.
 *   4. A second startup script that, on every login, sets the required environment variable,
 *      waits for the app-server to actually answer healthy (not just "started"), and only
 *      then launches Desktop — correcting for the OS's own session-restore racing ahead of us.
 *
 * On Linux, steps 2-4 are skipped with a printed note — CLI/VS Code governance from step 1
 * still applies. The dedicated Codex VS Code EXTENSION panel (distinct from just using VS
 * Code's terminal) is not covered by anything here on any platform — untested, not claimed
 * as certified.
 *
 * WINDOWS NOTE: the mechanism (app-server + hooks.json + the trust stub) is the same proven
 * design as macOS. The one piece that could not be verified end-to-end here (no Windows
 * machine to test against) is the exact command that (re)launches the ChatGPT Desktop app —
 * it's attempted via `start ChatGPT.exe`, and the installer prints a clear fallback if that
 * doesn't find it. Everything else is unconditional, tested Node/Windows API usage.
 *
 * This installs background services that run at every login. Nothing here is hidden — see
 * the printed summary at the end, and uninstall-codex-desktop.sh to remove everything this
 * script adds (macOS today; Windows removal steps are printed at install time).
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, appendFileSync, copyFileSync } from "node:fs";
import { homedir, hostname, platform } from "node:os";
import { join } from "node:path";
import { execFile, execFileSync, spawn } from "node:child_process";

const IS_MACOS = platform() === "darwin";
const IS_WINDOWS = platform() === "win32";
const SUPPORTS_DESKTOP = IS_MACOS || IS_WINDOWS;

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
const WINDOWS_STARTUP_DIR = process.env.APPDATA
  ? join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
  : null;

function openBrowser(url) {
  const cmd = IS_MACOS ? "open" : IS_WINDOWS ? "start" : "xdg-open";
  execFile(cmd, IS_WINDOWS ? ["", url] : [url], { shell: IS_WINDOWS }, () => {});
}

async function downloadTo(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  writeFileSync(path, await res.text());
}

function mergeHookBlock(existing, token) {
  const nodeCmd = IS_WINDOWS
    ? `set INTENTOS_TOKEN=${token}&& node "${join(HOOKS_DIR, "intentos-hook.mjs")}" codex`
    : `sh -c 'INTENTOS_TOKEN=${token} node ${join(HOOKS_DIR, "intentos-hook.mjs")} codex'`;
  const reviewCmd = IS_WINDOWS
    ? `set INTENTOS_TOKEN=${token}&& set INTENTOS_REVIEW_POLL_BUDGET_MS=3540000&& node "${join(HOOKS_DIR, "intentos-hook.mjs")}" codex`
    : `sh -c 'INTENTOS_TOKEN=${token} INTENTOS_REVIEW_POLL_BUDGET_MS=3540000 node ${join(HOOKS_DIR, "intentos-hook.mjs")} codex'`;
  const block = (command, timeout) => ({ hooks: [{ type: "command", command, timeout }] });
  const settings = existing && typeof existing === "object" ? { ...existing } : {};
  settings.hooks = settings.hooks && typeof settings.hooks === "object" ? { ...settings.hooks } : {};
  // Strip any PRIOR Intentos entry for this event first, then add the current one — a fresh
  // install (new token, new scope) must replace stale wiring, not silently keep whatever
  // token happened to be there before. Any non-Intentos hooks the user added for other
  // purposes are left untouched.
  const stripStale = (eventName) => {
    if (!Array.isArray(settings.hooks[eventName])) return [];
    return settings.hooks[eventName].filter(
      (group) => !(group.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes("intentos-hook.mjs"))
    );
  };
  const events = {
    SessionStart: { command: nodeCmd, timeout: 15 },
    UserPromptSubmit: { command: nodeCmd, timeout: 15 },
    PreToolUse: { command: reviewCmd, timeout: 3600, matcher: ".*" },
    PostToolUse: { command: nodeCmd, timeout: 15, matcher: ".*" },
    SessionEnd: { command: nodeCmd, timeout: 3 },
  };
  for (const [event, cfg] of Object.entries(events)) {
    const entry = block(cfg.command, cfg.timeout);
    if (cfg.matcher) entry.matcher = cfg.matcher;
    settings.hooks[event] = [...stripStale(event), entry];
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
  const stubCommand = IS_WINDOWS ? "cmd /c exit 0" : "/usr/bin/true";
  appendFileSync(
    CODEX_CONFIG_FILE,
    `\n[mcp_servers.codex_app]\ncommand = "${stubCommand}"\nenabled = false\n`
  );
  console.log("✓ Added the required [mcp_servers.codex_app] stub to ~/.codex/config.toml (backup saved alongside it)");
}

// ---------------------------------------------------------------------------
// macOS: LaunchAgents (proven, tested end-to-end this session, including reboot survival)
// ---------------------------------------------------------------------------

function macWriteOrchestratorScript() {
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

function macWriteLaunchAgents(scriptPath) {
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

// ---------------------------------------------------------------------------
// Windows: per-user Startup-folder scripts (no admin rights, no Task Scheduler needed).
// Same design as macOS — a persistent app-server loop, plus a launcher that waits for it
// to be healthy before (re)starting Desktop. Relaunching ChatGPT.exe specifically is the
// one piece not verified against a real Windows machine — see the module doc comment.
// ---------------------------------------------------------------------------

function winWriteStartupScripts() {
  if (!WINDOWS_STARTUP_DIR) {
    throw new Error("Could not resolve the Windows Startup folder (%APPDATA% is not set)");
  }
  mkdirSync(SCRIPTS_DIR, { recursive: true });
  mkdirSync(LOGS_DIR, { recursive: true });
  mkdirSync(WINDOWS_STARTUP_DIR, { recursive: true });

  const appServerLog = join(LOGS_DIR, "codex-appserver.log");
  const appServerScript = join(SCRIPTS_DIR, "intentos-codex-appserver.bat");
  writeFileSync(
    appServerScript,
    `@echo off\r
:loop\r
codex app-server --listen ${APP_SERVER_WS_URL} >> "${appServerLog}" 2>&1\r
timeout /t 2 /nobreak >nul\r
goto loop\r
`
  );

  const launcherLog = join(LOGS_DIR, "desktop-launcher.log");
  const launcherScript = join(SCRIPTS_DIR, "intentos-codex-desktop-launcher.bat");
  writeFileSync(
    launcherScript,
    `@echo off\r
setx CODEX_APP_SERVER_WS_URL "${APP_SERVER_WS_URL}" >nul\r
echo %date% %time% orchestrator running >> "${launcherLog}"\r
set /a i=0\r
:waitloop\r
for /f %%c in ('curl -s -o nul -w "%%{http_code}" http://127.0.0.1:${APP_SERVER_PORT}/healthz 2^>nul') do set HEALTH=%%c\r
if "%HEALTH%"=="200" goto healthy\r
set /a i+=1\r
if %i% geq 30 (\r
  echo %date% %time% ERROR: app-server never became healthy >> "${launcherLog}"\r
  exit /b 1\r
)\r
timeout /t 1 /nobreak >nul\r
goto waitloop\r
:healthy\r
echo %date% %time% app-server healthy >> "${launcherLog}"\r
taskkill /IM ChatGPT.exe /F >nul 2>&1\r
timeout /t 2 /nobreak >nul\r
start "" "ChatGPT.exe"\r
echo %date% %time% launch attempted (start ChatGPT.exe) >> "${launcherLog}"\r
`
  );

  // Copies into the Startup folder run automatically at every login — the standard,
  // no-admin-rights Windows mechanism, equivalent in spirit to a macOS LaunchAgent.
  copyFileSync(appServerScript, join(WINDOWS_STARTUP_DIR, "IntentosCodexAppServer.bat"));
  copyFileSync(launcherScript, join(WINDOWS_STARTUP_DIR, "IntentosCodexDesktopLauncher.bat"));
  console.log("✓ Startup scripts installed to the Windows Startup folder");

  // Start the app-server loop immediately too, so this machine doesn't need a fresh login
  // before governance is live — spawned detached so it survives after this installer exits.
  const child = spawn("cmd.exe", ["/c", appServerScript], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  console.log("✓ App-server started for this session");
}

async function main() {
  console.log(
    `Intentos — connecting Codex (CLI / VS Code${SUPPORTS_DESKTOP ? " / Codex inside ChatGPT Desktop" : ""})…\n`
  );

  mkdirSync(HOOKS_DIR, { recursive: true });
  await downloadTo(`${DASHBOARD_URL}/hooks/intentos-hook.mjs`, join(HOOKS_DIR, "intentos-hook.mjs"));
  await downloadTo(`${DASHBOARD_URL}/hooks/project-identity.mjs`, join(HOOKS_DIR, "project-identity.mjs"));
  console.log("✓ Connector installed to ~/.intentos/hooks");

  // Set on the Integrations page before this command is generated — see the include/exclude
  // step there. Baked into the token at approval time; "all" (the default) preserves the
  // exact prior behavior for anyone running an older, bare install command.
  const scopeMode = process.env.INTENTOS_SCOPE_MODE || "all";
  const scopeProjects = (process.env.INTENTOS_SCOPE_PROJECTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const startRes = await fetch(`${API_URL}/v1/devices/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_type: "codex",
      hostname: hostname(),
      scope_mode: scopeMode,
      scope_projects: scopeProjects,
    }),
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
  console.log("✓ Codex global hooks updated (~/.codex/hooks.json) — governs the CLI and VS Code's integrated terminal");

  if (!SUPPORTS_DESKTOP) {
    console.log(
      "\nCodex CLI / VS Code Terminal is connected. Governing Codex inside ChatGPT Desktop is only\n" +
      "supported on macOS and Windows, and was skipped on this platform — everything else above is\n" +
      "active. Open `codex` in any project to try it; the first real action may prompt a one-time\n" +
      "trust approval for the changed hooks.json."
    );
    return;
  }

  ensureCodexAppStub();
  if (IS_MACOS) {
    const scriptPath = macWriteOrchestratorScript();
    macWriteLaunchAgents(scriptPath);
  } else {
    winWriteStartupScripts();
  }

  console.log(
    "\nCodex is now connected — CLI, VS Code's integrated terminal, and Codex inside ChatGPT Desktop.\n" +
    "What changed on this machine:\n" +
    (IS_MACOS
      ? "  • Two background services (LaunchAgents) run at every login — the governed Codex\n" +
        "    app-server, and a launcher that starts Desktop only after it's confirmed healthy.\n"
      : "  • Two scripts run at every login (Windows Startup folder) — the governed Codex\n" +
        "    app-server, and a launcher that restarts Desktop once it's confirmed healthy.\n" +
        "    If Desktop doesn't relaunch automatically the first time, open it manually once —\n" +
        "    it will pick up the governed connection from then on.\n") +
    "  • ~/.codex/config.toml has one added entry that's required for the external connection\n" +
    "    to work, and also turns off some of Desktop's own built-in automation tools —\n" +
    "    everyday chat and file actions are unaffected.\n" +
    "  • Quit and reopen ChatGPT Desktop now (or just wait for next login) to connect.\n" +
    (IS_MACOS
      ? "\nTo remove all of this later: curl -fsSL " + DASHBOARD_URL + "/uninstall-codex-desktop.sh | bash"
      : "\nTo remove all of this later:\n" +
        `  1. Delete "IntentosCodexAppServer.bat" and "IntentosCodexDesktopLauncher.bat" from:\n` +
        `     ${WINDOWS_STARTUP_DIR}\n` +
        "  2. Run: setx CODEX_APP_SERVER_WS_URL \"\"  (clears the environment variable)\n" +
        "  3. Remove the [mcp_servers.codex_app] section from ~/.codex/config.toml (a backup\n" +
        "     copy was saved alongside it before this installer changed it)\n" +
        "  4. Restart ChatGPT Desktop — it goes back to its own default private connection.")
  );
}

main().catch((err) => {
  console.error(`\nIntentos connector failed: ${err.message}`);
  process.exit(1);
});
