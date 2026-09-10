import { randomId } from "../utils.js";

export type Effect = "ALLOW" | "BLOCK" | "REVIEW";

export interface SingleCondition {
  field: string;
  op: "contains" | "equals" | "not_contains" | "lt" | "lte" | "gt" | "gte";
  value: string;
}

export interface CompiledRule {
  id: string;
  resource: string;
  resource_action: string;
  effect: Effect;
  reason: string;
  condition: SingleCondition | SingleCondition[] | null;
}

/**
 * Domain-agnostic, no-LLM fallback compiler. Splits the intent into clauses and
 * classifies each one, mapping recognizable patterns onto the same {field, op, value}
 * condition shape the deterministic runtime engine evaluates — so whatever this
 * produces is genuinely enforceable, not just descriptive text.
 */

const BLOCK_MARKERS = /\b(never|don't|do not|must not|cannot|can't|not allowed to|no access to|not allow|is blocked|blocked)\b/i;
const REVIEW_MARKERS = /\b(require[s]? (human )?approval|require[s]? review|needs? approval|send for (human )?review|must be reviewed|require[s]? sign[- ]?off)\b/i;

function classifyEffect(clause: string): Effect {
  if (BLOCK_MARKERS.test(clause)) return "BLOCK";
  if (REVIEW_MARKERS.test(clause)) return "REVIEW";
  return "ALLOW";
}

function cleanLabel(clause: string): string {
  const s = clause
    .trim()
    .replace(/^(allow(?:ing)?|let|permit)\s+(the\s+)?[\w\s-]+?(agent|assistant)\s+to\s+/i, "")
    .replace(/^it\s+(may|can)\s+/i, "")
    .replace(/^never\s+allow\s+(the\s+)?[\w\s-]+?(agent|assistant)\s+to\s+/i, "")
    .replace(/^the\s+agent\s+(may|can|must not|should never)\s+/i, "");
  return (s.charAt(0).toUpperCase() + s.slice(1)).replace(/[.;]+$/, "").trim();
}

interface Pattern {
  test: RegExp;
  resource: string;
  resource_action: string;
  condition: (m: RegExpMatchArray) => SingleCondition | SingleCondition[] | null;
}

const PATTERNS: Pattern[] = [
  {
    test: /\.env|environment file|credential|secret|api key|production secret/i,
    resource: "secret",
    resource_action: "read",
    condition: () => [
      { field: "tool_input.file_path", op: "contains", value: ".env" },
    ],
  },
  {
    test: /push(?:ing)?\s+(?:directly\s+)?(?:to|origin)?\s*main|push\s+main/i,
    resource: "repository",
    resource_action: "push_main",
    condition: () => [
      { field: "tool_input.command", op: "contains", value: "git push" },
      { field: "tool_input.command", op: "contains", value: "main" },
    ],
  },
  {
    test: /deploy(?:ing)?\s+(?:to\s+)?production|production deployment/i,
    resource: "deployment",
    resource_action: "deploy_production",
    condition: () => ({ field: "tool_input.command", op: "contains", value: "deploy" }),
  },
  {
    test: /drop\s+table|drop\s+database/i,
    resource: "database",
    resource_action: "drop",
    condition: (m) => ({ field: "tool_input.command", op: "contains", value: m[0].toLowerCase() }),
  },
  {
    test: /delet(?:e|ing)\s+(?:any\s+)?(?:source[- ]?code\s+)?file|destructive\s+(?:source-code|file)\s+operation/i,
    resource: "source_code",
    resource_action: "delete",
    condition: () => ({ field: "tool_input.command", op: "contains", value: "rm " }),
  },
  {
    test: /delet(?:e|ing)\s+(?:a\s+)?(?:record|row|customer|crm)|delete\s+from/i,
    resource: "database",
    resource_action: "delete_record",
    condition: () => ({ field: "tool_input.command", op: "contains", value: "delete" }),
  },
  {
    test: /destructive\s+(?:database|sql)|drop\s+or\s+delete/i,
    resource: "database",
    resource_action: "destructive_operation",
    condition: () => ({ field: "tool_input.command", op: "contains", value: "drop" }),
  },
  {
    test: /read(?:ing)?\s+(?:and\s+modify(?:ing)?\s+)?(?:normal\s+)?source[- ]?code|modify(?:ing)?\s+(?:normal\s+)?source[- ]?code/i,
    resource: "source_code",
    resource_action: "read_write",
    condition: () => null,
  },
  {
    test: /run(?:ning)?\s+tests?/i,
    resource: "test",
    resource_action: "execute",
    condition: () => null,
  },
  {
    test: /feature branch/i,
    resource: "repository",
    resource_action: "create_branch",
    condition: () => null,
  },
];

