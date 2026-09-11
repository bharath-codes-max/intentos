import { randomBytes } from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { requireUser } from "../middleware/userAuth.js";
import { hashToken } from "../middleware/auth.js";

const DEVICE_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes to approve

function userCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let out = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) out += "-";
    out += chars[randomBytes(1)[0] % chars.length];
  }
  return out;
}

const StartBody = z.object({
  agent_type: z.enum(["claude-code", "cursor", "github-copilot", "codex"]).default("claude-code"),
  hostname: z.string().max(200).optional(),
  // Chosen up front on the Integrations page, before the install command is even shown —
  // baked into the resulting token at approval time so it's correctly scoped from the first
  // run, not "all" and fixed later. Omitted (old installers, or "govern everything") keeps
  // the existing default-all behavior exactly as before.
  scope_mode: z.enum(["all", "include_only", "exclude"]).default("all"),
  scope_projects: z.array(z.string().min(1)).max(50).default([]),
});

const ApproveBody = z.object({ user_code: z.string().min(1) });

export async function devicesRoutes(app: FastifyInstance) {
  /** Step 1 (installer, no auth yet): begin a device link. */
  app.post("/v1/devices/start", async (req, reply) => {
    const parsed = StartBody.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { agent_type, hostname, scope_mode, scope_projects } = parsed.data;

    const deviceCode = randomBytes(24).toString("hex");
    const code = userCode();
    const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_MS);

    await sql`
      insert into device_links (device_code, user_code, agent_type, hostname, expires_at, scope_mode, scope_projects)
      values (${deviceCode}, ${code}, ${agent_type}, ${hostname ?? null}, ${expiresAt}, ${scope_mode}, ${scope_projects})
    `;

    return reply.code(201).send({
      device_code: deviceCode,
      user_code: code,
      verification_uri: "/connect",
      expires_in: DEVICE_CODE_TTL_MS / 1000,
      interval: 3,
    });
  });

  /** Step 2 (browser, signed-in human): look up the pending code to show what they're approving. */
  app.get("/v1/devices/by-code/:user_code", { preHandler: requireUser }, async (req, reply) => {
    const { user_code } = req.params as { user_code: string };
    const [row] = await sql`
      select user_code, agent_type, hostname, status, expires_at, scope_mode, scope_projects
      from device_links where user_code = ${user_code.toUpperCase()}
    `;
    if (!row) return reply.code(404).send({ error: "No pending connection with that code" });
    if (row.status === "pending" && row.expires_at < new Date()) {
      await sql`update device_links set status = 'expired' where user_code = ${user_code.toUpperCase()} and status = 'pending'`;
      return reply.send({ ...row, status: "expired" });
    }
    return reply.send(row);
  });

  /** Step 3 (browser, signed-in human clicks Approve): mints a real agent token, hands it to the installer via poll. */
  app.post("/v1/devices/approve", { preHandler: requireUser }, async (req, reply) => {
    const parsed = ApproveBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const user = (req as typeof req & { user: { org_id: string; user_id: string; email: string } }).user;
    const code = parsed.data.user_code.toUpperCase();

    const [pending] = await sql`
      select id, agent_type, hostname, status, expires_at, scope_mode, scope_projects from device_links where user_code = ${code}
    `;
    if (!pending) return reply.code(404).send({ error: "No pending connection with that code" });
    if (pending.status !== "pending") return reply.code(409).send({ error: `This connection is already ${pending.status}` });
    if (pending.expires_at < new Date()) {
      await sql`update device_links set status = 'expired' where id = ${pending.id}`;
      return reply.code(410).send({ error: "This code expired — restart the connector" });
    }

    const rawToken = `sk-${pending.agent_type}-${randomBytes(16).toString("hex")}`;
    const label = pending.hostname ? `${pending.agent_type} — ${pending.hostname}` : `${pending.agent_type} — device`;
    const [token] = await sql`
      insert into agent_tokens (org_id, token_hash, agent_type, label, owner_user_id, owner_email, scope_mode, scope_projects)
      values (${user.org_id}, ${hashToken(rawToken)}, ${pending.agent_type}, ${label}, ${user.user_id}, ${user.email}, ${pending.scope_mode}, ${pending.scope_projects})
      returning id
    `;
    await sql`
      update device_links
      set status = 'approved', user_id = ${user.user_id},
          agent_token_id = ${token.id}, pending_raw_token = ${rawToken}, approved_at = now()
      where id = ${pending.id}
    `;
    return reply.send({ approved: true });
  });

  app.post("/v1/devices/deny", { preHandler: requireUser }, async (req, reply) => {
    const parsed = ApproveBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body" });
    await sql`update device_links set status = 'denied' where user_code = ${parsed.data.user_code.toUpperCase()} and status = 'pending'`;
    return reply.send({ denied: true });
  });

  /** Step 4 (installer, polling, no auth): claim the token exactly once. */
  app.post("/v1/devices/poll", async (req, reply) => {
    const { device_code } = (req.body ?? {}) as { device_code?: string };
    if (!device_code) return reply.code(400).send({ error: "device_code required" });

    const [row] = await sql`select id, status, pending_raw_token, expires_at from device_links where device_code = ${device_code}`;
    if (!row) return reply.code(404).send({ error: "Unknown device_code" });

    if (row.status === "pending" && row.expires_at < new Date()) {
      await sql`update device_links set status = 'expired' where id = ${row.id}`;
      return reply.send({ status: "expired" });
    }
    if (row.status !== "approved") return reply.send({ status: row.status });

    // One-time delivery: the raw token is cleared the instant it's read, so a replayed
    // poll (or anyone else guessing the device_code) gets "claimed", never the credential.
    const [claimed] = await sql`
      update device_links set status = 'claimed', pending_raw_token = null
      where id = ${row.id} and status = 'approved'
      returning pending_raw_token as token_before_clear
    `;
    if (!claimed) return reply.send({ status: "claimed" });
    return reply.send({ status: "approved", token: row.pending_raw_token });
  });
}
