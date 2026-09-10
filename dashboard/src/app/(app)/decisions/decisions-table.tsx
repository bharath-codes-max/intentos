"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VerdictBadge, ExecutionStatusBadge } from "@/components/verdict-badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import { Code, CodeBlock } from "@/components/ui/code";
import { ToolIcon } from "@/components/tool-icon";
import { colorFor } from "@/lib/color-hash";
import { DataRow } from "@/components/ui/data-row";
import { Chip } from "@/components/ui/chip";
import { AvatarChip } from "@/components/ui/avatar-chip";
import { ListGroupHeader } from "@/components/ui/list-group-header";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MixIcon, ExternalLinkIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import type { Decision } from "@/lib/api";

type DecisionFilter = "all" | "allow" | "review" | "block";
type SortDir = "desc" | "asc";

const GROUPS: { key: "review" | "block" | "allow"; label: string; dot: string }[] = [
  { key: "review", label: "Needs review", dot: "bg-status-review" },
  { key: "block", label: "Blocked", dot: "bg-status-block" },
  { key: "allow", label: "Allowed", dot: "bg-status-allow" },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DecisionsTable({ decisions }: { decisions: Decision[] }) {
  const [selected, setSelected] = useState<Decision | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    review: true,
    block: true,
    allow: true,
  });

  const agents = useMemo(() => {
    const set = new Set<string>();
    for (const d of decisions) if (d.agent_label) set.add(d.agent_label);
    return [...set].sort();
  }, [decisions]);

  const employees = useMemo(() => {
    const set = new Set<string>();
    for (const d of decisions) if (d.employee_email) set.add(d.employee_email);
    return [...set].sort();
  }, [decisions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = decisions.filter((d) => {
      if (decisionFilter !== "all" && d.decision !== decisionFilter) return false;
      if (agentFilter !== "all" && d.agent_label !== agentFilter) return false;
      if (employeeFilter !== "all" && d.employee_email !== employeeFilter) return false;
      if (!q) return true;
      return (
        d.tool_name.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        (d.matched_rule ?? "").toLowerCase().includes(q) ||
        JSON.stringify(d.tool_input).toLowerCase().includes(q)
      );
    });
    return [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [decisions, decisionFilter, agentFilter, employeeFilter, search, sortDir]);

  const grouped = decisionFilter === "all";

  function renderRow(d: Decision) {
    return (
      <DataRow
        key={d.id}
        icon={<ToolIcon toolName={d.tool_name} />}
        iconColor={colorFor(d.tool_name)}
        onClick={() => setSelected(d)}
        trailing={
          <>
            {d.matched_rule && <Chip label={d.matched_rule} />}
            {!grouped && <VerdictBadge verdict={d.decision} />}
            <ExecutionStatusBadge status={d.approval_status ?? (d.decision === "allow" ? "executed" : "attempted")} />
            <AvatarChip label={d.agent_label} />
            <span className="w-16 shrink-0 text-right text-[12px] text-muted-foreground">
              {timeAgo(d.created_at)}
            </span>
          </>
        }
      >
        <p className="truncate text-[13px] font-medium text-foreground">{d.reason}</p>
        <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
          {d.tool_name} · {d.agent_label ?? "Unknown agent"}
          {d.employee_email && <> · {d.employee_email}</>}
        </p>
      </DataRow>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="p-2">
        <EmptyState icon={MixIcon} title="No decisions logged yet" description="They'll appear here as agents act." />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border shadow-[var(--shadow-md)]">
      <FilterBar resultCount={filtered.length} totalCount={decisions.length}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tool, reason, rule…" className="w-56" />
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
        {agents.length > 0 && (
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger size="sm">
              <SelectValue>{agentFilter === "all" ? "All agents" : agentFilter}</SelectValue>
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
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger size="sm">
              <SelectValue>{employeeFilter === "all" ? "All employees" : employeeFilter}</SelectValue>
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
          {sortDir === "desc" ? "Newest" : "Oldest"}
          {sortDir === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
        </button>
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="p-2">
          <EmptyState icon={MixIcon} title="No matching decisions" description="Try clearing a filter or search term." />
        </div>
      ) : grouped ? (
        <div>
          {GROUPS.map((g) => {
            const rows = filtered.filter((d) => d.decision === g.key);
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
      </div>

      <Drawer open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <>
              <DrawerHeader>
                <DrawerTitle>Decision detail</DrawerTitle>
              </DrawerHeader>
              <DrawerBody className="space-y-5">
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={selected.decision} />
                  <span className="text-[12.5px] text-muted-foreground">{formatTime(selected.created_at)}</span>
                </div>

                <Field label="Employee">{selected.employee_email ?? "—"}</Field>
                <Field label="Agent">{selected.agent_label ?? "—"}</Field>
                <Field label="Tool">
                  <Code>{selected.tool_name}</Code>
                </Field>
                <Field label="Action input">
                  <CodeBlock>{JSON.stringify(selected.tool_input, null, 2)}</CodeBlock>
                </Field>
                <Field label="Reason">{selected.reason}</Field>
                {selected.matched_rule && <Field label="Matched rule">{selected.matched_rule}</Field>}
                {selected.approval_status && (
                  <Field label="Approval">
                    {selected.approval_status}
                    {selected.reviewer && ` — ${selected.reviewer}`}
                  </Field>
                )}
                <Field label="Latency">{selected.latency_ms}ms</Field>
                <Field label="Decision ID">
                  <Code>{selected.id}</Code>
                </Field>
                {selected.run_id && (
                  <Link
                    href={`/activity/${selected.run_id}`}
                    className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
                  >
                    View run <ExternalLinkIcon className="size-3" />
                  </Link>
                )}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-wide text-faint-foreground uppercase">{label}</p>
      <div className="text-[13px] text-foreground">{children}</div>
    </div>
  );
}

