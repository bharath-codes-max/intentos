import { headers } from "next/headers";
import { CodeIcon } from "@radix-ui/react-icons";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClaudeIcon, CodexIcon } from "@/components/agent-icons";
import { listTokens, API_ORIGIN } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { AgentPicker } from "./agent-picker";
import { AgentConnectionCard } from "./agent-connection-card";

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
  const codexDesktopTokens = codexTokens.filter((t) => t.label.includes("(Desktop)"));
  const codexCliTokens = codexTokens.filter((t) => !t.label.includes("(Desktop)"));

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
            content={{
              "claude-code": (
                <AgentConnectionCard
                  icon={<ClaudeIcon size={20} />}
                  name="Claude Code"
                  description="Anthropic's CLI coding agent"
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
              "codex-cli": (
                <AgentConnectionCard
                  icon={<CodexIcon size={20} />}
                  name="Codex — CLI / VS Code"
                  description="OpenAI's Codex CLI, and its VS Code integrated-terminal usage (same binary)"
                  connectedTokens={codexCliTokens}
                  installCommand={`curl -fsSL ${origin}/install-codex.sh | bash`}
                  advanced={
                    <>
                      <div>Hook events wired: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd</div>
                      <div>Config: ~/.codex/hooks.json (global) · Credential inline in the hook command</div>
                      <div>
                        First real action may prompt a one-time trust approval for the changed hooks.json — this is
                        expected and only happens once per machine.
                      </div>
                    </>
                  }
                />
              ),
              "codex-desktop": (
                <AgentConnectionCard
                  icon={<CodexIcon size={20} />}
                  name="ChatGPT Desktop (Codex)"
                  description="The ChatGPT desktop app's built-in Codex agent"
                  connectedTokens={codexDesktopTokens}
                  installCommand={`curl -fsSL ${origin}/install-codex-desktop.sh | bash`}
                  extraNote={
                    <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-review),transparent_65%)] bg-[var(--status-review-bg)] px-4 py-3 text-[13px] text-foreground">
                      macOS only. This installs two small background services that keep Desktop routed through a
                      governed connection, and disables Desktop&apos;s own Scheduled-task automation tools (everyday
                      chat and file actions are unaffected). Fully removable — see the Advanced section.
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
