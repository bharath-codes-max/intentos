import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../middleware/adminAuth.js";
import { compileFallback, enrichFileConditions, splitFalseAndConditions, fillMissingConditions, fixDeleteConditions, excludeReadsFromWriteConditions, fixPushMainConditions, CompiledRule, SingleCondition } from "../engine/compile-fallback.js";
import { randomId } from "../utils.js";

const CompileBody = z.object({
  text: z.string().min(1),
  agent_type: z.string().optional(),
});

const CONDITION_SCHEMA = {
  type: "array",
  description: "Zero or more comparisons, ANDed together. Empty array means this rule is informational only and cannot be automatically enforced.",
  items: {
    type: "object",
    properties: {
      field: {
        type: "string",
        description: "Dotted path into the action being checked, e.g. tool_input.file_path, tool_input.command, tool_input.amount, tool_input.confidence, tool_name.",
      },
      op: {
        type: "string",
        enum: ["contains", "equals", "not_contains", "lt", "lte", "gt", "gte"],
        description: "contains/equals/not_contains for text fields; lt/lte/gt/gte for numeric fields like amount or confidence.",
      },
      value: { type: "string", description: "The value to compare against, as a string (numbers written as plain digits, e.g. '1000')." },
    },
    required: ["field", "op", "value"],
    additionalProperties: false,
  },
} as const;

const RULE_SCHEMA = {
  name: "intent_contract",
  strict: true,
  schema: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        description: "Short domain classification, e.g. 'coding', 'healthcare-claims', 'finance', 'procurement', 'customer-support', 'hr', 'sales', 'data-analytics', 'devops'. Two words max.",
      },
      summary: { type: "string", description: "One sentence summarizing what this contract authorizes." },
      rules: {
        type: "array",
        description:
          "Every distinct permission or restriction implied by the intent, compiled into individual rules — cover both what is explicitly allowed AND what is blocked or requires review. Use one rule per condition branch (e.g. three dollar tiers = three rules).",
        items: {
          type: "object",
          properties: {
            resource: { type: "string", description: "What is being acted on, e.g. source_code, secret, database, claim, transaction, purchase_order, refund. snake_case." },
            resource_action: { type: "string", description: "What's being done to it, e.g. read, modify, delete, push_main, deploy_production, process, create. snake_case." },
            effect: { type: "string", enum: ["ALLOW", "BLOCK", "REVIEW"] },
            reason: { type: "string", description: "Short (under 15 words) plain-English reason." },
            condition: CONDITION_SCHEMA,
          },
          required: ["resource", "resource_action", "effect", "reason", "condition"],
          additionalProperties: false,
        },
      },
    },
    required: ["domain", "summary", "rules"],
    additionalProperties: false,
  },
} as const;

function normalizeCondition(condition: SingleCondition[]): SingleCondition | SingleCondition[] | null {
  if (condition.length === 0) return null;
  if (condition.length === 1) return condition[0];
  return condition;
}

