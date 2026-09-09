/**
 * Sanitizes activity context before it's ever written to the database.
 * We store what action was attempted (READ .env, BLOCK), never the secret material itself.
 */

const SECRET_LIKE_KEYS = /password|secret|token|api[-_]?key|authorization|bearer|private[-_]?key|connection[-_]?string|cookie|session[-_]?id/i;

const SECRET_VALUE_PATTERNS = [
  /\b[A-Za-z0-9_-]*sk-[A-Za-z0-9_-]{10,}\b/g, // OpenAI/Anthropic-style keys
  /\bBearer\s+[A-Za-z0-9._-]+\b/gi,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/g, // long base64-ish blobs
  /postgres(?:ql)?:\/\/[^\s'"]+/gi, // db connection strings
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
];

export function redactString(value: string): string {
  let out = value;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  // command-line secret assignment, e.g. `export API_KEY=xyz` or `--token=xyz`
  out = out.replace(/((?:export\s+)?[A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|API_KEY|KEY)[A-Z0-9_]*\s*=\s*)("[^"]*"|'[^']*'|\S+)/gi, "$1[REDACTED]");
  return out;
}

export function redactContext(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_LIKE_KEYS.test(key)) {
      out[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      out[key] = redactString(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactContext(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
