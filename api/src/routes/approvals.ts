import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const ResolveBody = z.object({
  approved: z.boolean(),
  reviewer: z.string().min(1),
});

export async function approvalsRoutes(app: FastifyInstance) {
  /** Every action currently paused pending a human decision — REVIEW never silently becomes ALLOW. */
  app.get("/v1/approvals", { preHandler: requireAdmin }, async (req) => {
    const { org_id } = req.query as { org_id?: string };
    return sql`
      select d.id, d.tool_name, d.tool_input, d.reason, d.created_at, d.project,
             t.label as agent_label, t.agent_type, p.rule_name as matched_rule
      from decisions d
      left join agent_tokens t on t.id = d.token_id
      left join policies p on p.id = d.matched_policy_id
      where d.org_id = ${org_id ?? null} and d.decision = 'review' and d.approval_status = 'pending'
        and (d.expires_at is null or d.expires_at > now())
      order by d.created_at asc
    `;
  });

  app.get("/v1/approvals/resolved", { preHandler: requireAdmin }, async (req) => {
    const { org_id, limit } = req.query as { org_id?: string; limit?: string };
    const take = Math.min(Number(limit) || 50, 200);
    return sql`
      select d.id, d.tool_name, d.tool_input, d.reason, d.approval_status, d.reviewer, d.resolved_at,
             t.label as agent_label
      from decisions d
      left join agent_tokens t on t.id = d.token_id
      where d.org_id = ${org_id ?? null} and d.approval_status in ('approved', 'denied')
      order by d.resolved_at desc
      limit ${take}
    `;
  });

  app.post("/v1/approvals/:id/resolve", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = ResolveBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const { approved, reviewer } = parsed.data;

    // Single-use, atomic: only a row still in 'pending' matches, so a duplicate click (or two
    // reviewers racing) finds zero rows the second time — exactly one resolution can ever land.
    const [updated] = await sql`
      update decisions
      set approval_status = ${approved ? "approved" : "denied"},
          reviewer = ${reviewer},
          resolved_at = now()
      where id = ${id} and decision = 'review' and approval_status = 'pending'
        and (expires_at is null or expires_at > now())
      returning id, approval_status, reviewer, resolved_at
    `;

    if (!updated) {
      const [existing] = await sql`select approval_status, expires_at from decisions where id = ${id}`;
      if (existing && existing.approval_status === "pending" && existing.expires_at && existing.expires_at < new Date()) {
        await sql`update decisions set approval_status = 'expired' where id = ${id} and approval_status = 'pending'`;
        return reply.code(409).send({ error: "Approval window expired — the agent's request is no longer waiting" });
      }
      return reply.code(404).send({ error: "No pending review found with that id" });
    }

    return reply.send(updated);
  });
}
