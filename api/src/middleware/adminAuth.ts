import { FastifyRequest, FastifyReply } from "fastify";

/** Protects management endpoints (org/policy/token admin). Separate from per-org agent tokens used by /v1/check. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const configured = process.env.ADMIN_API_KEY;
  const key = req.headers["x-admin-key"];
  if (!configured || typeof key !== "string" || key !== configured) {
    return reply.code(401).send({ error: "Invalid admin key" });
  }
}
