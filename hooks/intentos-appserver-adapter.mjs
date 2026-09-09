#!/usr/bin/env node
/**
 * Intentos adapter for Codex's "app-server" protocol — the JSON-RPC 2.0 engine the
 * ChatGPT desktop app's local Codex workspace actually runs on. Confirmed (via official
 * docs, not assumption) that app-server has its OWN approval RPC — item/commandExecution/
 * requestApproval and item/fileChange/requestApproval — completely separate from the
 * .codex/hooks.json system that only the plain `codex` CLI honors. The ChatGPT.app
 * Electron UI is already the client for its own spawned app-server process, so we can't
 * inject into that specific session — but app-server can be run standalone, with THIS
 * script as its client, giving genuine synchronous pre-execution enforcement.
 *
 * Usage:
 *   INTENTOS_TOKEN=... node intentos-appserver-adapter.mjs <cwd> "<prompt>"
 *
 * This does not touch the working Intentos policy engine at all — it calls the exact
 * same /v1/check, /v1/runs, /v1/runs/task, /v1/runs/end endpoints the CLI hook uses.
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const [, , cwd, prompt] = process.argv;
if (!cwd || !prompt) {
  console.error('Usage: intentos-appserver-adapter.mjs <cwd> "<prompt>"');
  process.exit(1);
}

const API_URL = process.env.INTENTOS_API_URL || "http://localhost:4000";
const TOKEN = process.env.INTENTOS_TOKEN;
if (!TOKEN) {
  console.error("INTENTOS_TOKEN is not set");
  process.exit(1);
}

async function checkWithIntentos(call) {
  const res = await fetch(`${API_URL}/v1/check`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(call),
  });
  const body = await res.json();
  return { ok: res.ok, body };
}

async function post(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

const child = spawn("codex", ["app-server"], { cwd, stdio: ["pipe", "pipe", "pipe"] });
const rl = createInterface({ input: child.stdout });
child.stderr.on("data", (d) => process.stderr.write(`[app-server stderr] ${d}`));

let nextId = 1;
const pending = new Map(); // id -> {resolve, reject}
let threadId = null;
const fileChangesByItemId = new Map(); // itemId -> [{path, kind, diff}]

function send(method, params, wantsId = true) {
  const id = wantsId ? nextId++ : undefined;
  const message = wantsId ? { method, id, params } : { method, params };
  child.stdin.write(JSON.stringify(message) + "\n");
  if (wantsId) {
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }
}

function respond(id, result) {
  child.stdin.write(JSON.stringify({ id, result }) + "\n");
}

const log = (...args) => console.log("[intentos-adapter]", ...args);

let turnDone = false;

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  // A response to a request WE sent (has id + result/error, no method).
  if (msg.id !== undefined && !msg.method && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) {
      reject(new Error(`RPC error for id ${msg.id}: ${JSON.stringify(msg.error)}`));
    } else {
      resolve(msg.result);
    }
    return;
  }

  // A request FROM the server that needs a response.
  if (msg.method === "item/commandExecution/requestApproval") {
    const { id, params } = msg;
    const commandStr = Array.isArray(params.command) ? params.command.join(" ") : String(params.command);
    log("APPROVAL REQUEST (command):", commandStr);
    const call = { tool_name: "Bash", tool_input: { command: commandStr } };
    const { body: decision } = await checkWithIntentos({
      ...call,
      provider: "codex-appserver",
      external_session_id: threadId,
      external_event_id: params.itemId,
    });
    log("  -> Intentos decision:", decision.decision, "-", decision.reason);
    respond(id, { decision: decision.decision === "allow" ? "accept" : "decline" });
    return;
  }

  if (msg.method === "item/fileChange/requestApproval") {
    const { id, params } = msg;
    // The approval request itself carries NO file path (confirmed via the real protocol
    // schema, not assumed) — only itemId/threadId/turnId/reason/grantRoot. The actual
    // path/diff arrives separately in an item/started notification for the same itemId,
    // buffered below, so we correlate by itemId rather than trusting the request body.
    const changes = fileChangesByItemId.get(params.itemId) ?? [];
    if (changes.length === 0) {
      log("APPROVAL REQUEST (file change): itemId", params.itemId, "— no buffered path yet, denying to fail closed");
    }
    // A single approval can cover multiple files in one patch — check each; any BLOCK/REVIEW wins.
    let worst = { decision: "allow", reason: "No policy matched — default allow" };
    for (const change of changes) {
      const { body: decision } = await checkWithIntentos({
        tool_name: "Write",
        tool_input: { file_path: change.path },
        provider: "codex-appserver",
        external_session_id: threadId,
        external_event_id: params.itemId,
      });
      log("APPROVAL REQUEST (file change):", change.path, change.kind, "-> ", decision.decision, "-", decision.reason);
      if (decision.decision !== "allow") {
        worst = decision;
        break;
      }
    }
    const finalDecision = changes.length === 0 ? { decision: "block", reason: "No buffered file path — failing closed" } : worst;
    respond(id, { decision: finalDecision.decision === "allow" ? "accept" : "decline" });
    return;
  }

  // Buffer file-change item details as soon as they're announced, keyed by itemId, so the
  // approval-request handler above (which lacks path info) can look them up.
  if (msg.method === "item/started" && msg.params?.item?.type === "fileChange") {
    fileChangesByItemId.set(msg.params.item.id, msg.params.item.changes ?? []);
  }

  // Notifications we care about for logging/lifecycle.
  if (msg.method === "turn/completed" || (msg.method === "turn/updated" && msg.params?.turn?.status === "completed")) {
    turnDone = true;
    log("Turn completed.");
  }
  if (msg.method === "item/updated" && msg.params?.item?.type === "agentMessage") {
    log("Agent:", msg.params.item.text?.slice(0, 400));
  }
});

async function main() {
  await send("initialize", {
    clientInfo: { name: "intentos-adapter", title: "Intentos Adapter", version: "0.1.0" },
    capabilities: { experimentalApi: true, optOutNotificationMethods: [] },
  });
  send("initialized", {}, false);

  const startResult = await send("thread/start", {
    model: "gpt-5.6-terra",
    cwd,
    approvalPolicy: "untrusted",
    sandbox: "workspace-write",
  });
  threadId = startResult.thread.id;
  log("Thread started:", threadId);

  await post("/v1/runs", { provider: "codex-appserver", external_session_id: threadId });
  await post("/v1/runs/task", { provider: "codex-appserver", external_session_id: threadId, prompt });
  log("Run registered with Intentos, real prompt captured.");

  await send("turn/start", {
    threadId,
    input: [{ type: "text", text: prompt }],
    cwd,
    model: "gpt-5.6-terra",
    effort: "medium",
  });
  log("Turn started, waiting for completion (up to 120s)...");

  const deadline = Date.now() + 120_000;
  while (!turnDone && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }

  await post("/v1/runs/end", { provider: "codex-appserver", external_session_id: threadId, status: turnDone ? "completed" : "failed" });
  log(turnDone ? "Done." : "Timed out waiting for turn completion.");
  child.stdin.end();
  child.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error("Adapter error:", err);
  child.kill();
  process.exit(1);
});