/** "under $1,000", "between $1,000 and $10,000", "above $10,000" → numeric conditions on tool_input.amount */
function extractAmountConditions(clause: string): SingleCondition[] {
  const lower = clause.toLowerCase();
  const between = lower.match(/between\s*\$?([\d,]+)\s*(?:and|-|to)\s*\$?([\d,]+)/);
  if (between) {
    return [
      { field: "tool_input.amount", op: "gte", value: between[1].replace(/,/g, "") },
      { field: "tool_input.amount", op: "lte", value: between[2].replace(/,/g, "") },
    ];
  }
  const under = lower.match(/(?:under|below|less than)\s*\$?([\d,]+)/);
  const over = lower.match(/(?:above|over|more than|exceed(?:s|ing)?)\s*\$?([\d,]+)/);
  const discountOver = lower.match(/discounts?\s+above\s+(\d+)%/);
  const conditions: SingleCondition[] = [];
  if (under) conditions.push({ field: "tool_input.amount", op: "lt", value: under[1].replace(/,/g, "") });
  if (over && !under) conditions.push({ field: "tool_input.amount", op: "gt", value: over[1].replace(/,/g, "") });
  if (discountOver) conditions.push({ field: "tool_input.discount_percent", op: "gt", value: discountOver[1] });

  const confAbove = lower.match(/confidence[^.]*?(?:above|over|greater than)\s*(\d+)%/);
  const confBelow = lower.match(/confidence[^.]*?(?:below|under|less than)\s*(\d+)%/);
  if (confAbove) conditions.push({ field: "tool_input.confidence", op: "gt", value: confAbove[1] });
  if (confBelow) conditions.push({ field: "tool_input.confidence", op: "lt", value: confBelow[1] });

  return conditions;
}

function detectAmountResource(clause: string): { resource: string; resource_action: string } {
  const lower = clause.toLowerCase();
  if (/claim/.test(lower)) return { resource: "claim", resource_action: "process" };
  if (/refund/.test(lower)) return { resource: "refund", resource_action: "process" };
  if (/transaction|transfer/.test(lower)) return { resource: "transaction", resource_action: "create" };
  if (/purchase order|vendor|order/.test(lower)) return { resource: "purchase_order", resource_action: "create" };
  if (/discount/.test(lower)) return { resource: "pricing", resource_action: "discount" };
  return { resource: "transaction", resource_action: "process" };
}

export function detectDomain(text: string): string {
  const lower = text.toLowerCase();
  if (/claim|member|eligibility|medical|provider|phi\b/.test(lower)) return "healthcare-claims";
  if (/repo|branch|push|deploy|pull request|staging|production|code|github|codex|cursor|copilot/.test(lower)) return "coding";
  if (/transaction|wire|bank detail|financial report|transfer/.test(lower)) return "finance";
  if (/vendor|purchase order|procurement/.test(lower)) return "procurement";
  if (/ticket|refund|customer|escalat|support/.test(lower)) return "customer-support";
  if (/payroll|compensation|employee|benefits|hr\b/.test(lower)) return "hr";
  if (/crm|prospect|outreach|campaign|sales/.test(lower)) return "sales";
  if (/dataset|analytics|aggregat|pii/.test(lower)) return "data-analytics";
  if (/infrastructure|iam|deployment|staging|devops/.test(lower)) return "devops";
  return "general";
}

