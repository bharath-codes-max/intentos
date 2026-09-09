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
});

const EXECUTION_STATUS_FOR: Record<Verdict, "denied" | "waiting_approval" | "attempted"> = {
  block: "denied",
  review: "waiting_approval",
  allow: "attempted",
};

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

    const policies = (await sql`
      select id, rule_name, condition, action, priority, reason
      from policies
      where org_id = ${token.org_id} and active = true
    `) as unknown as PolicyRow[];

    const result = evaluate(call, policies);
    const latencyMs = Date.now() - started;
    const approvalStatus = result.verdict === "review" ? "pending" : null;
    // Bounds how long a pending review stays approvable — independent of, and normally longer
    // than, the PreToolUse hook's own timeout. A reviewer approving after the hook already gave
    // up still lands on a resolved (if late) approval rather than a silently-stuck pending one.
    const expiresAt = result.verdict === "review" ? sql`now() + interval '10 minutes'` : sql`null`;

    const [decisionRow] = await sql`
      insert into decisions
        (org_id, token_id, tool_name, tool_input, decision, reason, matched_policy_id, latency_ms, approval_status, expires_at)
      values
        (${token.org_id}, ${token.id}, ${call.tool_name}, ${sql.json(JSON.parse(JSON.stringify(call.tool_input)))},
         ${result.verdict}, ${result.reason}, ${result.matchedPolicyId}, ${latencyMs}, ${approvalStatus}, ${expiresAt})
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
      insert into agent_runs (org_id, agent_token_id, provider, external_session_id, status)
      values (${input.orgId}, ${input.agentTokenId}, ${input.provider}, ${input.externalSessionId}, 'running')
      returning id, activity_count
    `;
  }

  const { category, action, resource } = classifyActivity(input.toolName, input.toolInput);
  const sanitizedContext = redactContext(input.toolInput);
  const sanitizedResource = resource ? redactString(resource) : null;

  await sql`
    insert into activity_events
      (org_id, run_id, agent_token_id, provider, external_event_id, sequence_number, event_type, category,
       tool, action, resource, context, decision_id, decision, execution_status, "timestamp")
    values
      (${input.orgId}, ${run.id}, ${input.agentTokenId}, ${input.provider}, ${input.externalEventId},
       ${run.activity_count + 1}, 'PreToolUse', ${category}, ${input.toolName}, ${action}, ${sanitizedResource},
       ${sql.json(JSON.parse(JSON.stringify(sanitizedContext)))}, ${input.decisionId}, ${input.verdict}, ${EXECUTION_STATUS_FOR[input.verdict]}, now())
  `;

  if (input.verdict === "allow") {
    await sql`update agent_runs set activity_count = activity_count + 1, allow_count = allow_count + 1 where id = ${run.id}`;
  } else if (input.verdict === "block") {
    await sql`update agent_runs set activity_count = activity_count + 1, block_count = block_count + 1 where id = ${run.id}`;
  } else {
    await sql`update agent_runs set activity_count = activity_count + 1, review_count = review_count + 1 where id = ${run.id}`;
  }
}
