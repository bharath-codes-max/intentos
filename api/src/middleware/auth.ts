import { createHash } from "node:crypto";
import { sql } from "../db/pool.js";

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function resolveToken(rawToken: string) {
  const hash = hashToken(rawToken);
  const rows = await sql`
    select id, org_id, agent_type, label
    from agent_tokens
    where token_hash = ${hash} and revoked_at is null
    limit 1
  `;
  return rows[0] ?? null;
}