/**
 * A rule whose condition ANDs two or more clauses on the SAME field+op but DIFFERENT values
 * (e.g. file_path contains ".env" AND file_path contains "credentials") is almost always a
 * compiler mistake — it demands a single string simultaneously contain two unrelated
 * substrings, which will practically never match, silently defeating the rule. This is a
 * real failure mode observed live (a "block secrets" rule ANDed .env/credentials/api_keys
 * into one never-firing condition). Splitting into one rule per clause is always safe: it
 * can only make a too-narrow rule fire in more of the cases the author actually meant.
 * Genuine ANDs across DIFFERENT fields (amount + confidence) are left untouched — except
 * tool_input.file_path + tool_input.command specifically, which are mutually exclusive in
 * practice (a real coding-agent tool call populates one or the other, never both meaningfully),
 * so ANDing across just those two is the same "wants an OR, wrote an AND" mistake, just
 * expressed as two different fields instead of two values on the same field.
 */
export function splitFalseAndConditions(rules: CompiledRule[]): CompiledRule[] {
  const out: CompiledRule[] = [];
  for (const rule of rules) {
    if (!Array.isArray(rule.condition) || rule.condition.length < 2) {
      out.push(rule);
      continue;
    }
    const byFieldOp = new Map<string, SingleCondition[]>();
    for (const clause of rule.condition) {
      const key = `${clause.field}::${clause.op}`;
      byFieldOp.set(key, [...(byFieldOp.get(key) ?? []), clause]);
    }
    const sameFieldRepeated = [...byFieldOp.values()].some((clauses) => clauses.length > 1);
    const fields = new Set(rule.condition.map((c) => c.field));
    const mixesFilePathAndCommand = fields.has("tool_input.file_path") && fields.has("tool_input.command");

    if (!sameFieldRepeated && !mixesFilePathAndCommand) {
      out.push(rule);
      continue;
    }
    for (const clause of rule.condition) {
      out.push({ ...rule, id: randomId("rule"), condition: clause });
    }
  }
  return out;
}

const FILENAME_LIKE = /\.[a-z0-9]{2,5}$/i;

/**
 * The LLM occasionally still emits a BLOCK/REVIEW rule with condition: null despite the
 * explicit prompt instruction against it (observed live: a "block vercel.json modifications"
 * rule with no condition at all, which can never fire). Rather than trust prompt-following
 * alone a second time, deterministically recover a condition whenever the rule names a
 * specific filename-like resource (e.g. "vercel.json") — the same file_path+command pair
 * enrichFileConditions would add for a single-clause rule, produced here for a null one.
 */
export function fillMissingConditions(rules: CompiledRule[], domain: string): CompiledRule[] {
  if (domain !== "coding") return rules;
  return rules.map((rule) => {
    if (rule.condition !== null || rule.effect === "ALLOW") return rule;
    const candidate = FILENAME_LIKE.test(rule.resource) ? rule.resource : null;
    if (!candidate) return rule;
    return {
      ...rule,
      condition: [
        { field: "tool_input.file_path", op: "contains", value: candidate },
        { field: "tool_input.command", op: "contains", value: candidate },
      ],
    };
  });
}

/**
 * Coding agents (Codex, Claude Code, Cursor, Copilot) represent "read a file" two different
 * ways depending on the host: a dedicated Read tool with a file_path, or a shell command like
 * `cat .env` / `awk ... .env` with no file_path field at all. A rule that only checks file_path
 * silently fails to catch the shell-command form — this is a real gap we hit and fixed once
 * already (see the real Codex test against Finzo). Rather than trust every compiler path (LLM
 * or fallback) to always remember both forms, add the missing sibling deterministically.
 */
