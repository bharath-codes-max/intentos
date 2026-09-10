import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db/pool.js";
import { resolveToken } from "../middleware/auth.js";
import { evaluate, PolicyRow, Verdict } from "../engine/evaluate.js";
import { classifyActivity } from "../engine/classify-activity.js";
import { redactContext, redactString } from "../engine/redact.js";

const CheckBody = z.object({
  tool_name: z.string().min(1),
  tool_input: z.record(z.string(), z.unknown()).default({}),
  // Optional — present only when the caller (e.g. the Codex hook) also reports Agent Activity.
  // Omitting these keeps behavior byte-identical to the original governance-only endpoint.
  provider: z.string().optional(),
  external_session_id: z.string().optional(),
  external_event_id: z.string().optional(),
  // Repository/project identity resolved by the hook from `git remote`/`rev-parse` at the
  // action's cwd — see hooks/project-identity.mjs. Optional and additive: a caller that
  // omits it (or an older hook build) behaves exactly as before.
  project: z
    .object({
      cwd: z.string().optional(),
      repo_root: z.string().optional(),
      remote_url: z.string().optional(),
      normalized_repo: z.string().optional(),
      branch: z.string().optional(),
    })
    .optional(),
});

const EXECUTION_STATUS_FOR: Record<Verdict, "denied" | "waiting_approval" | "attempted"> = {
  block: "denied",
  review: "waiting_approval",
  allow: "attempted",
};

/**
 * Per-device project scope, checked BEFORE policy evaluation. Outside the governed set —
 * either a named EXCLUDE project, or anything not in an INCLUDE_ONLY list — Intentos does
 * not intervene at all: the action is allowed without ever reaching policy evaluation, not
 * merely "happens to be allowed by a rule." A folder in scope stays fully governed by every
 * active contract exactly as before (e.g. .env still BLOCKs there); a folder out of scope
 * is invisible to Intentos, by design — not a lesser form of governed.
 */
function applyScope(
  token: { scope_mode: string; scope_projects: string[] },
  call: { project?: { normalized_repo?: string; repo_root?: string; cwd?: string } }
): { verdict: Verdict; reason: string; matchedPolicyId: null } | null {
  if (token.scope_mode === "all" || token.scope_projects.length === 0) return null;

  const projectKey = (call.project?.normalized_repo || call.project?.repo_root || call.project?.cwd || "").toLowerCase();
  const matches = projectKey !== "" && token.scope_projects.some((p) => projectKey.includes(p.toLowerCase()));

  const outOfScope = token.scope_mode === "exclude" ? matches : token.scope_mode === "include_only" ? !matches : false;
  if (outOfScope) {
    return { verdict: "allow", reason: "Outside this device's governed scope — Intentos does not intervene here.", matchedPolicyId: null };
  }
  return null;
}

