import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const CreateOrgBody = z.object({ name: z.string().min(1) });

export async function orgsRoutes(app: FastifyInstance) {
  app.post("/v1/orgs", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = CreateOrgBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const [org] = await sql`
      insert into orgs (name) values (${parsed.data.name}) returning id, name, created_at
    `;
    return reply.code(201).send(org);
  });

  app.get("/v1/orgs", { preHandler: requireAdmin }, async () => {
    return sql`select id, name, created_at from orgs order by created_at desc`;
  });
}
