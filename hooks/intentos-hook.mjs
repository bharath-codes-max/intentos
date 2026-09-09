#!/usr/bin/env node
/**
 * Shared Intentos hook for Codex (and, for the PreToolUse/permission path, other hosts
 * with the same shape: Claude Code, Cursor, GitHub Copilot).
 *
 * Two responsibilities that must stay separate:
 *   1. GOVERNANCE (PreToolUse) — calls /v1/check, returns allow/deny to the host.
 *      This is the proven, tested path (.env → BLOCK, delete → REVIEW) and its
 *      behavior here is UNCHANGED from before Agent Activity existed.
 *   2. AGENT ACTIVITY (SessionStart / UserPromptSubmit / PostToolUse / SessionEnd) —
 *      purely observational. A failure in any of these must never affect whether
 *      PreToolUse allows or blocks anything.
 *
 * Token resolution (in order): INTENTOS_TOKEN env var, then a per-project
 * .codex/.intentos-token file, then ~/.codex/intentos-token — the last two keep the
 * long-lived secret out of hooks.json (which projects DO commit) so it never ends up
 * in a repo by accident. INTENTOS_API_URL env var defaults to http://localhost:4000.
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOST = process.argv[2];
const VALID_HOSTS = ["claude-code", "cursor", "github-copilot", "codex"];

if (!VALID_HOSTS.includes(HOST)) {
  console.error(`Usage: intentos-hook.mjs <${VALID_HOSTS.join("|")}>`);
  process.exit(1);
}

function resolveToken() {
  if (process.env.INTENTOS_TOKEN) return process.env.INTENTOS_TOKEN.trim();
  const candidates = [join(process.cwd(), ".codex", ".intentos-token"), join(homedir(), ".codex", "intentos-token")];
  for (const path of candidates) {
    if (existsSync(path)) return readFileSync(path, "utf8").trim();
  }
  return null;
}

const API_URL = process.env.INTENTOS_API_URL || "http://localhost:4000";
const TOKEN = resolveToken();

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function post(path, body) {
  if (!TOKEN) throw new Error("No Intentos token found (checked INTENTOS_TOKEN, .codex/.intentos-token, ~/.codex/intentos-token)");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Intentos API ${path} returned ${res.status}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Intentos API ${path} returned ${res.status}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * REVIEW keeps this PreToolUse call itself open (this is the ONLY way the same exec_command
 * later actually runs without the user re-typing anything — see intentos-live's approval-resume
 * design notes). No suspend/resume RPC exists in installed codex-cli 0.153.4's PreToolUse or
 * PermissionRequest hook events (both are documented as synchronous/blocking, confirmed against
 * codex-rs/hooks/src/engine/mod.rs) — so "resuming" a blocked call is not a real capability to
 * invoke; the only lever is to not respond yet. The hook's own configured timeout (hooks.json)
 * is the hard ceiling; INTENTOS_REVIEW_POLL_BUDGET_MS must stay safely under it so this process
 * still has time to flush its response before Codex kills it. Polling (not a webhook/push) because
 * this process has no reachable inbound address — it's a short-lived child of the host.
 */
async function pollForReviewResolution(decisionId) {
  const budgetMs = Number(process.env.INTENTOS_REVIEW_POLL_BUDGET_MS) || 8000;
  const intervalMs = 800;
  const deadline = Date.now() + budgetMs;

  while (Date.now() < deadline) {
    await sleep(intervalMs);
    let status;
    try {
      status = await get(`/v1/decisions/${decisionId}/status`);
    } catch {
      continue; // transient network hiccup — keep polling within budget rather than failing the whole check
    }
    if (status.approval_status === "approved") {
      return { decision: "allow", reason: "Approved by reviewer." };
    }
    if (status.approval_status === "denied") {
      return { decision: "block", reason: `Denied by reviewer. ${status.reason ?? ""}`.trim() };
    }
    if (status.approval_status === "expired") {
      return { decision: "block", reason: "Approval window expired before a reviewer responded." };
    }
    // still 'pending' — keep polling
  }
  return { decision: "block", reason: "Timed out waiting for reviewer approval." };
}

function normalizeToolCall(parsed) {
  const tool_name = parsed.tool_name ?? parsed.toolName ?? "unknown";
  const tool_input = parsed.tool_input ?? parsed.toolArgs ?? {};
  return { tool_name, tool_input };
}

/**
 * REVIEW verdicts are deliberately denied at the hook, not turned into the host's
 * local "ask" prompt — "ask" would let the same developer sitting at the keyboard
 * approve their own action, defeating the point of routing it to a separate
 * reviewer in the Intentos dashboard.
 */
