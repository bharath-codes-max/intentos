"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerdictBadge } from "@/components/verdict-badge";

const PRESETS = [
  {
    label: "Codex — read .env via shell (should BLOCK)",
    tool_name: "Bash",
    tool_input: { command: "awk -F= '$1 == \"SECRET_API_KEY\" {print $2}' .env" },
  },
  {
    label: "Codex — push to main (should BLOCK)",
    tool_name: "Bash",
    tool_input: { command: "git push origin main" },
  },
  {
    label: "Codex — push to staging (should ALLOW)",
    tool_name: "Bash",
    tool_input: { command: "git push origin staging" },
  },
  {
    label: "Codex — DELETE command (should REVIEW)",
    tool_name: "Bash",
    tool_input: { command: "DELETE FROM orders WHERE id=42" },
  },
];

interface Result {
  status: number;
  body: { decision?: string; reason?: string; error?: string };
  latencyMs: number;
}

function readSaved(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function TestConsole() {
  const [hostUrl, setHostUrl] = useState(() => readSaved("intentos_test_host", "http://localhost:4000"));
  const [token, setToken] = useState(() => readSaved("intentos_test_token", ""));
  const [toolName, setToolName] = useState(PRESETS[0].tool_name);
  const [toolInput, setToolInput] = useState(JSON.stringify(PRESETS[0].tool_input, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setToolName(preset.tool_name);
    setToolInput(JSON.stringify(preset.tool_input, null, 2));
  }

  async function runCheck() {
    setError(null);
    setResult(null);

    let parsedInput: Record<string, unknown>;
    try {
      parsedInput = JSON.parse(toolInput);
    } catch {
      setError("Tool input must be valid JSON.");
      return;
    }
    if (!token.trim()) {
      setError("Paste an agent token first — issue one from the Agents page.");
      return;
    }

    try {
      localStorage.setItem("intentos_test_host", hostUrl);
      localStorage.setItem("intentos_test_token", token);
    } catch {}

    setLoading(true);
    const started = performance.now();
    try {
      const res = await fetch(`${hostUrl.replace(/\/$/, "")}/v1/check`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tool_name: toolName, tool_input: parsedInput }),
      });
      const body = await res.json();
      setResult({ status: res.status, body, latencyMs: Math.round(performance.now() - started) });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not reach ${hostUrl} — ${err.message}`
          : "Could not reach the host URL."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="host">Intentos host URL</Label>
            <Input
              id="host"
              value={hostUrl}
              onChange={(e) => setHostUrl(e.target.value)}
              placeholder="http://localhost:4000"
            />
            <p className="text-xs text-muted-foreground">
              Where your Intentos API is running. Local right now — change this to your deployed URL
              later and nothing else here changes.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="token">Agent token</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="sk-codex-..."
            />
            <p className="text-xs text-muted-foreground">
              Paste a token issued from the Agents page. Stored only in this browser, never sent
              anywhere but the host URL above.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Preset (Codex-shaped calls)</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button key={p.label} variant="secondary" size="sm" onClick={() => applyPreset(p)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool_name">Tool name</Label>
            <Input id="tool_name" value={toolName} onChange={(e) => setToolName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool_input">Tool input (JSON)</Label>
            <textarea
              id="tool_input"
              value={toolInput}
              onChange={(e) => setToolInput(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <Button onClick={runCheck} disabled={loading} className="w-full">
            {loading ? "Checking…" : "Run check"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Result
          </p>
          {error && <p className="text-sm text-status-block">{error}</p>}
          {!error && !result && (
            <p className="text-sm text-muted-foreground">Run a check to see the live verdict here.</p>
          )}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {result.body.decision ? (
                  <VerdictBadge verdict={result.body.decision} />
                ) : (
                  <span className="text-sm font-medium text-status-block">HTTP {result.status}</span>
                )}
                <span className="text-xs text-muted-foreground">{result.latencyMs}ms round trip</span>
              </div>
              <p className="text-sm text-foreground">{result.body.reason ?? result.body.error}</p>
              <pre className="overflow-x-auto rounded-md border bg-secondary/40 p-3 text-xs">
                {JSON.stringify(result.body, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
