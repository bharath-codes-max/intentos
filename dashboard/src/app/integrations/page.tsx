import { headers } from "next/headers";
import { CodeIcon } from "@radix-ui/react-icons";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listTokens, API_ORIGIN } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { CopyCommand } from "./copy-command";
import { RevokeButton } from "./revoke-button";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const orgId = await getCurrentOrgId();
  const tokens = await listTokens(orgId);
  const claudeCodeTokens = tokens.filter((t) => t.agent_type === "claude-code" && !t.revoked_at);
  const connected = claudeCodeTokens.length > 0;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;
  const installCommand = `curl -fsSL ${origin}/install.sh | bash`;

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] px-4 py-3 text-[13px] text-foreground">
          Account created. Connect Claude Code below to start governing its actions.
        </div>
      )}
      <PageHeader
        title="Integrations"
        description="Connect the AI coding tools you want Intentos to govern."
        icon={CodeIcon}
        iconColor="#EE9A5C"
      />

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40">
                <CodeIcon className="size-5" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-foreground">Claude Code</div>
                <div className="text-[13px] text-muted-foreground">Anthropic&apos;s CLI coding agent</div>
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                connected
                  ? "border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>

          {!connected ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-[13px] font-medium text-foreground">Connect in one step</div>
              <p className="text-[13px] text-muted-foreground">
                Run this on the machine where you use Claude Code. It installs the connector, opens your
                browser to approve the device, and works in every project on this machine automatically —
                no per-project setup.
              </p>
              <CopyCommand command={installCommand} />
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="divide-y divide-border rounded-lg border border-border">
                {claudeCodeTokens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{t.label}</div>
                      <div className="text-[12px] text-muted-foreground">
                        Connected {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <RevokeButton tokenId={t.id} />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-[13px] text-muted-foreground">
                  Add another machine? Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{installCommand}</code> there.
                </p>
                <a href="/test">
                  <Button variant="outline" size="sm">Test Claude Code</Button>
                </a>
              </div>
            </div>
          )}

          <details className="text-[12px] text-muted-foreground">
            <summary className="cursor-pointer select-none">Advanced</summary>
            <div className="mt-2 space-y-1 rounded-lg border border-border bg-muted/10 p-3 font-mono text-[11px]">
              <div>Hook events wired: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd</div>
              <div>Config: ~/.claude/settings.json (global) · Credential: ~/.intentos/token</div>
              <div>API: {API_ORIGIN}</div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