function formatForHost(host, decision, reason) {
  const deny = decision === "block" || decision === "review";
  const finalReason =
    decision === "review"
      ? `Requires approval — routed to your Intentos dashboard reviewer. ${reason}`
      : reason;

  switch (host) {
    case "claude-code":
      return {
        exitCode: deny ? 2 : 0,
        stdout: JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: deny ? "deny" : "allow",
            ...(deny ? { permissionDecisionReason: finalReason } : {}),
          },
        }),
        stderr: deny ? finalReason : "",
      };
    case "codex":
      // The installed codex-cli (0.153.4) rejects permissionDecision:"allow" as unsupported
      // (confirmed live: "PreToolUse hook returned unsupported permissionDecision:allow") —
      // GitHub's current source lists "allow" as valid, but that's ahead of this release.
      // Sending nothing at all for the allow case (exit 0, empty stdout) avoids relying on
      // whatever this version does when a hook errors, and is unambiguous either way.
      return deny
        ? {
            exitCode: 2,
            stdout: JSON.stringify({
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: finalReason,
              },
            }),
            stderr: finalReason,
          }
        : { exitCode: 0, stdout: "", stderr: "" };
    case "cursor":
      return {
        exitCode: deny ? 2 : 0,
        stdout: JSON.stringify({
          permission: deny ? "deny" : "allow",
          ...(deny ? { user_message: finalReason } : {}),
        }),
        stderr: deny ? finalReason : "",
      };
    case "github-copilot":
      return {
        exitCode: deny ? 2 : 0,
        stdout: JSON.stringify({
          permissionDecision: deny ? "deny" : "allow",
          ...(deny ? { permissionDecisionReason: finalReason } : {}),
        }),
        stderr: deny ? finalReason : "",
      };
    default:
      throw new Error(`Unhandled host: ${host}`);
  }
}

/**
 * process.exit() right after a stream write can truncate the write before it
 * reaches the pipe — the host then sees empty/malformed JSON and may treat
 * that as "no decision, proceed", silently turning a block into an allow.
 * Waiting for each write's callback (or draining) guarantees the bytes are
 * flushed before the process actually exits.
 */
function exitWithOutput(stdout, stderr, exitCode) {
  return new Promise((resolve) => {
    let pending = 0;
    const done = () => {
      if (--pending <= 0) {
        process.exitCode = exitCode;
        resolve();
      }
    };
    if (stdout) {
      pending++;
      process.stdout.write(stdout, () => done());
      process.stdout.once("error", () => done());
    }
    if (stderr) {
      pending++;
      process.stderr.write(stderr, () => done());
      process.stderr.once("error", () => done());
    }
    if (pending === 0) {
      process.exitCode = exitCode;
      resolve();
    }
  });
}

/** Best-effort: Agent Activity lifecycle calls never gate the host, so any failure just exits 0. */
async function bestEffort(fn) {
  try {
    await fn();
  } catch (err) {
    process.stderr.write(`Intentos activity logging error (non-blocking): ${err.message}\n`);
  }
  process.exitCode = 0;
}

/**
 * Codex's real PostToolUse does NOT expose a structured exit code to hooks — confirmed by
 * capturing an actual failed `npm test` run: tool_response was a plain string of raw
 * stdout/stderr text, not an object with exit_code/success fields. So "failed" here is a
 * text heuristic over that raw output, not a true exit-code check — documented as such,
 * not claimed as more than it is. tool_response may also arrive as an object on other
 * tools, so both shapes are handled.
 */
function deriveExecutionResult(toolResponse) {
  if (toolResponse == null) return { status: "executed" };

  const text = typeof toolResponse === "string" ? toolResponse : typeof toolResponse === "object" ? JSON.stringify(toolResponse) : String(toolResponse);
  const obj = typeof toolResponse === "object" ? toolResponse : {};
  const exitCode = obj.exit_code ?? obj.exitCode;

  const looksLikeError =
    obj.error ||
    obj.success === false ||
    (typeof exitCode === "number" && exitCode !== 0) ||
    /\b(error|failed|fatal|traceback|enoent|cannot find|exited with code [1-9])\b/i.test(text);

  const summary = text ? text.slice(0, 300) : undefined;
  return looksLikeError
    ? { status: "failed", error_summary: summary }
    : { status: "executed", result_summary: summary };
}

async function main() {
  const raw = await readStdin();
  const parsed = JSON.parse(raw);
  const eventName = parsed.hook_event_name;
  const sessionId = parsed.session_id;

  switch (eventName) {
    case "SessionStart": {
      await bestEffort(() => post("/v1/runs", { provider: HOST, external_session_id: sessionId }));
      return;
    }
    case "UserPromptSubmit": {
      if (typeof parsed.prompt === "string" && parsed.prompt.trim()) {
        await bestEffort(() =>
          post("/v1/runs/task", { provider: HOST, external_session_id: sessionId, prompt: parsed.prompt })
        );
      } else {
        process.exitCode = 0;
      }
      return;
    }
    case "PostToolUse": {
      const { status, result_summary, error_summary } = deriveExecutionResult(parsed.tool_response);
      await bestEffort(() =>
        post("/v1/activity/result", {
          provider: HOST,
          external_session_id: sessionId,
          external_event_id: parsed.tool_use_id,
          status,
          result_summary,
          error_summary,
        })
      );
      return;
    }
    case "SessionEnd": {
      await bestEffort(() => post("/v1/runs/end", { provider: HOST, external_session_id: sessionId, status: "completed" }));
      return;
    }
    case "PreToolUse":
    default: {
      // Unrecognized events fall through to the governance path too, since some hosts
      // (this script's other three) never send hook_event_name at all — the original
      // behavior before Agent Activity existed.
      try {
        const call = normalizeToolCall(parsed);
        const checked = await post("/v1/check", {
          ...call,
          provider: HOST,
          external_session_id: sessionId,
          external_event_id: parsed.tool_use_id,
        });
        let { decision, reason } = checked;
        if (decision === "review") {
          ({ decision, reason } = await pollForReviewResolution(checked.id));
        }
        const output = formatForHost(HOST, decision, reason);
        await exitWithOutput(output.stdout, output.stderr, output.exitCode);
      } catch (err) {
        // Fail closed: if Intentos is unreachable or misconfigured, don't silently allow.
        await exitWithOutput("", `Intentos hook error: ${err.message}`, 2);
      }
    }
  }
}

await main();
