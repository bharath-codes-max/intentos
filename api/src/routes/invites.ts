import { randomBytes } from "node:crypto";
import { FastifyInstance } from "fastify";
import { sql } from "../db/pool.js";
import { requireOrgAdmin } from "../middleware/userAuth.js";

function generateCode(): string {
  return randomBytes(6).toString("base64url"); // short, URL-safe, ~2^48 space
}

export async function invitesRoutes(app: FastifyInstance) {
  /** Get-or-create this org's single reusable invite link (admin only). Idempotent: repeat
   *  calls return the same live code rather than minting a new one every time. */
  app.get("/v1/invites/active", { preHandler: requireOrgAdmin }, async (req) => {
    const user = (req as typeof req & { user: { org_id: string } }).user;
    const [existing] = await sql`
      select code, created_at from org_invites
      where org_id = ${user.org_id} and revoked_at is null
      order by created_at desc limit 1
    `;
    if (existing) return existing;

    const code = generateCode();
    const [created] = await sql`
      insert into org_invites (org_id, code, created_by)
      values (${user.org_id}, ${code}, ${(req as typeof req & { user: { user_id: string } }).user.user_id})
      returning code, created_at
    `;
    return created;
  });

  /** Revoke the current link and mint a fresh one — for when a link leaks or needs rotating. */
  app.post("/v1/invites/regenerate", { preHandler: requireOrgAdmin }, async (req) => {
    const user = (req as typeof req & { user: { org_id: string; user_id: string } }).user;
    await sql`update org_invites set revoked_at = now() where org_id = ${user.org_id} and revoked_at is null`;
    const code = generateCode();
    const [created] = await sql`
      insert into org_invites (org_id, code, created_by)
      values (${user.org_id}, ${code}, ${user.user_id})
      returning code, created_at
    `;
    return created;
  });

  /** Public — the join page calls this before the employee has an account, just to show
   *  "Join {company}" and confirm the link is still live. Returns no sensitive data. */
  app.get("/v1/invites/:code", async (req, reply) => {
    const { code } = req.params as { code: string };
    const [invite] = await sql`
      select oi.org_id, o.name as org_name
      from org_invites oi
      join orgs o on o.id = oi.org_id
      where oi.code = ${code} and oi.revoked_at is null
    `;
    if (!invite) return reply.code(404).send({ error: "This invite link is invalid or has been revoked" });
    return { org_name: invite.org_name };
  });
}
