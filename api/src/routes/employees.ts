import { FastifyInstance } from "fastify";
import { sql } from "../db/pool.js";
import { requireOrgAdmin } from "../middleware/userAuth.js";

export async function employeesRoutes(app: FastifyInstance) {
  app.get("/v1/employees", { preHandler: requireOrgAdmin }, async (req) => {
    const user = (req as typeof req & { user: { org_id: string } }).user;
    return sql`
      select
        u.id, u.email, u.role, u.created_at,
        count(distinct t.id) filter (where t.revoked_at is null) as connected_devices,
        max(d.created_at) as last_activity_at
      from users u
      left join agent_tokens t on t.owner_user_id = u.id
      left join decisions d on d.employee_email = u.email and d.org_id = u.org_id
      where u.org_id = ${user.org_id}
      group by u.id, u.email, u.role, u.created_at
      order by u.created_at asc
    `;
  });

  /** Disconnects every device this employee has enrolled and signs them out everywhere —
   *  the user row itself stays, so their name/email still shows correctly on their past
   *  decisions instead of those rows going orphaned. */
  app.post("/v1/employees/:id/revoke", { preHandler: requireOrgAdmin }, async (req, reply) => {
    const admin = (req as typeof req & { user: { org_id: string; user_id: string } }).user;
    const { id } = req.params as { id: string };

    const [target] = await sql`select id, org_id from users where id = ${id}`;
    if (!target || target.org_id !== admin.org_id) {
      return reply.code(404).send({ error: "No employee with that id in your company" });
    }
    if (id === admin.user_id) {
      return reply.code(400).send({ error: "You can't revoke your own access" });
    }

    await sql`update agent_tokens set revoked_at = now() where owner_user_id = ${id} and revoked_at is null`;
    await sql`update sessions set revoked_at = now() where user_id = ${id} and revoked_at is null`;
    return reply.send({ revoked: true });
  });
}