export async function compileIntentRoutes(app: FastifyInstance) {
  app.post("/v1/compile-intent", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = CompileBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const { text, agent_type } = parsed.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallback = compileFallback(text);
      return reply.send({ ...fallback, source: "fallback", note: "No OPENAI_API_KEY configured — using local keyword compiler." });
    }

    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are the policy compiler inside Intentos, a permission and authorization layer for AI agents across any domain — coding, healthcare, finance, procurement, support, HR, sales, analytics, devops. Convert a human's plain-English intent into a complete, domain-agnostic set of enforceable rules.\n\n" +
                "CRITICAL: every BLOCK or REVIEW rule MUST include a non-empty `condition` array — an empty condition array means the rule can NEVER fire at runtime, which silently defeats the entire policy. Only leave `condition` empty for a broad, unconditional ALLOW statement (e.g. 'can read source code' with no restriction).\n\n" +
                "Ground every condition in what the runtime action actually looks like. For a coding agent (Codex, Claude Code, Cursor, Copilot), EVERY action — reading a file, running a command, deleting something — arrives as {tool_name: \"Bash\"|\"Read\"|\"Write\", tool_input: {command, file_path}}. These agents have NO abstract tool names like \"read_environment_files\" — they only ever send a real shell command string or a real file path. So for ANY coding-domain resource that corresponds to a file or a shell action — .env files, credentials files, secret files, config files, source files, database commands, git commands, deploy commands — you MUST use tool_input.file_path or tool_input.command with contains/not_contains, matching the literal substring a real command or path would contain. Never invent a tool_name for these. Examples:\n" +
                "- \"blocked from reading secrets/.env/credentials\" → TWO rules: [{field: \"tool_input.file_path\", op: \"contains\", value: \".env\"}] AND a second rule [{field: \"tool_input.command\", op: \"contains\", value: \".env\"}] (coding agents often read files via a shell command like `cat .env` or `awk ... .env`, not always a dedicated file-read call)\n" +
                "- \"credentials/secrets file access blocked\" → same pattern: match \"credentials\" or \"secret\" as a substring of tool_input.file_path AND tool_input.command\n" +
                "- \"pushing to main requires review\" → condition: [{field: \"tool_input.command\", op: \"contains\", value: \"push origin main\"}]\n" +
                "- \"deploying to production requires review\" → condition: [{field: \"tool_input.command\", op: \"contains\", value: \"deploy\"}, {field: \"tool_input.command\", op: \"not_contains\", value: \"grep\"}, {field: \"tool_input.command\", op: \"not_contains\", value: \"echo\"}, {field: \"tool_input.command\", op: \"not_contains\", value: \"cat \"}, {field: \"tool_input.command\", op: \"not_contains\", value: \"find \"}, {field: \"tool_input.command\", op: \"not_contains\", value: \"ls \"}] — a command that merely MENTIONS the word \"deploy\" (grep, echo, reading a doc, listing a config file) is not a deployment; only an actual invocation is. This same read-vs-write distinction applies to any action word describing something that CAN be run destructively but can also just be searched/read/listed for — always add not_contains exclusions for the common inspection verbs (grep, echo, cat, find, ls, sed -n, head, tail, less, more, awk, wc, stat, git show/diff/log/blame) rather than a bare contains on the action word alone.\n" +
                "- \"deleting files requires review\" → condition: [{field: \"tool_input.command\", op: \"contains\", value: \"rm \"}]\n" +
                "- \"claims under $1,000 with confidence above 95% auto-process\" → condition: [{field: \"tool_input.amount\", op: \"lt\", value: \"1000\"}, {field: \"tool_input.confidence\", op: \"gt\", value: \"95\"}] (numeric fields live directly under tool_input for non-coding agents that call the check API with their own structured data, e.g. amount, confidence, discount_percent)\n" +
                "- \"orders above $25,000 blocked\" → condition: [{field: \"tool_input.amount\", op: \"gt\", value: \"25000\"}]\n" +
                "CRITICAL — AND vs separate rules: the condition array means every clause must be true AT THE SAME TIME (logical AND). Never put alternative trigger words into one array — e.g. for \"blocked from reading .env files, credentials, or api keys\" you must emit THREE SEPARATE rules (one for .env, one for credentials, one for api_keys — each its own single-clause rule, doubled for file_path+command as shown above), NOT one rule with all six conditions ANDed together. An ANDed rule like that would require a single command to contain '.env' AND 'credentials' AND 'api_keys' simultaneously, which will almost never happen — silently defeating the policy exactly like an empty condition would. Only combine clauses into one array when they truly must hold together, like an amount threshold AND a confidence threshold on the same numeric event.\n\n" +
                "Only fall back to a made-up tool_name convention ([{field: \"tool_name\", op: \"equals\", value: \"<resource_action>_<resource>\"}]) for NON-coding, business-level actions that a real custom agent SDK would name explicitly and that have no natural file/command/numeric representation — e.g. \"modifying medical records is blocked\", \"exporting member data is blocked\" in a healthcare or CRM context. This fallback must never be used for coding-agent file or command actions.\n\n" +
                "Do not assume a coding context unless the intent is actually about code — for healthcare/finance/procurement/support intents, use tool_input.amount, tool_input.confidence, tool_input.discount_percent, or other domain-appropriate numeric/string fields instead of file_path/command. Cover every explicit permission, threshold, and restriction mentioned — use one rule per condition branch (e.g. three dollar tiers = three separate rules, each individually enforceable).",
            },
            {
              role: "user",
              content: `Agent type: ${agent_type ?? "unspecified"}\n\nIntent:\n${text}`,
            },
          ],
          response_format: { type: "json_schema", json_schema: RULE_SCHEMA },
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        const fallback = compileFallback(text);
        return reply.send({
          ...fallback,
          source: "fallback",
          note: `OpenAI request failed (${res.status}) — used local compiler instead.`,
          error: errText.slice(0, 300),
        });
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        const fallback = compileFallback(text);
        return reply.send({ ...fallback, source: "fallback", note: "OpenAI returned no content — used local compiler instead." });
      }

      const parsedContent = JSON.parse(content) as {
        domain: string;
        summary: string;
        rules: { resource: string; resource_action: string; effect: "ALLOW" | "BLOCK" | "REVIEW"; reason: string; condition: SingleCondition[] }[];
      };

      const compiledRules: CompiledRule[] = parsedContent.rules.map((r) => ({
        id: randomId("rule"),
        resource: r.resource,
        resource_action: r.resource_action,
        effect: r.effect,
        reason: r.reason,
        condition: normalizeCondition(r.condition),
      }));
      const filled = fillMissingConditions(compiledRules, parsedContent.domain);
      const enriched = enrichFileConditions(splitFalseAndConditions(filled), parsedContent.domain);
      const deletesFixed = fixDeleteConditions(enriched, parsedContent.domain);
      const readsExcluded = excludeReadsFromWriteConditions(deletesFixed, parsedContent.domain);
      const rules = fixPushMainConditions(readsExcluded, parsedContent.domain);

      return reply.send({ domain: parsedContent.domain, summary: parsedContent.summary, rules, source: "openai", model });
    } catch (err) {
      const fallback = compileFallback(text);
      return reply.send({
        ...fallback,
        source: "fallback",
        note: "OpenAI call errored — used local compiler instead.",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
