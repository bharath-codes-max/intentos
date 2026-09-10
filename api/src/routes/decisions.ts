import { FastifyInstance } from "fastify";
import { sql } from "../db/pool.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { resolveToken } from "../middleware/auth.js";

export async function decisionsRoutes(app: FastifyInstance) {
  /**
   * Polled by the hook script itself while a PreToolUse call is held open waiting on a REVIEW
   * decision — NOT an admin endpoint. Scoped to the calling agent's own org/token so one agent
   * can never poll another org's (or another agent's) pending decision.
   */
  app.get("/v1/decisions/:id/status", async (req, reply) => {
    const authHeader = req.headers.authorization;
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!rawToken) return reply.code(401).send({ error: "Missing bearer token" });
    const token = await resolveToken(rawToken);
    if (!token) return reply.code(401).send({ error: "Invalid or revoked token" });

    const { id } = req.params as { id: string };
    const [row] = await sql`
      select id, decision, approval_status, reason, expires_at, resolved_at
      from decisions
      where id = ${id} and org_id = ${token.org_id} and token_id = ${token.id}
    `;
    if (!row) return reply.code(404).send({ error: "Not found" });
    return reply.send(row);
  });

  app.get("/v1/decisions", { preHandler: requireAdmin }, async (req) => {
    const { org_id, limit, employee_email } = req.query as { org_id?: string; limit?: string; employee_email?: string };
    const take = Math.min(Number(limit) || 50, 200);

    return sql`
      select d.id, d.tool_name, d.tool_input, d.decision, d.reason, d.latency_ms, d.created_at,
             d.approval_status, d.reviewer, d.resolved_at, d.project, d.employee_email,
             t.label as agent_label, t.agent_type, p.rule_name as matched_rule, e.run_id
      from decisions d
      left join agent_tokens t on t.id = d.token_id
      left join policies p on p.id = d.matched_policy_id
      left join activity_events e on e.decision_id = d.id
      where d.org_id = ${org_id ?? null}
        and (${employee_email ?? null}::text is null or d.employee_email = ${employee_email ?? null})
      order by d.created_at desc
      limit ${take}
    `;
  });

  /** Everything the Governance Canvas needs to render one decision as a flow diagram — the
   *  decision itself, the device/employee that triggered it, and the Intent Contract + policy
   *  rule that produced the verdict (both null if nothing matched, i.e. a default-allow). One
   *  round trip instead of the canvas piecing this together from three separate list endpoints. */
  app.get("/v1/decisions/:id/flow", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { org_id } = req.query as { org_id?: string };

    const [row] = await sql`
      select
        d.id, d.tool_name, d.tool_input, d.decision, d.reason, d.latency_ms, d.created_at,
        d.approval_status, d.reviewer, d.resolved_at, d.project, d.employee_email,
        t.label as agent_label, t.agent_type, t.owner_email as device_owner_email,
        p.id as policy_id, p.rule_name as matched_rule, p.condition as policy_condition,
        p.action as policy_action, p.reason as policy_reason,
        c.id as contract_id, c.name as contract_name, c.natural_language as contract_intent,
        c.status as contract_status, c.project_scope as contract_project_scope
      from decisions d
      left join agent_tokens t on t.id = d.token_id
      left join policies p on p.id = d.matched_policy_id
      left join intent_contracts c on c.id = p.contract_id
      where d.id = ${id} and d.org_id = ${org_id ?? null}
    `;
    if (!row) return reply.code(404).send({ error: "Not found" });
    return reply.send(row);
  });

  app.get("/v1/decisions/summary", { preHandler: requireAdmin }, async (req) => {
    const { org_id } = req.query as { org_id?: string };
    const [row] = await sql`
      select
        count(*) filter (where decision = 'allow') as allow,
        count(*) filter (where decision = 'block') as block,
        count(*) filter (where decision = 'review') as review,
        count(*) as total
      from decisions
      where org_id = ${org_id ?? null}
    `;
    return row;
  });
}
