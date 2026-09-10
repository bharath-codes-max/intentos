import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const ConditionSchema = z.union([
  z.object({
    field: z.string(),
    op: z.enum(["contains", "equals", "not_contains", "lt", "lte", "gt", "gte"]),
    value: z.string(),
  }),
  z.array(
    z.object({
      field: z.string(),
      op: z.enum(["contains", "equals", "not_contains", "lt", "lte", "gt", "gte"]),
      value: z.string(),
    })
  ),
]);

const RuleInput = z.object({
  resource: z.string(),
  resource_action: z.string(),
  effect: z.enum(["ALLOW", "BLOCK", "REVIEW"]),
  reason: z.string(),
  condition: ConditionSchema.nullable(),
  priority: z.number().int().optional(),
});

const CreateContractBody = z.object({
  org_id: z.string().uuid(),
  agent_token_id: z.string().uuid().optional(),
  name: z.string().min(1),
  natural_language: z.string().min(1),
  rules: z.array(RuleInput).min(1),
  // When set, this contract only governs actions whose project identity contains this text —
  // see check.ts. Omitted/null means org-wide, the existing default behavior.
  project_scope: z.string().min(1).optional(),
});

const DEFAULT_PRIORITY: Record<"ALLOW" | "BLOCK" | "REVIEW", number> = {
  BLOCK: 30,
  REVIEW: 20,
  ALLOW: 10,
};

export async function contractsRoutes(app: FastifyInstance) {
  app.post("/v1/contracts", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = CreateContractBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const { org_id, agent_token_id, name, natural_language, rules, project_scope } = parsed.data;

    const [contract] = await sql`
      insert into intent_contracts (org_id, agent_token_id, name, natural_language, status, created_by, project_scope)
      values (${org_id}, ${agent_token_id ?? null}, ${name}, ${natural_language}, 'active', 'you@company.com', ${project_scope ?? null})
      returning id, name, status, created_at, project_scope
    `;

    for (const rule of rules) {
      await sql`
        insert into policies (org_id, contract_id, rule_name, resource, resource_action, reason, condition, action, priority, active)
        values (
          ${org_id}, ${contract.id}, ${rule.reason}, ${rule.resource}, ${rule.resource_action}, ${rule.reason},
          ${rule.condition ? JSON.stringify(rule.condition) : null}, ${rule.effect},
          ${rule.priority ?? DEFAULT_PRIORITY[rule.effect]}, true
        )
      `;
    }

    return reply.code(201).send(contract);
  });

  app.get("/v1/contracts", { preHandler: requireAdmin }, async (req) => {
    const { org_id } = req.query as { org_id?: string };
    return sql`
      select
        c.id, c.name, c.natural_language, c.status, c.created_at, c.project_scope,
        t.label as agent_label, t.agent_type,
        count(p.id) as rule_count,
        count(p.id) filter (where p.action = 'ALLOW') as allow_count,
        count(p.id) filter (where p.action = 'REVIEW') as review_count,
        count(p.id) filter (where p.action = 'BLOCK') as block_count
      from intent_contracts c
      left join agent_tokens t on t.id = c.agent_token_id
      left join policies p on p.contract_id = c.id
      where c.org_id = ${org_id ?? null}
      group by c.id, t.label, t.agent_type
      order by c.created_at desc
    `;
  });

  app.get("/v1/contracts/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [contract] = await sql`
      select c.id, c.name, c.natural_language, c.status, c.created_at, c.agent_token_id, c.project_scope,
             t.label as agent_label, t.agent_type
      from intent_contracts c
      left join agent_tokens t on t.id = c.agent_token_id
      where c.id = ${id}
    `;
    if (!contract) return reply.code(404).send({ error: "Not found" });

    const rules = await sql`
      select id, rule_name, resource, resource_action, reason, condition, action, priority, active
      from policies
      where contract_id = ${id}
      order by priority desc, created_at asc
    `;

    return reply.send({ ...contract, rules });
  });

  app.patch("/v1/contracts/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const Body = z.object({ status: z.enum(["active", "archived"]) });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body" });

    const [contract] = await sql`
      update intent_contracts set status = ${parsed.data.status} where id = ${id}
      returning id, status
    `;
    await sql`
      update policies set active = ${parsed.data.status === "active"} where contract_id = ${id}
    `;
    return reply.send(contract);
  });
}
