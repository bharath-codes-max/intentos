"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { DataRow } from "@/components/ui/data-row";
import { Chip } from "@/components/ui/chip";
import { AvatarChip } from "@/components/ui/avatar-chip";
import { ListGroupHeader } from "@/components/ui/list-group-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityLogIcon, ChevronRightIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import { colorFor } from "@/lib/color-hash";
import type { AgentRun } from "@/lib/api";

type StatusFilter = "all" | "running" | "completed" | "failed" | "cancelled";
type SortDir = "desc" | "asc";

const GROUPS: { key: "running" | "completed" | "failed" | "cancelled"; label: string; dot: string }[] = [
  { key: "running", label: "Running", dot: "bg-status-review" },
  { key: "failed", label: "Failed", dot: "bg-status-block" },
  { key: "completed", label: "Completed", dot: "bg-status-allow" },
  { key: "cancelled", label: "Cancelled", dot: "bg-faint-foreground" },
];

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

export function ActivityList({ runs }: { runs: AgentRun[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [agent, setAgent] = useState<string>("all");
  const [employee, setEmployee] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    running: true,
    failed: true,
    completed: true,
    cancelled: true,
  });

  const agents = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) if (r.agent_label) set.add(r.agent_label);
    return [...set].sort();
  }, [runs]);

  const employees = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) if (r.employee_email) set.add(r.employee_email);
    return [...set].sort();
  }, [runs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = runs.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (agent !== "all" && r.agent_label !== agent) return false;
      if (employee !== "all" && r.employee_email !== employee) return false;
      if (q && !(r.task_summary ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      const diff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [runs, status, agent, employee, search, sortDir]);

  const grouped = status === "all";

  function renderRow(run: AgentRun) {
    return (
      <DataRow
        key={run.id}
        href={`/activity/${run.id}`}
        icon={<ActivityLogIcon className="size-[14px]" />}
        iconColor={colorFor(run.agent_label ?? run.provider)}
        trailing={
          <>
            <Chip label={`${run.activity_count} actions`} />
            <span className="flex items-center gap-2 text-[12px]">
              <span className="text-status-allow">{run.allow_count}</span>
              <span className="text-status-review">{run.review_count}</span>
              <span className="text-status-block">{run.block_count}</span>
            </span>
            <AvatarChip label={run.agent_label ?? run.provider} />
            <span className="w-16 shrink-0 text-right text-[12px] text-muted-foreground">
              {formatDuration(run.started_at, run.ended_at)}
            </span>
            <ChevronRightIcon className="size-3.5 shrink-0 text-faint-foreground" />
          </>
        }
      >
        <p className="truncate text-[13px] font-medium text-foreground">{run.task_summary ?? "Untitled run"}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {run.agent_label ?? run.provider}
          {run.employee_email && <> · {run.employee_email}</>} ·{" "}
          {new Date(run.started_at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </DataRow>
    );
  }

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
        {employees.length > 0 && (
          <Select value={employee} onValueChange={setEmployee}>
            <SelectTrigger size="sm">
              <SelectValue>{employee === "all" ? "All employees" : employee}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="ml-auto flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
          {sortDir === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
        </button>
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="p-2">
          <EmptyState icon={ActivityLogIcon} title="No matching runs" description="Try clearing a filter or search term." />
        </div>
      ) : grouped ? (
        <div>
          {GROUPS.map((g) => {
            const rows = filtered.filter((r) => r.status === g.key);
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
    </>
  );
}
