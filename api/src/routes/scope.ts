import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { requireUser, requireOrgAdmin } from "../middleware/userAuth.js";

const ScopeBody = z.object({
  scope_mode: z.enum(["all", "exclude", "include_only"]),
  scope_projects: z.array(z.string().min(1)).default([]),
});

const RequestBody = z.object({
  project_identifier: z.string().min(1),
  requested_action: z.enum(["include", "exclude"]),
});

const ResolveBody = z.object({ approved: z.boolean() });

export async function scopeRoutes(app: FastifyInstance) {
  /** Admin sets a device's scope directly — the fast path, no request/approval round trip needed. */
  app.patch("/v1/tokens/:id/scope", { preHandler: requireOrgAdmin }, async (req, reply) => {
    const admin = (req as typeof req & { user: { org_id: string } }).user;
    const { id } = req.params as { id: string };
    const parsed = ScopeBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });

    const [token] = await sql`select id, org_id from agent_tokens where id = ${id}`;
    if (!token || token.org_id !== admin.org_id) return reply.code(404).send({ error: "No device with that id in your company" });

    const [updated] = await sql`
      update agent_tokens
      set scope_mode = ${parsed.data.scope_mode}, scope_projects = ${parsed.data.scope_projects}
      where id = ${id}
      returning id, scope_mode, scope_projects
    `;
    return reply.send(updated);
  });

  /** Employee asks to add a project to their own device's scope — takes effect only once an admin approves it. */
  app.post("/v1/scope-requests", { preHandler: requireUser }, async (req, reply) => {
    const user = (req as typeof req & { user: { org_id: string; user_id: string; email: string } }).user;
    const parsed = RequestBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });

    const [device] = await sql`
      select id from agent_tokens
      where owner_user_id = ${user.user_id} and revoked_at is null
      order by created_at desc limit 1
    `;
    if (!device) return reply.code(404).send({ error: "No connected device found for your account — connect one first." });

    const [request] = await sql`
      insert into scope_requests (org_id, agent_token_id, requested_by, requested_by_email, project_identifier, requested_action)
      values (${user.org_id}, ${device.id}, ${user.user_id}, ${user.email}, ${parsed.data.project_identifier}, ${parsed.data.requested_action})
      returning id, status, created_at
    `;
    return reply.code(201).send(request);
  });

  app.get("/v1/scope-requests", { preHandler: requireOrgAdmin }, async (req) => {
    const admin = (req as typeof req & { user: { org_id: string } }).user;
    return sql`
      select sr.id, sr.project_identifier, sr.requested_action, sr.status, sr.created_at, sr.resolved_at,
             sr.requested_by_email, t.label as device_label
      from scope_requests sr
      left join agent_tokens t on t.id = sr.agent_token_id
      where sr.org_id = ${admin.org_id}
      order by sr.created_at desc
    `;
  });

  app.post("/v1/scope-requests/:id/resolve", { preHandler: requireOrgAdmin }, async (req, reply) => {
    const admin = (req as typeof req & { user: { org_id: string; email: string } }).user;
    const { id } = req.params as { id: string };
    const parsed = ResolveBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body" });

    const [request] = await sql`
      update scope_requests
      set status = ${parsed.data.approved ? "approved" : "denied"}, resolved_at = now(), resolved_by_email = ${admin.email}
      where id = ${id} and org_id = ${admin.org_id} and status = 'pending'
      returning id, agent_token_id, project_identifier, requested_action
    `;
    if (!request) return reply.code(404).send({ error: "No pending scope request with that id" });

    if (parsed.data.approved) {
      const mode = request.requested_action === "include" ? "include_only" : "exclude";
      const [token] = await sql`select scope_mode, scope_projects from agent_tokens where id = ${request.agent_token_id}`;
      // Switching a device's mode away from what it already had would silently drop any
      // projects it previously had scoped — only auto-switch mode the first time (from
      // the 'all' default); once a device has a real mode, later requests just append.
      const nextMode = token.scope_mode === "all" ? mode : token.scope_mode;
      const nextProjects = token.scope_projects.includes(request.project_identifier)
        ? token.scope_projects
        : [...token.scope_projects, request.project_identifier];
      await sql`
        update agent_tokens set scope_mode = ${nextMode}, scope_projects = ${nextProjects} where id = ${request.agent_token_id}
      `;
    }
    return reply.send({ resolved: true });
  });
}
