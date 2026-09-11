import { headers } from "next/headers";
import { CodeIcon } from "@radix-ui/react-icons";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listTokens, API_ORIGIN } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { AgentPicker, type SurfaceStatus } from "./agent-picker";
import { InstallCard, NotCertifiedCard } from "./agent-connection-card";

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

  // Claude Code's connector writes one shared global config (~/.claude/settings.json) used by
  // both the CLI and the VS Code extension — so a "claude-code" token IS the CLI's connection,
  // and the VS Code extension likely rides on the same file. "Likely" is doing real work in that
  // sentence: that hasn't been empirically tested, so its status stays "needs certification"
  // regardless of whether a token exists, per the rule of not claiming more than was verified.
  const claudeTokens = tokens.filter((t) => t.agent_type === "claude-code" && !t.revoked_at);

  const codexTokens = tokens.filter((t) => t.agent_type === "codex" && !t.revoked_at);
  const codexDesktopTokens = codexTokens.filter((t) => t.label.includes("(Desktop)"));
  const codexCliTokens = codexTokens.filter((t) => !t.label.includes("(Desktop)"));

  const statuses: Record<string, SurfaceStatus> = {
    "claude-cli": claudeTokens.length > 0 ? "connected" : "not_connected",
    "claude-vscode": "needs_certification",
    "claude-desktop": "needs_certification",
    "codex-cli": codexCliTokens.length > 0 ? "connected" : "not_connected",
    "codex-vscode": "needs_certification",
    "codex-desktop": "beta",
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
        <CardContent className="pt-6">
          <AgentPicker
            statuses={statuses}
            content={{
              "claude-cli": (
                <InstallCard
                  description="Anthropic's CLI coding agent, run standalone in a terminal."
                  connectedTokens={claudeTokens}
                  installCommand={`curl -fsSL ${origin}/install.sh | bash`}
                  advanced={
                    <>
                      <div>Hook events wired: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd</div>
                      <div>Config: ~/.claude/settings.json (global) · Credential: ~/.intentos/token</div>
                      <div>API: {API_ORIGIN}</div>
                    </>
                  }
                />
              ),
              "claude-vscode": (
                <NotCertifiedCard
                  description="Claude Code's own VS Code extension panel, distinct from opening the CLI inside a VS Code terminal."
                  why="Claude Code's connector writes one shared config file (~/.claude/settings.json) used by both the CLI and the extension, so this likely already works if the CLI above is connected — but that hasn't actually been tested against the extension specifically. Marked needs-certification until verified, not assumed."
                />
              ),
              "claude-desktop": (
                <NotCertifiedCard
                  description="Anthropic's standalone desktop chat app, if it runs coding-agent actions the same way Claude Code does."
                  why="Not yet investigated — it isn't confirmed whether Claude Desktop has an equivalent hook/governance mechanism at all. No connector has been built."
                />
              ),
              "codex-cli": (
                <InstallCard
                  description="OpenAI's Codex CLI, run standalone in a terminal — and VS Code's integrated terminal, since it runs the identical binary."
                  connectedTokens={codexCliTokens}
                  installCommand={`curl -fsSL ${origin}/install-codex.sh | bash`}
                  advanced={
                    <>
                      <div>Hook events wired: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd</div>
                      <div>Config: ~/.codex/hooks.json (global) · Credential inline in the hook command</div>
                      <div>
                        First real action may prompt a one-time trust approval for the changed hooks.json — expected,
                        happens once per machine.
                      </div>
                    </>
                  }
                />
              ),
              "codex-vscode": (
                <NotCertifiedCard
                  description="OpenAI's dedicated Codex panel inside VS Code — a different mechanism from just using VS Code's terminal."
                  why="Not yet tested this round. Codex Desktop's own panel turned out to use a completely different transport (its own app-server process) than the CLI's hook file — the VS Code extension may have the same difference, so it can't be assumed covered by the CLI connector above."
                />
              ),
              "codex-desktop": (
                <InstallCard
                  description="The ChatGPT desktop app's built-in Codex agent."
                  connectedTokens={codexDesktopTokens}
                  installCommand={`curl -fsSL ${origin}/install-codex-desktop.sh | bash`}
                  extraNote={
                    <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-review),transparent_65%)] bg-[var(--status-review-bg)] px-4 py-3 text-[13px] text-foreground">
                      Beta: macOS only. Installs two small background services that keep Desktop routed through a
                      governed connection, and disables Desktop&apos;s own Scheduled-task automation tools (everyday
                      chat and file actions are unaffected). Fully removable — see Advanced.
                    </div>
                  }
                  advanced={
                    <>
                      <div>Runs an external `codex app-server`, managed by a LaunchAgent, that Desktop connects to</div>
                      <div>Config: ~/.codex/hooks.json (shared with CLI) + a codex_app stub in ~/.codex/config.toml</div>
                      <div>Uninstall: curl -fsSL {origin}/uninstall-codex-desktop.sh | bash</div>
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