export function enrichFileConditions(rules: CompiledRule[], domain: string): CompiledRule[] {
  if (domain !== "coding") return rules;

  const existingCommandValues = new Set(
    rules.flatMap((r) => {
      const clauses = Array.isArray(r.condition) ? r.condition : r.condition ? [r.condition] : [];
      return clauses.filter((c) => c.field === "tool_input.command").map((c) => c.value.toLowerCase());
    })
  );

  const additions: CompiledRule[] = [];
  for (const rule of rules) {
    const clauses = Array.isArray(rule.condition) ? rule.condition : rule.condition ? [rule.condition] : [];
    if (clauses.length !== 1) continue; // only single-clause file_path rules need the sibling
    const [clause] = clauses;
    if (clause.field !== "tool_input.file_path" || clause.op !== "contains") continue;
    if (existingCommandValues.has(clause.value.toLowerCase())) continue;

    additions.push({
      id: randomId("rule"),
      resource: rule.resource,
      resource_action: rule.resource_action,
      effect: rule.effect,
      reason: rule.reason,
      condition: { field: "tool_input.command", op: "contains", value: clause.value },
    });
  }

  return [...rules, ...additions];
}

const DELETE_SIGNATURES = ["rm ", "Delete File"];

/**
 * A coding agent can delete a file two genuinely different ways — a shell `rm <path>`, or
 * apply_patch's `*** Delete File: <path>` patch syntax — and a rule only catching one of them
 * is a real, observed failure mode: a policy with only the `rm ` form let an apply_patch
 * delete through as default-ALLOW, and was only saved once by an unrelated rule (the file
 * happened to also match a `.env`-name BLOCK clause). The fix isn't "does this rule reference
 * SOME delete syntax" — a rule referencing only one of the two forms still misses the other.
 * For every delete-tagged rule, ensure BOTH proven signatures exist as separate OR'd rules,
 * adding whichever the compiler didn't already produce. Generic: applies to any delete-tagged
 * rule from either compiler path, not specific to any one policy's wording.
 */
export function fixDeleteConditions(rules: CompiledRule[], domain: string): CompiledRule[] {
  if (domain !== "coding") return rules;

  const out: CompiledRule[] = [];
  for (const rule of rules) {
    const isDeleteRule = rule.resource_action.toLowerCase().includes("delete") && rule.effect !== "ALLOW";
    if (!isDeleteRule) {
      out.push(rule);
      continue;
    }

    const clauses = Array.isArray(rule.condition) ? rule.condition : rule.condition ? [rule.condition] : [];
    const nonDeleteClauses = clauses.filter(
      (c) => !(c.field === "tool_input.command" && DELETE_SIGNATURES.some((sig) => c.value.toLowerCase() === sig.toLowerCase()))
    );
    // Keep any OTHER condition the rule had (e.g. scoped to a specific directory) untouched —
    // only the delete-detection clause itself is being normalized, not the whole rule.
    if (nonDeleteClauses.length > 0) out.push({ ...rule, condition: nonDeleteClauses.length === 1 ? nonDeleteClauses[0] : nonDeleteClauses });

    for (const value of DELETE_SIGNATURES) {
      out.push({ ...rule, id: randomId("rule"), condition: { field: "tool_input.command", op: "contains", value } });
    }
  }
  return out;
}

/**
 * A "pushing to main requires review" rule compiled as a literal `command contains "push
 * origin main"` is real-world fragile — observed live: `git push -u origin main` (upstream
 * tracking, a completely normal way to push) doesn't contain that exact phrase, so the rule
 * never fired and the push went through as default-ALLOW. Flag order and extra args (-u,
 * --set-upstream, --force-with-lease) are all common and all break a literal phrase match.
 * Normalize any push_main-tagged rule to two AND'd, order-independent clauses instead — the
 * command contains "git push" AND contains "main" — which survives that variance. Trade-off,
 * disclosed rather than hidden: a bare `git push` relying on a pre-configured upstream (no
 * branch name in the command at all) still can't be distinguished from a push to any other
 * branch by command text alone; that remains a real, unclosed gap.
 */
export function fixPushMainConditions(rules: CompiledRule[], domain: string): CompiledRule[] {
  if (domain !== "coding") return rules;
  return rules.map((rule) => {
    if (rule.effect === "ALLOW" || !/push_?main/i.test(rule.resource_action)) return rule;
    return {
      ...rule,
      condition: [
        { field: "tool_input.command", op: "contains", value: "git push" },
        { field: "tool_input.command", op: "contains", value: "main" },
      ],
    };
  });
}

