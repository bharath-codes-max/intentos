"use client";

import { useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClaudeIcon, CodexIcon } from "@/components/agent-icons";

export type SurfaceStatus = "connected" | "not_connected";

export interface ProviderDef {
  id: "claude" | "codex";
  label: string;
  icon: typeof ClaudeIcon;
  covers: string;
}

export const PROVIDERS: ProviderDef[] = [
  { id: "claude", label: "Claude Code (Anthropic)", icon: ClaudeIcon, covers: "CLI, VS Code extension, Desktop" },
  { id: "codex", label: "Codex (OpenAI)", icon: CodexIcon, covers: "CLI, VS Code extension, ChatGPT Desktop" },
];

const STATUS_META: Record<SurfaceStatus, { label: string; className: string }> = {
  connected: {
    label: "Connected",
    className: "border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] text-foreground",
  },
  not_connected: {
    label: "Not connected",
    className: "border-border bg-muted/40 text-muted-foreground",
  },
};

export function StatusPill({ status }: { status: SurfaceStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`rounded-full border px-4 py-1.5 text-[13px] font-medium ${meta.className}`}>{meta.label}</span>
  );
}

export function AgentPicker({
  content,
  statuses,
}: {
  content: Record<string, ReactNode>;
  statuses: Record<string, SurfaceStatus>;
}) {
  const [selected, setSelected] = useState<"claude" | "codex">("claude");
  const provider = PROVIDERS.find((p) => p.id === selected) ?? PROVIDERS[0];
  const Icon = provider.icon;

  return (
    <div className="space-y-7">
      <Select value={selected} onValueChange={(v) => setSelected(v as "claude" | "codex")}>
        <SelectTrigger className="h-14 w-full max-w-xl rounded-xl px-4 text-[15px] sm:w-96">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-96">
          {PROVIDERS.map((p) => (
            <SelectItem key={p.id} value={p.id} className="gap-3 rounded-lg py-2.5 pl-3 text-[14px]">
              <p.icon size={26} />
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 p-5">
        <div className="flex items-center gap-4">
          <Icon size={44} />
          <div>
            <div className="text-[19px] font-semibold text-foreground">{provider.label}</div>
            <div className="text-[13px] text-muted-foreground">Covers: {provider.covers}</div>
          </div>
        </div>
        <StatusPill status={statuses[provider.id] ?? "not_connected"} />
      </div>

      {content[provider.id]}
    </div>
  );
}
