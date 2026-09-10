import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { resolveToken } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/adminAuth.js";

async function requireToken(req: { headers: { authorization?: string } }) {
  const authHeader = req.headers.authorization;
  const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!rawToken) return null;
  return resolveToken(rawToken);
}

const StartBody = z.object({
  provider: z.string().min(1),
  external_session_id: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const TaskBody = z.object({
  provider: z.string().min(1),
  external_session_id: z.string().min(1),
  prompt: z.string().min(1),
});

const EndBody = z.object({
  provider: z.string().min(1),
  external_session_id: z.string().min(1),
  status: z.enum(["completed", "failed", "cancelled"]).default("completed"),
});

export async function runsRoutes(app: FastifyInstance) {
  /** Fired on Codex SessionStart. Idempotent — a duplicate start for the same session just returns the existing run. */
  app.post("/v1/runs", async (req, reply) => {
    const token = await requireToken(req);
    if (!token) return reply.code(401).send({ error: "Invalid or missing token" });

    const parsed = StartBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { provider, external_session_id } = parsed.data;

    const [existing] = await sql`
      select id, status from agent_runs
      where org_id = ${token.org_id} and provider = ${provider} and external_session_id = ${external_session_id}
    `;
    if (existing) return reply.send(existing);

    const metadata = parsed.data.metadata ? sql.json(JSON.parse(JSON.stringify(parsed.data.metadata))) : null;
    const [run] = await sql`
      insert into agent_runs (org_id, agent_token_id, provider, external_session_id, status, metadata, employee_email)
      values (${token.org_id}, ${token.id}, ${provider}, ${external_session_id}, 'running', ${metadata}, ${token.owner_email})
      returning id, status
    `;
    return reply.code(201).send(run);
  });

  /** Fired on Codex UserPromptSubmit — the one place we see the agent's real, un-inferred task. */
  app.post("/v1/runs/task", async (req, reply) => {
    const token = await requireToken(req);
    if (!token) return reply.code(401).send({ error: "Invalid or missing token" });

    const parsed = TaskBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { provider, external_session_id, prompt } = parsed.data;

    const [run] = await sql`
      update agent_runs
      set task_summary = ${prompt}, task_source = 'captured_prompt'
      where org_id = ${token.org_id} and provider = ${provider} and external_session_id = ${external_session_id}
      returning id
    `;
    if (!run) return reply.code(404).send({ error: "No matching run — was SessionStart ever received?" });
    return reply.send(run);
  });

  /** Fired on Codex SessionEnd. */
  app.post("/v1/runs/end", async (req, reply) => {
    const token = await requireToken(req);
    if (!token) return reply.code(401).send({ error: "Invalid or missing token" });

    const parsed = EndBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { provider, external_session_id, status } = parsed.data;

    const [run] = await sql`
      update agent_runs
      set status = ${status}, ended_at = now()
      where org_id = ${token.org_id} and provider = ${provider} and external_session_id = ${external_session_id}
      returning id, status
    `;
    if (!run) return reply.code(404).send({ error: "No matching run" });
    return reply.send(run);
  });

  app.get("/v1/runs", { preHandler: requireAdmin }, async (req) => {
    const { org_id, employee_email } = req.query as { org_id?: string; employee_email?: string };
    return sql`
      select r.id, r.provider, r.external_session_id, r.task_summary, r.task_source, r.status,
             r.started_at, r.ended_at, r.activity_count, r.allow_count, r.review_count, r.block_count, r.error_count,
             t.label as agent_label, r.employee_email
      from agent_runs r
      left join agent_tokens t on t.id = r.agent_token_id
      where r.org_id = ${org_id ?? null}
        and (${employee_email ?? null}::text is null or r.employee_email = ${employee_email ?? null})
      order by r.started_at desc
    `;
  });

  app.get("/v1/runs/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [run] = await sql`
      select r.id, r.provider, r.external_session_id, r.task_summary, r.task_source, r.status,
             r.started_at, r.ended_at, r.activity_count, r.allow_count, r.review_count, r.block_count, r.error_count,
             t.label as agent_label
      from agent_runs r
      left join agent_tokens t on t.id = r.agent_token_id
      where r.id = ${id}
    `;
    if (!run) return reply.code(404).send({ error: "Not found" });

    const events = await sql`
      select e.id, e.sequence_number, e.event_type, e.category, e.tool, e.action, e.resource, e.target,
             e.environment, e.context, e.decision, e.execution_status, e.result_summary, e.error_summary,
             e."timestamp", e.decision_id, d.reason as decision_reason, p.rule_name as matched_rule
      from activity_events e
      left join decisions d on d.id = e.decision_id
      left join policies p on p.id = d.matched_policy_id
      where e.run_id = ${id}
      order by e.sequence_number asc
    `;
    return reply.send({ ...run, events });
  });
}
