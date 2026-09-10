"use client";

import { useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClaudeIcon, CursorIcon, CopilotIcon, CodexIcon } from "@/components/agent-icons";

const AGENTS = [
  { id: "claude-code", label: "Claude Code", icon: ClaudeIcon, available: true },
  { id: "cursor", label: "Cursor", icon: CursorIcon, available: false },
  { id: "github-copilot", label: "GitHub Copilot", icon: CopilotIcon, available: false },
  { id: "codex", label: "Codex", icon: CodexIcon, available: false },
] as const;

export function AgentPicker({ claudeCodeContent }: { claudeCodeContent: ReactNode }) {
  const [selected, setSelected] = useState<string>("claude-code");
  const agent = AGENTS.find((a) => a.id === selected) ?? AGENTS[0];
  const Icon = agent.icon;

  return (
    <div className="space-y-5">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AGENTS.map((a) => (
            <SelectItem key={a.id} value={a.id} className="py-1.5">
              <a.icon size={18} />
              {a.label}
              {!a.available && <span className="ml-1.5 text-muted-foreground">· soon</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {agent.available ? (
        claudeCodeContent
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/10 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
            <Icon size={20} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-foreground">{agent.label} — coming soon</div>
            <div className="text-[12px] text-muted-foreground">Governance for {agent.label} isn&apos;t wired up yet. Claude Code is fully supported today.</div>
          </div>
        </div>
      )}
    </div>
  );
}
