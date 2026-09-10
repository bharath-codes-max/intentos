import { randomBytes } from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { createSession, hashPassword, verifyPassword, requireUser } from "../middleware/userAuth.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const SignupBody = z.object({
  company_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/v1/auth/signup", async (req, reply) => {
    const parsed = SignupBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { company_name, email, password } = parsed.data;

    const [existing] = await sql`select id from users where email = ${email}`;
    if (existing) return reply.code(409).send({ error: "An account with that email already exists" });

    const [org] = await sql`insert into orgs (name) values (${company_name}) returning id, name`;
    const [user] = await sql`
      insert into users (org_id, email, password_hash)
      values (${org.id}, ${email}, ${hashPassword(password)})
      returning id, org_id, email
    `;
    const { rawToken, expiresAt } = await createSession(user.id);
    return reply.code(201).send({ user: { id: user.id, email: user.email, org_id: org.id, org_name: org.name }, session_token: rawToken, expires_at: expiresAt });
  });

  app.post("/v1/auth/login", async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { email, password } = parsed.data;

    const [user] = await sql`select id, org_id, email, password_hash from users where email = ${email}`;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }
    const [org] = await sql`select name from orgs where id = ${user.org_id}`;
    const { rawToken, expiresAt } = await createSession(user.id);
    return reply.send({ user: { id: user.id, email: user.email, org_id: user.org_id, org_name: org?.name ?? null }, session_token: rawToken, expires_at: expiresAt });
  });

  /** Behind the shared private-preview password gate, not a public endpoint — the dashboard
   *  server calls this with the admin key after the visitor typed the site password, so a
   *  single test company exists for everyone let in rather than asking each visitor to sign
   *  up separately. Find-or-create is idempotent: repeat calls reuse the same org/user. */
  app.post("/v1/auth/site-login", { preHandler: requireAdmin }, async (req, reply) => {
    const email = "shared-preview@intentos.local";
    let [user] = await sql`select id, org_id, email from users where email = ${email}`;
    if (!user) {
      const [org] = await sql`insert into orgs (name) values ('Intentos Preview') returning id, name`;
      [user] = await sql`
        insert into users (org_id, email, password_hash)
        values (${org.id}, ${email}, ${hashPassword(randomBytes(24).toString("hex"))})
        returning id, org_id, email
      `;
    }
    const [org] = await sql`select name from orgs where id = ${user.org_id}`;
    const { rawToken, expiresAt } = await createSession(user.id);
    return reply.send({ user: { id: user.id, email: user.email, org_id: user.org_id, org_name: org?.name ?? null }, session_token: rawToken, expires_at: expiresAt });
  });

  app.get("/v1/auth/me", { preHandler: requireUser }, async (req) => {
    const user = (req as typeof req & { user: { user_id: string; org_id: string; email: string } }).user;
    const [org] = await sql`select name from orgs where id = ${user.org_id}`;
    return { id: user.user_id, email: user.email, org_id: user.org_id, org_name: org?.name ?? null };
  });

  app.post("/v1/auth/logout", { preHandler: requireUser }, async (req, reply) => {
    const user = (req as typeof req & { user: { session_id: string } }).user;
    await sql`update sessions set revoked_at = now() where id = ${user.session_id}`;
    return reply.send({ signed_out: true });
  });
}
