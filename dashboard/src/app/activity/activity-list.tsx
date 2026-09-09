"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { DataRow } from "@/components/ui/data-row";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityLogIcon, ChevronRightIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import type { AgentRun } from "@/lib/api";

type StatusFilter = "all" | "running" | "completed" | "failed" | "cancelled";
type SortDir = "desc" | "asc";

function formatDuration(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

const STATUS_LABEL: Record<string, string> = {
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_DOT: Record<string, string> = {
  running: "bg-status-review",
  completed: "bg-status-allow",
  failed: "bg-status-block",
  cancelled: "bg-faint-foreground",
};

export function ActivityList({ runs }: { runs: AgentRun[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [agent, setAgent] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const agents = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) if (r.agent_label) set.add(r.agent_label);
    return [...set].sort();
  }, [runs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = runs.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (agent !== "all" && r.agent_label !== agent) return false;
      if (q && !(r.task_summary ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      const diff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [runs, status, agent, search, sortDir]);

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={ActivityLogIcon}
        title="No runs observed yet"
        description="Start a connected agent (Codex) in a repo wired to Intentos and its activity will appear here."
      />
    );
  }

  return (
    <>
      <FilterBar resultCount={filtered.length} totalCount={runs.length}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search task summary…" className="w-56" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger size="sm">
            <SelectValue>{status === "all" ? "All statuses" : STATUS_LABEL[status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {agents.length > 0 && (
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
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
          {sortDir === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
        </button>
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="p-2">
          <EmptyState icon={ActivityLogIcon} title="No matching runs" description="Try clearing a filter or search term." />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((run) => (
            <DataRow
              key={run.id}
              href={`/activity/${run.id}`}
              className="items-center"
              trailing={
                <>
                  <span className="text-[12px] text-muted-foreground">{run.activity_count} actions</span>
                  <span className="text-[12px] text-status-allow">{run.allow_count}</span>
                  <span className="text-[12px] text-status-review">{run.review_count}</span>
                  <span className="text-[12px] text-status-block">{run.block_count}</span>
                  <span className="w-16 text-right text-[12px] text-muted-foreground">
                    {STATUS_LABEL[run.status] ?? run.status}
                  </span>
                  <ChevronRightIcon className="size-3.5 text-faint-foreground" />
                </>
              }
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[run.status] ?? "bg-faint-foreground"}`} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {run.task_summary ?? "Untitled run"}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {run.agent_label ?? run.provider} ·{" "}
                    {new Date(run.started_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {formatDuration(run.started_at, run.ended_at)}
                  </p>
                </div>
              </div>
            </DataRow>
          ))}
        </div>
      )}
    </>
  );
}
