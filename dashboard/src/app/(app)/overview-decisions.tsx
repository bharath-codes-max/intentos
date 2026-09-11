"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VerdictBadge, ExecutionStatusBadge } from "@/components/verdict-badge";
import { DataRow } from "@/components/ui/data-row";
import { ToolIcon } from "@/components/tool-icon";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { colorFor } from "@/lib/color-hash";
import { MixIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import type { Decision } from "@/lib/api";

type DecisionFilter = "all" | "allow" | "review" | "block";
type SortDir = "desc" | "asc";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function OverviewDecisions({ decisions }: { decisions: Decision[] }) {
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = decisions.filter((d) => {
      if (decisionFilter !== "all" && d.decision !== decisionFilter) return false;
      if (!q) return true;
      return d.tool_name.toLowerCase().includes(q) || d.reason.toLowerCase().includes(q);
    });
    return [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [decisions, decisionFilter, search, sortDir]);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.1] bg-panel-raised shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Recent decisions
        </h2>
        <Link href="/decisions" className="text-[12.5px] text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </div>

      {decisions.length === 0 ? (
        <div className="p-2">
          <EmptyState icon={MixIcon} title="No decisions yet" description="Waiting on the first agent check." />
        </div>
      ) : (
        <>
          <FilterBar resultCount={filtered.length} totalCount={decisions.length}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search tool, reason…" className="w-52" />
            <Select value={decisionFilter} onValueChange={(v) => setDecisionFilter(v as DecisionFilter)}>
              <SelectTrigger size="sm">
                <SelectValue>{decisionFilter === "all" ? "All decisions" : decisionFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                <SelectItem value="allow">Allow</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="block">Block</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="ml-auto flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {sortDir === "desc" ? "Newest" : "Oldest"}
              {sortDir === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
            </button>
          </FilterBar>

          {filtered.length === 0 ? (
            <div className="p-2">
              <EmptyState icon={MixIcon} title="No matching decisions" description="Try clearing a filter or search term." />
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {filtered.map((d) => (
                <div key={d.id} className="rounded-xl border border-white/[0.08] bg-panel shadow-[var(--shadow-sm)]">
                  <DataRow
                    icon={<ToolIcon toolName={d.tool_name} />}
                    iconColor={colorFor(d.tool_name)}
                    trailing={
                      <>
                        <VerdictBadge verdict={d.decision} />
                        <ExecutionStatusBadge
                          status={d.approval_status ?? (d.decision === "allow" ? "executed" : "attempted")}
                        />
                        <span className="w-16 shrink-0 text-right text-[12px] text-muted-foreground">
                          {timeAgo(d.created_at)}
                        </span>
                      </>
                    }
                  >
                    <p className="truncate text-[13px] font-medium text-foreground">{d.reason}</p>
                    <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
                      {d.tool_name} · {d.agent_label ?? "Unknown agent"}
                    </p>
                  </DataRow>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
