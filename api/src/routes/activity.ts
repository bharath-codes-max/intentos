import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { resolveToken } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const ResultBody = z.object({
  provider: z.string().min(1),
  external_session_id: z.string().min(1),
  external_event_id: z.string().min(1),
  status: z.enum(["executed", "failed"]),
  result_summary: z.string().optional(),
  error_summary: z.string().optional(),
});

export async function activityRoutes(app: FastifyInstance) {
  /** Fired on Codex PostToolUse — updates the SAME activity event PreToolUse created, correlated by tool_use_id. */
  app.post("/v1/activity/result", async (req, reply) => {
    const authHeader = req.headers.authorization;
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!rawToken) return reply.code(401).send({ error: "Missing bearer token" });
    const token = await resolveToken(rawToken);
    if (!token) return reply.code(401).send({ error: "Invalid or revoked token" });

    const parsed = ResultBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { provider, external_event_id, status, result_summary, error_summary } = parsed.data;

    const [event] = await sql`
      update activity_events
      set execution_status = ${status}, result_summary = ${result_summary ?? null}, error_summary = ${error_summary ?? null}
      where org_id = ${token.org_id} and provider = ${provider} and external_event_id = ${external_event_id}
      returning id, run_id, execution_status
    `;
    if (!event) return reply.code(404).send({ error: "No matching activity event — was PreToolUse ever received for this tool_use_id?" });

    if (status === "failed") {
      await sql`update agent_runs set error_count = error_count + 1 where id = ${event.run_id}`;
    }

    return reply.send(event);
  });

  app.get("/v1/activity", { preHandler: requireAdmin }, async (req) => {
    const { org_id, run_id, category, decision, limit } = req.query as {
      org_id?: string;
      run_id?: string;
      category?: string;
      decision?: string;
      limit?: string;
    };
    const take = Math.min(Number(limit) || 100, 500);

    return sql`
      select e.id, e.run_id, e.sequence_number, e.event_type, e.category, e.tool, e.action, e.resource, e.target,
             e.environment, e.decision, e.execution_status, e.result_summary, e.error_summary, e."timestamp",
             r.task_summary, t.label as agent_label
      from activity_events e
      join agent_runs r on r.id = e.run_id
      left join agent_tokens t on t.id = e.agent_token_id
      where e.org_id = ${org_id ?? null}
        ${run_id ? sql`and e.run_id = ${run_id}` : sql``}
        ${category ? sql`and e.category = ${category}` : sql``}
        ${decision ? sql`and e.decision = ${decision}` : sql``}
      order by e."timestamp" desc
      limit ${take}
    `;
  });
}
