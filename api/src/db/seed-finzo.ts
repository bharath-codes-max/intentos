import { randomBytes } from "node:crypto";
import { sql } from "./pool.js";
import { hashToken } from "../middleware/auth.js";

const rawToken = "sk-finzo-cc-" + randomBytes(6).toString("hex");

const [org] = await sql`
  insert into orgs (name) values ('Finzo') returning id
`;

await sql`
  insert into agent_tokens (org_id, token_hash, agent_type, label)
  values (${org.id}, ${hashToken(rawToken)}, 'claude-code', 'Finzo engineering — Claude Code')
`;

const rules: { rule_name: string; condition: object; action: "ALLOW" | "BLOCK" | "REVIEW"; priority: number }[] = [
  { rule_name: "Block .env reads", condition: { field: "tool_input.file_path", op: "contains", value: ".env" }, action: "BLOCK", priority: 30 },
  { rule_name: "Block push to main", condition: { field: "tool_input.command", op: "contains", value: "push origin main" }, action: "BLOCK", priority: 30 },
  { rule_name: "Review DELETE commands", condition: { field: "tool_input.command", op: "contains", value: "delete" }, action: "REVIEW", priority: 20 },
  { rule_name: "Block DROP TABLE", condition: { field: "tool_input.command", op: "contains", value: "drop table" }, action: "BLOCK", priority: 30 },
];

for (const rule of rules) {
  await sql`
    insert into policies (org_id, rule_name, condition, action, priority)
    values (${org.id}, ${rule.rule_name}, ${JSON.stringify(rule.condition)}, ${rule.action}, ${rule.priority})
  `;
}

console.log("Finzo org created.");
console.log("Org ID:    ", org.id);
console.log("Agent token:", rawToken, "  <-- save this, it will not be shown again");
await sql.end();
