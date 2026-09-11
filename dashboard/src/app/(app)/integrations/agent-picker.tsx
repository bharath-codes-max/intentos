"use client";

import { useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SurfaceIcon } from "@/components/agent-icons";

export type SurfaceStatus = "connected" | "not_connected" | "beta" | "needs_certification";

export interface SurfaceDef {
  id: string;
  provider: "claude" | "codex";
  surface: "cli" | "vscode" | "desktop";
  group: "Anthropic" | "OpenAI";
  label: string;
}

export const SURFACES: SurfaceDef[] = [
  { id: "claude-cli", provider: "claude", surface: "cli", group: "Anthropic", label: "Claude Code — CLI" },
  { id: "claude-vscode", provider: "claude", surface: "vscode", group: "Anthropic", label: "Claude Code — VS Code Extension" },
  { id: "claude-desktop", provider: "claude", surface: "desktop", group: "Anthropic", label: "Claude Code — Desktop" },
  { id: "codex-cli", provider: "codex", surface: "cli", group: "OpenAI", label: "Codex — CLI" },
  { id: "codex-vscode", provider: "codex", surface: "vscode", group: "OpenAI", label: "Codex — VS Code Extension" },
  { id: "codex-desktop", provider: "codex", surface: "desktop", group: "OpenAI", label: "ChatGPT Desktop — Codex" },
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
  beta: {
    label: "Beta",
    className: "border-[color-mix(in_oklch,var(--status-review),transparent_60%)] bg-[var(--status-review-bg)] text-foreground",
  },
  needs_certification: {
    label: "Needs certification",
    className: "border-dashed border-border bg-muted/20 text-muted-foreground",
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
  const [selected, setSelected] = useState<string>("claude-cli");
  const surface = SURFACES.find((s) => s.id === selected) ?? SURFACES[0];

  const grouped = { Anthropic: SURFACES.filter((s) => s.group === "Anthropic"), OpenAI: SURFACES.filter((s) => s.group === "OpenAI") };

  return (
    <div className="space-y-7">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-14 w-full max-w-xl rounded-xl px-4 text-[15px] sm:w-[28rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[28rem]">
          {(Object.keys(grouped) as (keyof typeof grouped)[]).map((groupName) => (
            <SelectGroup key={groupName}>
              <SelectLabel className="px-2 py-2 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
                {groupName}
              </SelectLabel>
              {grouped[groupName].map((s) => (
                <SelectItem key={s.id} value={s.id} className="gap-3 rounded-lg py-2.5 pl-3 text-[14px]">
                  <SurfaceIcon provider={s.provider} surface={s.surface} size={26} />
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/10 p-5">
        <div className="flex items-center gap-4">
          <SurfaceIcon provider={surface.provider} surface={surface.surface} size={44} />
          <div className="text-[19px] font-semibold text-foreground">{surface.label}</div>
        </div>
        <StatusPill status={statuses[surface.id] ?? "needs_certification"} />
      </div>

      {content[surface.id]}
    </div>
  );
}
