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
  { id: "claude-desktop", provider: "claude", surface: "desktop", group: "Anthropic", label: "Claude Desktop" },
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
    <span className={`rounded-full border px-3 py-1 text-[12px] font-medium ${meta.className}`}>{meta.label}</span>
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
    <div className="space-y-5">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(grouped) as (keyof typeof grouped)[]).map((groupName) => (
            <SelectGroup key={groupName}>
              <SelectLabel>{groupName}</SelectLabel>
              {grouped[groupName].map((s) => (
                <SelectItem key={s.id} value={s.id} className="py-1.5">
                  <SurfaceIcon provider={s.provider} surface={s.surface} size={18} />
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SurfaceIcon provider={surface.provider} surface={surface.surface} size={28} />
          <div className="text-[15px] font-semibold text-foreground">{surface.label}</div>
        </div>
        <StatusPill status={statuses[surface.id] ?? "needs_certification"} />
      </div>

      {content[surface.id]}
    </div>
  );
}