export async function checkRoute(app: FastifyInstance) {
  app.post("/v1/check", async (req, reply) => {
    const started = Date.now();

    const authHeader = req.headers.authorization;
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!rawToken) {
      return reply.code(401).send({ error: "Missing bearer token" });
    }

    const token = await resolveToken(rawToken);
    if (!token) {
      return reply.code(401).send({ error: "Invalid or revoked token" });
    }

    const parsed = CheckBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const call = parsed.data;

    const scopeOverride = applyScope(token as unknown as { scope_mode: string; scope_projects: string[] }, call);
    let result: { verdict: Verdict; reason: string; matchedPolicyId: string | null };
    if (scopeOverride) {
      result = scopeOverride;
    } else {
      const projectKey = (call.project?.normalized_repo || call.project?.repo_root || call.project?.cwd || "").toLowerCase();
      // A contract with a project_scope only governs actions whose project identity contains
      // that text — same substring convention used everywhere else in this schema. A contract
      // with no scope (every pre-existing one) stays org-wide, unaffected by this join.
      const policies = (await sql`
        select p.id, p.rule_name, p.condition, p.action, p.priority, p.reason
        from policies p
        left join intent_contracts c on c.id = p.contract_id
        where p.org_id = ${token.org_id} and p.active = true
          and (c.project_scope is null or ${projectKey} like '%' || lower(c.project_scope) || '%')
      `) as unknown as PolicyRow[];
      result = evaluate(call, policies);
    }
    const latencyMs = Date.now() - started;
    const approvalStatus = result.verdict === "review" ? "pending" : null;
    // Bounds how long a pending review stays approvable — independent of, and normally longer
    // than, the PreToolUse hook's own timeout. A reviewer approving after the hook already gave
    // up still lands on a resolved (if late) approval rather than a silently-stuck pending one.
    const expiresAt = result.verdict === "review" ? sql`now() + interval '10 minutes'` : sql`null`;

    const projectJson = call.project ? sql.json(JSON.parse(JSON.stringify(call.project))) : null;
    const [decisionRow] = await sql`
      insert into decisions
        (org_id, token_id, tool_name, tool_input, decision, reason, matched_policy_id, latency_ms, approval_status, expires_at, project, employee_email)
      values
        (${token.org_id}, ${token.id}, ${call.tool_name}, ${sql.json(JSON.parse(JSON.stringify(call.tool_input)))},
         ${result.verdict}, ${result.reason}, ${result.matchedPolicyId}, ${latencyMs}, ${approvalStatus}, ${expiresAt}, ${projectJson}, ${token.owner_email})
      returning id
    `;

    const response = { decision: result.verdict, reason: result.reason, id: decisionRow.id };

    // Agent Activity is observational — a failure here must never change the governance
    // response already computed above (see FAILURE BEHAVIOR: telemetry != enforcement).
    if (call.provider && call.external_session_id) {
      try {
        await recordActivity({
          orgId: token.org_id,
          agentTokenId: token.id,
          employeeEmail: token.owner_email,
          provider: call.provider,
          externalSessionId: call.external_session_id,
          externalEventId: call.external_event_id ?? null,
          toolName: call.tool_name,
          toolInput: call.tool_input,
          decisionId: decisionRow.id,
          verdict: result.verdict,
        });
      } catch (err) {
        app.log.error({ err }, "activity logging failed — governance decision already returned unaffected");
      }
    }

    return reply.send(response);
  });
}

async function recordActivity(input: {
  orgId: string;
  agentTokenId: string;
  employeeEmail: string | null;
  provider: string;
  externalSessionId: string;
  externalEventId: string | null;
  toolName: string;
  toolInput: Record<string, unknown>;
  decisionId: string;
  verdict: Verdict;
}) {
  // Defensive: create the run if SessionStart wasn't received for some reason, so activity is never silently dropped.
  let [run] = await sql`
    select id, activity_count from agent_runs
    where org_id = ${input.orgId} and provider = ${input.provider} and external_session_id = ${input.externalSessionId}
  `;
  if (!run) {
    [run] = await sql`
      insert into agent_runs (org_id, agent_token_id, provider, external_session_id, status, employee_email)
      values (${input.orgId}, ${input.agentTokenId}, ${input.provider}, ${input.externalSessionId}, 'running', ${input.employeeEmail})
      returning id, activity_count
    `;
  }

  const { category, action, resource } = classifyActivity(input.toolName, input.toolInput);
  const sanitizedContext = redactContext(input.toolInput);
  const sanitizedResource = resource ? redactString(resource) : null;

  await sql`
    insert into activity_events
      (org_id, run_id, agent_token_id, provider, external_event_id, sequence_number, event_type, category,
       tool, action, resource, context, decision_id, decision, execution_status, "timestamp", employee_email)
    values
      (${input.orgId}, ${run.id}, ${input.agentTokenId}, ${input.provider}, ${input.externalEventId},
       ${run.activity_count + 1}, 'PreToolUse', ${category}, ${input.toolName}, ${action}, ${sanitizedResource},
       ${sql.json(JSON.parse(JSON.stringify(sanitizedContext)))}, ${input.decisionId}, ${input.verdict}, ${EXECUTION_STATUS_FOR[input.verdict]}, now(), ${input.employeeEmail})
  `;

  if (input.verdict === "allow") {
    await sql`update agent_runs set activity_count = activity_count + 1, allow_count = allow_count + 1 where id = ${run.id}`;
  } else if (input.verdict === "block") {
    await sql`update agent_runs set activity_count = activity_count + 1, block_count = block_count + 1 where id = ${run.id}`;
  } else {
    await sql`update agent_runs set activity_count = activity_count + 1, review_count = review_count + 1 where id = ${run.id}`;
  }
}
