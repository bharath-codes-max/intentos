import { randomBytes } from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { hashToken } from "../middleware/auth.js";

const AGENT_TYPES = ["claude-code", "cursor", "github-copilot", "codex", "openai-agents-sdk", "custom"] as const;

const CreateTokenBody = z.object({
  org_id: z.string().uuid(),
  agent_type: z.enum(AGENT_TYPES),
  label: z.string().min(1),
});

export async function tokensRoutes(app: FastifyInstance) {
  app.post("/v1/tokens", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = CreateTokenBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const { org_id, agent_type, label } = parsed.data;
    const rawToken = `sk-${agent_type}-${randomBytes(16).toString("hex")}`;

    const [token] = await sql`
      insert into agent_tokens (org_id, token_hash, agent_type, label)
      values (${org_id}, ${hashToken(rawToken)}, ${agent_type}, ${label})
      returning id, agent_type, label, created_at
    `;

    return reply.code(201).send({ ...token, token: rawToken });
  });

  app.get("/v1/tokens", { preHandler: requireAdmin }, async (req) => {
    const orgId = (req.query as { org_id?: string }).org_id;
    return sql`
      select id, agent_type, label, created_at, revoked_at
      from agent_tokens
      where org_id = ${orgId ?? null}
      order by created_at desc
    `;
  });

  app.post("/v1/tokens/:id/revoke", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await sql`update agent_tokens set revoked_at = now() where id = ${id}`;
    return reply.send({ revoked: true });
  });
}
