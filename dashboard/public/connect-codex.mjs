#!/usr/bin/env node
/**
 * Intentos Codex CLI / VS Code Terminal connector installer.
 *
 * Run via: curl -fsSL <dashboard>/install-codex.sh | bash
 * (install-codex.sh downloads this file and runs it with node.)
 *
 * Does three things, in order:
 *   1. Downloads the shared hook script + project-identity helper to ~/.intentos/hooks/.
 *   2. Runs a device-authorization handshake (RFC 8628 style) against the Intentos API:
 *      starts a code, opens the browser to approve it, polls until a real agent token
 *      is issued — the human never sees or copies a token.
 *   3. Merges ~/.codex/hooks.json (Codex's GLOBAL hook config, read by the `codex` CLI and
 *      by VS Code's integrated terminal, since both run the same underlying binary) so every
 *      project on this machine is governed automatically, with no per-project setup.
 *
 * This does NOT cover ChatGPT Desktop — Desktop runs Codex through its own app-server
 * process rather than reading this file the same way. Use install-codex-desktop.sh for that.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";

const DASHBOARD_URL = process.env.INTENTOS_DASHBOARD_URL || "https://intentos-ecru.vercel.app";
const API_URL = process.env.INTENTOS_API_URL || "https://intentos-cqn3.onrender.com";

const INTENTOS_DIR = join(homedir(), ".intentos");
const HOOKS_DIR = join(INTENTOS_DIR, "hooks");
const CODEX_DIR = join(homedir(), ".codex");
const CODEX_HOOKS_FILE = join(CODEX_DIR, "hooks.json");

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  execFile(cmd, platform === "win32" ? ["", url] : [url], () => {});
}

async function downloadTo(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  writeFileSync(path, await res.text());
}

/**
 * Codex's hook file uses PascalCase event names identical to Claude Code's, but each
 * command must pass "codex" as the host argument (not "claude-code") — that argument is
 * what makes intentos-hook.mjs resolve the ~/.codex token path and format output the way
 * codex-cli 0.153.4 actually accepts (confirmed live: it rejects permissionDecision:"allow",
 * so the shared hook sends empty output for allow instead — see intentos-hook.mjs comments).
 */
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
    SessionEnd: { command: HOOK_CMD, timeout: 3 }, // Codex clamps SessionEnd hooks above 3s
  };

  for (const [event, cfg] of Object.entries(events)) {
    if (alreadyWired(event)) continue;
    const entry = block(cfg.command, cfg.timeout);
    if (cfg.matcher) entry.matcher = cfg.matcher;
    settings.hooks[event] = Array.isArray(settings.hooks[event]) ? [...settings.hooks[event], entry] : [entry];
  }
  return settings;
}

async function main() {
  console.log("Intentos — connecting Codex (CLI / VS Code Terminal)…\n");

  mkdirSync(HOOKS_DIR, { recursive: true });
  await downloadTo(`${DASHBOARD_URL}/hooks/intentos-hook.mjs`, join(HOOKS_DIR, "intentos-hook.mjs"));
  await downloadTo(`${DASHBOARD_URL}/hooks/project-identity.mjs`, join(HOOKS_DIR, "project-identity.mjs"));
  console.log("✓ Connector installed to ~/.intentos/hooks");

  const startRes = await fetch(`${API_URL}/v1/devices/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_type: "codex", hostname: hostname() }),
  });
  if (!startRes.ok) throw new Error(`Could not start device connection (${startRes.status})`);
  const { device_code, user_code, interval } = await startRes.json();

  const approveUrl = `${DASHBOARD_URL}/connect?code=${encodeURIComponent(user_code)}`;
  console.log(`\nYour connection code: ${user_code}`);
  console.log(`Opening your browser to approve this device: ${approveUrl}`);
  console.log("(If it doesn't open, copy that URL into any browser and sign in.)\n");
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

  mkdirSync(CODEX_DIR, { recursive: true });
  const existing = existsSync(CODEX_HOOKS_FILE) ? JSON.parse(readFileSync(CODEX_HOOKS_FILE, "utf8")) : {};
  writeFileSync(CODEX_HOOKS_FILE, JSON.stringify(mergeHookBlock(existing, token), null, 2));
  console.log("✓ Codex global hooks updated (~/.codex/hooks.json) — every project is now governed");

  console.log(
    "\nCodex CLI is connected. Open `codex` in any project to try it — the first real action\n" +
    "may prompt a one-time trust approval for the changed hooks.json; approve it once and it\n" +
    "will not ask again on this machine."
  );
}

main().catch((err) => {
  console.error(`\nIntentos connector failed: ${err.message}`);
  process.exit(1);
});
