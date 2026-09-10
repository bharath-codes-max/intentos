import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { sql } from "../db/pool.js";
import { hashToken } from "./auth.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const check = scryptSync(password, salt, 64);
  const expected = Buffer.from(derived, "hex");
  return check.length === expected.length && timingSafeEqual(check, expected);
}

export async function createSession(userId: string) {
  const rawToken = `sess_${randomBytes(24).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}, ${hashToken(rawToken)}, ${expiresAt})
  `;
  return { rawToken, expiresAt };
}

export async function resolveSession(rawToken: string) {
  const rows = await sql`
    select s.id as session_id, u.id as user_id, u.org_id, u.email, u.role
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(rawToken)}
      and s.revoked_at is null
      and s.expires_at > now()
    limit 1
  `;
  return rows[0] ?? null;
}

function bearerFrom(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith("intentos_session="));
    if (match) return decodeURIComponent(match.split("=").slice(1).join("="));
  }
  return null;
}

/** Requires a signed-in human (browser session or Bearer session token) — not an agent token, not the admin key. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const raw = bearerFrom(req);
  if (!raw) return reply.code(401).send({ error: "Not signed in" });
  const session = await resolveSession(raw);
  if (!session) return reply.code(401).send({ error: "Session invalid or expired" });
  (req as FastifyRequest & { user: typeof session }).user = session;
}

/** Requires a signed-in human with the 'admin' role in their org — company-wide data
 *  (employees, all decisions, policies) is admin-only, enforced here at the API layer so
 *  hiding a UI link is never the only thing standing between an employee and this data. */
export async function requireOrgAdmin(req: FastifyRequest, reply: FastifyReply) {
  const raw = bearerFrom(req);
  if (!raw) return reply.code(401).send({ error: "Not signed in" });
  const session = await resolveSession(raw);
  if (!session) return reply.code(401).send({ error: "Session invalid or expired" });
  if (session.role !== "admin") return reply.code(403).send({ error: "Admin role required" });
  (req as FastifyRequest & { user: typeof session }).user = session;
}
