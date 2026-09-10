#!/usr/bin/env node
/**
 * Intentos Claude Code connector installer.
 *
 * Run via: curl -fsSL <dashboard>/install.sh | bash
 * (install.sh downloads this file and runs it with node.)
 *
 * Does three things, in order:
 *   1. Downloads the shared hook script + project-identity helper to ~/.intentos/hooks/.
 *   2. Runs a device-authorization handshake (RFC 8628 style) against the Intentos API:
 *      starts a code, opens the browser to approve it, polls until a real agent token
 *      is issued — the human never sees or copies a token.
 *   3. Merges ~/.claude/settings.json (Claude Code's GLOBAL settings file, shared by the
 *      CLI and the VS Code extension) so every project on this machine is governed
 *      automatically, with no per-project setup.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";

const DASHBOARD_URL = process.env.INTENTOS_DASHBOARD_URL || "https://intentos-ecru.vercel.app";
const API_URL = process.env.INTENTOS_API_URL || "https://intentos-api.onrender.com";

const INTENTOS_DIR = join(homedir(), ".intentos");
const HOOKS_DIR = join(INTENTOS_DIR, "hooks");
const CLAUDE_DIR = join(homedir(), ".claude");
const CLAUDE_SETTINGS = join(CLAUDE_DIR, "settings.json");

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

function mergeHookBlock(existing) {
  const HOOK_CMD = `node ${join(HOOKS_DIR, "intentos-hook.mjs")} claude-code`;
  const block = (timeout, extraEnv) => ({
    hooks: [
      {
        type: "command",
        command: extraEnv ? `sh -c '${extraEnv} ${HOOK_CMD}'` : HOOK_CMD,
        timeout,
      },
    ],
  });
  const settings = existing && typeof existing === "object" ? { ...existing } : {};
  settings.hooks = settings.hooks && typeof settings.hooks === "object" ? { ...settings.hooks } : {};

  // Preserve any hooks the user already has for OTHER matchers/events; only add ours if
  // an Intentos hook isn't already present for that event (idempotent re-install).
  const alreadyWired = (eventName) =>
    Array.isArray(settings.hooks[eventName]) &&
    settings.hooks[eventName].some((group) =>
      (group.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes("intentos-hook.mjs"))
    );

  for (const [event, cfg] of Object.entries({
    SessionStart: { timeout: 15 },
    UserPromptSubmit: { timeout: 15 },
    PreToolUse: { timeout: 3600, matcher: ".*", extraEnv: "INTENTOS_REVIEW_POLL_BUDGET_MS=3540000" },
    PostToolUse: { timeout: 15, matcher: ".*" },
    SessionEnd: { timeout: 15 },
  })) {
    if (alreadyWired(event)) continue;
    const entry = { ...block(cfg.timeout, cfg.extraEnv) };
    if (cfg.matcher) entry.matcher = cfg.matcher;
    settings.hooks[event] = Array.isArray(settings.hooks[event]) ? [...settings.hooks[event], entry] : [entry];
  }
  return settings;
}

async function main() {
  console.log("Intentos — connecting Claude Code…\n");

  mkdirSync(HOOKS_DIR, { recursive: true });
  await downloadTo(`${DASHBOARD_URL}/hooks/intentos-hook.mjs`, join(HOOKS_DIR, "intentos-hook.mjs"));
  await downloadTo(`${DASHBOARD_URL}/hooks/project-identity.mjs`, join(HOOKS_DIR, "project-identity.mjs"));
  console.log("✓ Connector installed to ~/.intentos/hooks");

  const startRes = await fetch(`${API_URL}/v1/devices/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_type: "claude-code", hostname: hostname() }),
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

  writeFileSync(join(INTENTOS_DIR, "token"), token, { mode: 0o600 });
  chmodSync(join(INTENTOS_DIR, "token"), 0o600);
  writeFileSync(join(INTENTOS_DIR, "config.json"), JSON.stringify({ api_url: API_URL }, null, 2));
  console.log("✓ Device approved — credential stored at ~/.intentos/token (not shown, not copy-pasted)");

  mkdirSync(CLAUDE_DIR, { recursive: true });
  const existing = existsSync(CLAUDE_SETTINGS) ? JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")) : {};
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(mergeHookBlock(existing), null, 2));
  console.log("✓ Claude Code global settings updated (~/.claude/settings.json) — every project is now governed");

  console.log("\nClaude Code is connected. Open Claude Code in any project to try it.");
}

main().catch((err) => {
  console.error(`\nIntentos connector failed: ${err.message}`);
  process.exit(1);
});
