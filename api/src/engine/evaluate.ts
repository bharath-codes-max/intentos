export type Verdict = "allow" | "block" | "review";

export interface PolicyRow {
  id: string;
  rule_name: string;
  condition: string | null;
  action: "ALLOW" | "BLOCK" | "REVIEW";
  priority: number;
  reason?: string | null;
}

export interface ToolCall {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

type Op = "contains" | "equals" | "not_contains" | "lt" | "lte" | "gt" | "gte";
const STRING_OPS: Op[] = ["contains", "equals", "not_contains"];
const NUMERIC_OPS: Op[] = ["lt", "lte", "gt", "gte"];

interface SingleCondition {
  field: string;
  op: Op;
  value: string;
}

/** A rule's condition is either one comparison, or an array of them ANDed together
 *  (needed for thresholds like "amount < 1000 AND confidence > 95"). */
type Condition = SingleCondition | SingleCondition[];

function readField(call: ToolCall, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = { tool_name: call.tool_name, tool_input: call.tool_input };
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function isSingleCondition(value: unknown): value is SingleCondition {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SingleCondition).field === "string" &&
    typeof (value as SingleCondition).value === "string" &&
    [...STRING_OPS, ...NUMERIC_OPS].includes((value as SingleCondition).op)
  );
}

function parseCondition(raw: string | null): Condition | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.every(isSingleCondition) ? (parsed as SingleCondition[]) : null;
    }
    return isSingleCondition(parsed) ? parsed : null;
  } catch {
    // malformed condition — treat as never-matching rather than crashing the check
    return null;
  }
}

function matchesOne(call: ToolCall, condition: SingleCondition): boolean {
  const actual = readField(call, condition.field);

  // A field that isn't part of THIS action's shape at all (e.g. tool_input.file_path on a
  // Bash call, which only ever carries `command`) can't be truthfully compared against
  // anything — including not_contains. Without this guard, not_contains on a missing field
  // silently evaluates true (an absent value trivially "doesn't contain" the target string),
  // which was a real bug: a rule meant to gate one specific action matched almost every
  // OTHER action that simply didn't populate that field. A genuinely-present-but-empty
  // field (actual === "") still flows through normally below.
  if (actual === undefined) return false;

  if (NUMERIC_OPS.includes(condition.op)) {
    const actualNum = typeof actual === "number" ? actual : Number(actual);
    const expectedNum = Number(condition.value);
    if (Number.isNaN(actualNum) || Number.isNaN(expectedNum)) return false;
    switch (condition.op) {
      case "lt":
        return actualNum < expectedNum;
      case "lte":
        return actualNum <= expectedNum;
      case "gt":
        return actualNum > expectedNum;
      case "gte":
        return actualNum >= expectedNum;
    }
  }

  const actualStr = (typeof actual === "string" ? actual : actual == null ? "" : String(actual)).toLowerCase();
  const expectedStr = condition.value.toLowerCase();
  switch (condition.op) {
    case "contains":
      return actualStr.includes(expectedStr);
    case "not_contains":
      return !actualStr.includes(expectedStr);
    case "equals":
      return actualStr === expectedStr;
    default:
      return false;
  }
}

function matches(call: ToolCall, condition: Condition): boolean {
  const clauses = Array.isArray(condition) ? condition : [condition];
  return clauses.every((c) => matchesOne(call, c));
}

const SEVERITY: Record<Verdict, number> = { block: 3, review: 2, allow: 1 };

/**
 * Evaluate every rule and collect the ones that actually match, then pick a winner by
 * (priority desc, severity desc) — explicit priority is respected first, but when two
 * matching rules tie on priority, BLOCK beats REVIEW beats ALLOW. A conflict never
 * silently resolves to ALLOW. No match at all → ALLOW (nothing governs this action yet).
 */
/**
 * Every condition compiled by either compiler path is written against a small set of fields —
 * overwhelmingly tool_input.file_path or tool_input.command (see compile-fallback.ts / the
 * OpenAI system prompt). A call whose tool_input has NEITHER field (e.g. a computer-use/GUI
 * automation tool with {code, title}, or some other MCP tool with its own shape) could never
 * have matched ANY policy no matter what it actually does — not because it was evaluated and
 * found safe, but because nothing in it was ever inspectable. Silently defaulting that to
 * ALLOW is a real, structural bypass (observed live: a Finder-automation delete attempt sailed
 * through with "No policy matched — default allow"). Defaulting instead to REVIEW for exactly
 * this shape-blind case — never for a normal Bash/Write/Read call that simply didn't trip any
 * rule — keeps the existing, already-tested default-allow behavior intact for everything a
 * policy actually could have judged.
 */
function hasEvaluableShape(call: ToolCall): boolean {
  return call.tool_input?.file_path !== undefined || call.tool_input?.command !== undefined;
}

export function evaluate(
  call: ToolCall,
  policies: PolicyRow[]
): { verdict: Verdict; reason: string; matchedPolicyId: string | null } {
  const matched = policies
    .map((policy) => ({ policy, condition: parseCondition(policy.condition) }))
    .filter(({ condition }) => condition && matches(call, condition));

  if (matched.length === 0) {
    if (!hasEvaluableShape(call)) {
      return {
        verdict: "review",
        reason: `Unrecognized action shape from tool "${call.tool_name}" — no file_path or command field for any policy to evaluate, so this cannot be confirmed safe. Requires human review.`,
        matchedPolicyId: null,
      };
    }
    return { verdict: "allow", reason: "No policy matched — default allow", matchedPolicyId: null };
  }

  matched.sort((a, b) => {
    if (b.policy.priority !== a.policy.priority) return b.policy.priority - a.policy.priority;
    const sevA = SEVERITY[a.policy.action.toLowerCase() as Verdict];
    const sevB = SEVERITY[b.policy.action.toLowerCase() as Verdict];
    return sevB - sevA;
  });

  const winner = matched[0].policy;
  return {
    verdict: winner.action.toLowerCase() as Verdict,
    reason: winner.reason ? winner.reason : `Matched policy "${winner.rule_name}"`,
    matchedPolicyId: winner.id,
  };
}
