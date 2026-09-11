import { headers } from "next/headers";
import { CodeIcon } from "@radix-ui/react-icons";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listTokens, API_ORIGIN } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { AgentPicker, type SurfaceStatus } from "./agent-picker";
import { InstallCard } from "./agent-connection-card";

function CoverageRow({ name, status }: { name: string; status: "certified" | "beta" | "needs_certification" }) {
  const meta = {
    certified: { label: "Certified", className: "text-status-allow" },
    beta: { label: "Beta", className: "text-status-review" },
    needs_certification: { label: "Needs certification", className: "text-muted-foreground" },
  }[status];
  return (
    <div className="flex items-center justify-between">
      <span>{name}</span>
      <span className={meta.className}>{meta.label}</span>
    </div>
  );
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const orgId = await getCurrentOrgId();
  const tokens = await listTokens(orgId);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;

  const claudeTokens = tokens.filter((t) => t.agent_type === "claude-code" && !t.revoked_at);
  const codexTokens = tokens.filter((t) => t.agent_type === "codex" && !t.revoked_at);

  const statuses: Record<string, SurfaceStatus> = {
    claude: claudeTokens.length > 0 ? "connected" : "not_connected",
    codex: codexTokens.length > 0 ? "connected" : "not_connected",
  };

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] px-4 py-3 text-[13px] text-foreground">
          Account created. Connect an agent below to start governing its actions.
        </div>
      )}
      <PageHeader
        title="Integrations"
        description="Connect the AI coding tools you want Intentos to govern."
        icon={CodeIcon}
        iconColor="#EE9A5C"
      />

      <Card>
        <CardContent className="p-8">
          <AgentPicker
            statuses={statuses}
            content={{
              claude: (
                <InstallCard
                  description="One command governs Claude Code everywhere on this device — the CLI, and its VS Code extension, which shares the same global config file."
                  connectedTokens={claudeTokens}
                  installUrl={`${origin}/install.sh`}
                  advanced={
                    <>
                      <div className="mb-2 space-y-1 border-b border-border pb-2">
                        <CoverageRow name="Claude Code — CLI" status="certified" />
                        <CoverageRow name="Claude Code — VS Code extension" status="needs_certification" />
                        <CoverageRow name="Claude Code — Desktop" status="needs_certification" />
                      </div>
                      <div>Hook events wired: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd</div>
                      <div>Config: ~/.claude/settings.json (global) · Credential: ~/.intentos/token</div>
                      <div>API: {API_ORIGIN}</div>
                    </>
                  }
                />
              ),
              codex: (
                <InstallCard
                  description="One command governs Codex everywhere on this device — the CLI, VS Code's integrated terminal, and Codex inside ChatGPT Desktop."
                  connectedTokens={codexTokens}
                  installUrl={`${origin}/install-codex-desktop.sh`}
                  extraNote={
                    <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-review),transparent_65%)] bg-[var(--status-review-bg)] px-4 py-3 text-[13px] text-foreground">
                      On macOS and Windows, this also installs two small background services that keep Codex inside
                      ChatGPT Desktop routed through a governed connection (everyday chat and file actions are
                      unaffected). Fully removable — see Advanced.
                    </div>
                  }
                  advanced={
                    <>
                      <div className="mb-2 space-y-1 border-b border-border pb-2">
                        <CoverageRow name="Codex — CLI" status="certified" />
                        <CoverageRow name="Codex — VS Code integrated terminal" status="certified" />
                        <CoverageRow name="Codex — VS Code extension (dedicated panel)" status="needs_certification" />
                        <CoverageRow name="Codex inside ChatGPT Desktop" status="beta" />
                      </div>
                      <div>Config: ~/.codex/hooks.json (global, all surfaces) + a background service + config.toml stub for Desktop (macOS/Windows)</div>
                      <div>
                        First real action may prompt a one-time trust approval for the changed hooks.json — expected,
                        happens once per machine.
                      </div>
                      <div>Uninstall (macOS Desktop services): curl -fsSL {origin}/uninstall-codex-desktop.sh | bash</div>
                    </>
                  }
                />
              ),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
