export type ActivityCategory =
  | "FILE"
  | "COMMAND"
  | "CODE"
  | "DATABASE"
  | "API"
  | "NETWORK"
  | "DEPLOYMENT"
  | "TOOL"
  | "DATA"
  | "TEST"
  | "PACKAGE"
  | "GIT"
  | "SECURITY"
  | "OTHER";

export interface Classification {
  category: ActivityCategory;
  action: string;
  resource: string | null;
}

/**
 * Deterministic — no LLM at runtime. Classifies a tool call from its tool_name/tool_input
 * using pattern matching, the same way the policy engine's fallback compiler does.
 */
export function classifyActivity(toolName: string, toolInput: Record<string, unknown>): Classification {
  const command = typeof toolInput.command === "string" ? toolInput.command : "";
  const filePath = typeof toolInput.file_path === "string" ? toolInput.file_path : "";
  const lowerTool = toolName.toLowerCase();
  const lowerCmd = command.toLowerCase();

  // Codex's real file-edit tool — discovered from an actual session, not assumed up front.
  // It reports a unified-diff-style patch in tool_input.command, not a file_path field.
  if (/^apply_patch$/i.test(toolName)) {
    const action = /\*\*\*\s*Delete File/i.test(command)
      ? "delete"
      : /\*\*\*\s*Add File/i.test(command)
        ? "create"
        : "modify";
    const pathMatch = command.match(/\*\*\*\s*(?:Add|Update|Delete) File:\s*(\S+)/i);
    return { category: "CODE", action, resource: pathMatch ? pathMatch[1] : null };
  }

  if (/^(read|write|edit)$/i.test(toolName) || filePath) {
    const action = /read/i.test(toolName) ? "read" : /write/i.test(toolName) ? "write" : /edit/i.test(toolName) ? "modify" : "access";
    if (/\.env|credential|secret/i.test(filePath)) return { category: "SECURITY", action, resource: filePath };
    return { category: "FILE", action, resource: filePath || null };
  }

  if (/\.env|credential[s]?\b|secret[s]?\b|api[-_]?key/i.test(lowerCmd)) {
    return { category: "SECURITY", action: "access", resource: extractPathLike(command) };
  }
  if (/\brm\s|\bdel\s|remove-item/i.test(lowerCmd)) {
    return { category: "FILE", action: "delete", resource: extractPathLike(command) };
  }
  if (/\bgit\s+(commit|push|pull|merge|checkout|branch|status|diff|log)/i.test(lowerCmd)) {
    return { category: "GIT", action: lowerCmd.match(/git\s+(\w+)/i)?.[1] ?? "git", resource: null };
  }
  if (/\b(npm|yarn|pnpm)\s+(test|jest|vitest|pytest)|(^|\s)test(s)?\b.*run|run.*tests?\b/i.test(lowerCmd)) {
    return { category: "TEST", action: "run_tests", resource: null };
  }
  if (/\b(npm|yarn|pnpm|pip|cargo|gem)\s+(install|add)\b/i.test(lowerCmd)) {
    return { category: "PACKAGE", action: "install", resource: extractPathLike(command) };
  }
  if (/\b(drop|delete from|insert into|update .* set|create table|alter table)\b/i.test(lowerCmd)) {
    return { category: "DATABASE", action: lowerCmd.match(/\b(drop|delete|insert|update|create|alter)\b/i)?.[1] ?? "query", resource: null };
  }
  if (/\bcurl\s|\bfetch\(|\bhttps?:\/\//i.test(lowerCmd)) {
    return { category: "API", action: "request", resource: extractUrl(command) };
  }
  if (/deploy|kubectl|terraform apply|helm (install|upgrade)/i.test(lowerCmd)) {
    return { category: "DEPLOYMENT", action: "deploy", resource: null };
  }
  if (/^bash$|^shell$|^exec$/i.test(lowerTool) && command) {
    return { category: "COMMAND", action: "execute", resource: null };
  }
  if (toolName.startsWith("mcp__") || /^mcp:/i.test(toolName)) {
    return { category: "TOOL", action: "invoke", resource: toolName };
  }

  return { category: "OTHER", action: lowerTool || "unknown", resource: null };
}

function extractPathLike(command: string): string | null {
  const match = command.match(/[.\w/-]+\.\w{1,6}(?=\s|$|['")])/);
  return match ? match[0] : null;
}

function extractUrl(command: string): string | null {
  const match = command.match(/https?:\/\/[^\s'"]+/);
  return match ? match[0] : null;
}
