import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const ConditionSchema = z.object({
  field: z.enum(["tool_name", "tool_input.file_path", "tool_input.command"]),
  op: z.enum(["contains", "equals", "not_contains"]),
  value: z.string().min(1),
});

const CreatePolicyBody = z.object({
  org_id: z.string().uuid(),
  rule_name: z.string().min(1),
  condition: ConditionSchema,
  action: z.enum(["ALLOW", "BLOCK", "REVIEW"]),
  priority: z.number().int().default(10),
});

export async function policiesRoutes(app: FastifyInstance) {
  app.post("/v1/policies", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = CreatePolicyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const { org_id, rule_name, condition, action, priority } = parsed.data;

    const [policy] = await sql`
      insert into policies (org_id, rule_name, condition, action, priority)
      values (${org_id}, ${rule_name}, ${JSON.stringify(condition)}, ${action}, ${priority})
      returning id, rule_name, condition, action, priority, active, created_at
    `;
    return reply.code(201).send(policy);
  });

  app.get("/v1/policies", { preHandler: requireAdmin }, async (req) => {
    const orgId = (req.query as { org_id?: string }).org_id;
    const onlyManual = (req.query as { manual_only?: string }).manual_only === "true";
    return sql`
      select id, rule_name, condition, action, priority, active, created_at, contract_id
      from policies
      where org_id = ${orgId ?? null} ${onlyManual ? sql`and contract_id is null` : sql``}
      order by priority desc, created_at asc
    `;
  });

  app.patch("/v1/policies/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const Body = z.object({ active: z.boolean() });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body" });
    }
    const [policy] = await sql`
      update policies set active = ${parsed.data.active} where id = ${id}
      returning id, active
    `;
    return reply.send(policy);
  });
}
