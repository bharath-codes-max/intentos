"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { Code } from "@/components/ui/code";
import { ToolIcon } from "@/components/tool-icon";
import { DataRow } from "@/components/ui/data-row";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApprovalButtons } from "./approval-buttons";
import { Chip } from "@/components/ui/chip";
import { AvatarChip } from "@/components/ui/avatar-chip";
import { ExecutionStatusBadge } from "@/components/verdict-badge";
import { ListGroupHeader } from "@/components/ui/list-group-header";
import { CheckCircledIcon, ArrowUpIcon, ArrowDownIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { colorFor } from "@/lib/color-hash";
import type { PendingApproval, ResolvedApproval } from "@/lib/api";

function summarizeInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(", ");
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function PendingApprovals({ pending }: { pending: PendingApproval[] }) {
  const [agent, setAgent] = useState<string>("all");
  const [search, setSearch] = useState("");

  const agents = useMemo(() => {
    const set = new Set<string>();
    for (const a of pending) if (a.agent_label) set.add(a.agent_label);
    return [...set].sort();
  }, [pending]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pending.filter((a) => {
      if (agent !== "all" && a.agent_label !== agent) return false;
      if (!q) return true;
      return a.tool_name.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q);
    });
  }, [pending, agent, search]);

  return (
    <div className="space-y-2">
      {(pending.length > 3 || agents.length > 1) && (
        <FilterBar resultCount={filtered.length} totalCount={pending.length}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search tool, reason…" className="w-56" />
          {agents.length > 1 && (
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger size="sm">
                <SelectValue>{agent === "all" ? "All agents" : agent}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBar>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-none border border-border bg-panel">
          <EmptyState icon={CheckCircledIcon} title="No matching approvals" description="Try clearing a filter or search term." />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {filtered.map((a) => (
            <DataRow
              key={a.id}
              icon={<ExclamationTriangleIcon />}
              iconColor="#F2C438"
              trailing={
                <>
                  {a.matched_rule && <Chip label={a.matched_rule} />}
                  <AvatarChip label={a.agent_label} />
                  <span className="w-16 shrink-0 text-right text-[12px] text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </span>
                  <ApprovalButtons id={a.id} />
                </>
              }
            >
              <p className="truncate text-[13px] font-medium text-foreground">
                {a.agent_label ?? "Unknown agent"}
                <span className="text-muted-foreground"> requested </span>
                <Code>{a.tool_name}</Code>
              </p>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {a.reason} <span className="font-mono text-faint-foreground">· {summarizeInput(a.tool_input)}</span>
              </p>
            </DataRow>
          ))}
        </div>
      )}
    </div>
  );
}

type ResolvedFilter = "all" | "approved" | "denied";
type SortDir = "desc" | "asc";

const GROUPS: { key: "approved" | "denied"; label: string; dot: string }[] = [
  { key: "approved", label: "Approved", dot: "bg-status-allow" },
  { key: "denied", label: "Denied", dot: "bg-status-block" },
];

export function ResolvedApprovals({ resolved }: { resolved: ResolvedApproval[] }) {
  const [filter, setFilter] = useState<ResolvedFilter>("all");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ approved: true, denied: true });

  const filtered = useMemo(() => {
    const rows = resolved.filter((r) => filter === "all" || r.approval_status === filter);
    return [...rows].sort((a, b) => {
      const diff = new Date(a.resolved_at).getTime() - new Date(b.resolved_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [resolved, filter, sortDir]);

  const grouped = filter === "all";

  function renderRow(r: ResolvedApproval) {
    return (
      <DataRow
        key={r.id}
        icon={<ToolIcon toolName={r.tool_name} />}
        iconColor={colorFor(r.tool_name)}
        trailing={
          <>
            {!grouped && <ExecutionStatusBadge status={r.approval_status} />}
            <span className="text-[12px] text-muted-foreground">{r.reviewer}</span>
            <AvatarChip label={r.reviewer} />
            <span className="w-24 shrink-0 text-right text-[12px] text-muted-foreground">
              {new Date(r.resolved_at).toLocaleDateString()}
            </span>
          </>
        }
      >
        <p className="truncate text-[13px] font-medium text-foreground">{r.reason}</p>
        <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
          {r.tool_name} · {r.agent_label ?? "Unknown agent"}
        </p>
      </DataRow>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 pb-2.5">
        <h2 className="text-[13px] font-medium text-foreground">Recently resolved</h2>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as ResolvedFilter)}>
            <SelectTrigger size="sm">
              <SelectValue>{filter === "all" ? "All" : filter === "approved" ? "Approved" : "Denied"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {sortDir === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">No matching resolutions.</div>
      ) : grouped ? (
        <div>
          {GROUPS.map((g) => {
            const rows = filtered.filter((r) => r.approval_status === g.key);
            if (rows.length === 0) return null;
            const open = openGroups[g.key];
            return (
              <div key={g.key}>
                <ListGroupHeader
                  label={g.label}
                  count={rows.length}
                  dotColor={g.dot}
                  open={open}
                  onToggle={() => setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
                />
                {open && <div className="divide-y divide-border">{rows.map(renderRow)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-border">{filtered.map(renderRow)}</div>
      )}
    </section>
  );
}
