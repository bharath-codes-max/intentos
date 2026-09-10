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

const JoinBody = z.object({
  code: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/v1/auth/signup", async (req, reply) => {
    const parsed = SignupBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { company_name, email, password } = parsed.data;

    const [existing] = await sql`select id from users where email = ${email}`;
    if (existing) return reply.code(409).send({ error: "An account with that email already exists" });

    // The org creator is always 'admin' — the only way to become 'employee' is joining
    // someone else's already-existing org via an invite link (see /v1/auth/join below).
    const [org] = await sql`insert into orgs (name) values (${company_name}) returning id, name`;
    const [user] = await sql`
      insert into users (org_id, email, password_hash, role)
      values (${org.id}, ${email}, ${hashPassword(password)}, 'admin')
      returning id, org_id, email, role
    `;
    const { rawToken, expiresAt } = await createSession(user.id);
    return reply.code(201).send({
      user: { id: user.id, email: user.email, org_id: org.id, org_name: org.name, role: user.role },
      session_token: rawToken,
      expires_at: expiresAt,
    });
  });

  app.post("/v1/auth/login", async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { email, password } = parsed.data;

    const [user] = await sql`select id, org_id, email, password_hash, role, revoked_at from users where email = ${email}`;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }
    if (user.revoked_at) {
      return reply.code(403).send({ error: "Your access has been revoked. Contact your admin." });
    }
    const [org] = await sql`select name from orgs where id = ${user.org_id}`;
    const { rawToken, expiresAt } = await createSession(user.id);
    return reply.send({
      user: { id: user.id, email: user.email, org_id: user.org_id, org_name: org?.name ?? null, role: user.role },
      session_token: rawToken,
      expires_at: expiresAt,
    });
  });

  /** Employee onboarding via an admin-shared invite link. The code only identifies which
   *  company to join — every employee still authenticates with their own real email and
   *  password, so no two people ever share one identity even though they share one link. */
  app.post("/v1/auth/join", async (req, reply) => {
    const parsed = JoinBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    const { code, email, password } = parsed.data;

    const [invite] = await sql`select org_id from org_invites where code = ${code} and revoked_at is null`;
    if (!invite) return reply.code(404).send({ error: "This invite link is invalid or has been revoked" });

    const [existing] = await sql`select id from users where email = ${email}`;
    if (existing) return reply.code(409).send({ error: "An account with that email already exists" });

    const [org] = await sql`select name from orgs where id = ${invite.org_id}`;
    const [user] = await sql`
      insert into users (org_id, email, password_hash, role)
      values (${invite.org_id}, ${email}, ${hashPassword(password)}, 'employee')
      returning id, org_id, email, role
    `;
    const { rawToken, expiresAt } = await createSession(user.id);
    return reply.code(201).send({
      user: { id: user.id, email: user.email, org_id: user.org_id, org_name: org?.name ?? null, role: user.role },
      session_token: rawToken,
      expires_at: expiresAt,
    });
  });

  /** Behind the shared private-preview password gate, not a public endpoint — the dashboard
   *  server calls this with the admin key after the visitor typed the site password, so a
   *  single test company exists for everyone let in rather than asking each visitor to sign
   *  up separately. Find-or-create is idempotent: repeat calls reuse the same org/user. */
  app.post("/v1/auth/site-login", { preHandler: requireAdmin }, async (req, reply) => {
    const email = "shared-preview@intentos.local";
    let [user] = await sql`select id, org_id, email, role from users where email = ${email}`;
    if (!user) {
      const [org] = await sql`insert into orgs (name) values ('Intentos Preview') returning id, name`;
      [user] = await sql`
        insert into users (org_id, email, password_hash, role)
        values (${org.id}, ${email}, ${hashPassword(randomBytes(24).toString("hex"))}, 'admin')
        returning id, org_id, email, role
      `;
    }
    const [org] = await sql`select name from orgs where id = ${user.org_id}`;
    const { rawToken, expiresAt } = await createSession(user.id);
    return reply.send({
      user: { id: user.id, email: user.email, org_id: user.org_id, org_name: org?.name ?? null, role: user.role },
      session_token: rawToken,
      expires_at: expiresAt,
    });
  });

  app.get("/v1/auth/me", { preHandler: requireUser }, async (req) => {
    const user = (req as typeof req & { user: { user_id: string; org_id: string; email: string; role: string } }).user;
    const [org] = await sql`select name from orgs where id = ${user.org_id}`;
    return { id: user.user_id, email: user.email, org_id: user.org_id, org_name: org?.name ?? null, role: user.role };
  });

  app.post("/v1/auth/logout", { preHandler: requireUser }, async (req, reply) => {
    const user = (req as typeof req & { user: { session_id: string } }).user;
    await sql`update sessions set revoked_at = now() where id = ${user.session_id}`;
    return reply.send({ signed_out: true });
  });
}