const WRITE_TAGGED_ACTIONS = /modify|edit|write|deploy/i;
const READ_ONLY_VERBS = [
  "cat ", "sed -n", "head ", "tail ", "less ", "more ", "grep ", "awk ", "wc ", "stat ", "file ",
  "git show ", "git diff ", "git log ", "git cat-file", "git blame ", "echo ", "find ", "ls ",
];

/**
 * A rule tagged as a write-type action (modify/edit/write/deploy) whose condition only checks
 * "does the command mention this filename" can't tell `sed -n '1,50p' vercel.json` (a read)
 * from `sed -i 's/x/y/' vercel.json` (a write) — observed live: a plain read of vercel.json got
 * BLOCKED by a "modifying vercel.json is blocked" rule, purely because the filename appeared in
 * the command at all. This is a heuristic, not a solved problem — arbitrary shell (a Python
 * one-liner opening the file in write mode, say) can still slip past a read-verb exclusion list.
 * But excluding the common, everyday read-only verbs removes the most common false-positive
 * blocks without weakening detection of actual writes (redirects, `sed -i`, `tee`, etc. still
 * match untouched). Only narrows the tool_input.command clause — a dedicated Write-tool's
 * file_path clause is left alone, since that tool is unambiguously a write already. Read/delete-
 * tagged rules are untouched; this only narrows rules that specifically mean to gate a write.
 */
export function excludeReadsFromWriteConditions(rules: CompiledRule[], domain: string): CompiledRule[] {
  if (domain !== "coding") return rules;
  return rules.map((rule) => {
    if (rule.effect === "ALLOW" || !WRITE_TAGGED_ACTIONS.test(rule.resource_action)) return rule;

    const clauses = Array.isArray(rule.condition) ? rule.condition : rule.condition ? [rule.condition] : [];
    const updated = clauses.map((c) => {
      if (c.field !== "tool_input.command" || c.op !== "contains") return c;
      return [c, ...READ_ONLY_VERBS.map((verb) => ({ field: "tool_input.command", op: "not_contains" as const, value: verb }))];
    });
    const flat = updated.flat();
    if (flat.length === clauses.length) return rule; // nothing changed (no command clause to narrow)
    return { ...rule, condition: flat.length === 1 ? flat[0] : flat };
  });
}

export function compileFallback(text: string): { domain: string; summary: string; rules: CompiledRule[] } {
  const clauses = text
    .split(/(?<=[.;])\s+|,\s+(?=and\s|it\s|the\s|never\s)/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 8);

  const rules: CompiledRule[] = [];

  for (const clause of clauses) {
    const effect = classifyEffect(clause);
    const label = cleanLabel(clause);
    if (!label) continue;

    const amountConditions = extractAmountConditions(clause);
    const pattern = PATTERNS.find((p) => p.test.test(clause));

    if (amountConditions.length > 0) {
      const { resource, resource_action } = detectAmountResource(clause);
      rules.push({
        id: randomId("rule"),
        resource,
        resource_action,
        effect,
        reason: label,
        condition: amountConditions.length === 1 ? amountConditions[0] : amountConditions,
      });
      continue;
    }

    if (pattern) {
      const match = clause.match(pattern.test)!;
      rules.push({
        id: randomId("rule"),
        resource: pattern.resource,
        resource_action: pattern.resource_action,
        effect,
        reason: label,
        condition: pattern.condition(match),
      });
      continue;
    }

    // No recognizable enforcement pattern — keep the rule for documentation/audit,
    // but it won't match any runtime action (condition null = never fires).
    rules.push({
      id: randomId("rule"),
      resource: "general",
      resource_action: "unspecified",
      effect,
      reason: label,
      condition: null,
    });
  }

  const domain = detectDomain(text);
  const filled = fillMissingConditions(rules, domain);
  const enriched = enrichFileConditions(splitFalseAndConditions(filled), domain);
  const deletesFixed = fixDeleteConditions(enriched, domain);
  const readsExcluded = excludeReadsFromWriteConditions(deletesFixed, domain);
  return { domain, summary: text.trim().slice(0, 160), rules: fixPushMainConditions(readsExcluded, domain) };
}
