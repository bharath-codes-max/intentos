"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/verdict-badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import { Code, CodeBlock } from "@/components/ui/code";
import { ToolIcon } from "@/components/tool-icon";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MixIcon, ExternalLinkIcon, ArrowUpIcon, ArrowDownIcon, ChevronDownIcon } from "@radix-ui/react-icons";
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

function summarizeInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(", ");
}

export function DecisionsTable({ decisions }: { decisions: Decision[] }) {
  const [selected, setSelected] = useState<Decision | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = decisions.filter((d) => {
      if (decisionFilter !== "all" && d.decision !== decisionFilter) return false;
      if (agentFilter !== "all" && d.agent_label !== agentFilter) return false;
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
  }, [decisions, decisionFilter, agentFilter, search, sortDir]);

  const grouped = decisionFilter === "all";

  function renderRow(d: Decision) {
    return (
      <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
        <TableCell className="text-muted-foreground">{formatTime(d.created_at)}</TableCell>
        <TableCell className="text-foreground">{d.agent_label ?? "—"}</TableCell>
        <TableCell className="font-mono text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ToolIcon toolName={d.tool_name} />
            {d.tool_name}
          </span>
        </TableCell>
        <TableCell className="max-w-md truncate font-mono text-[12px] text-muted-foreground">
          {summarizeInput(d.tool_input)}
        </TableCell>
        <TableCell>
          <VerdictBadge verdict={d.decision} />
        </TableCell>
        <TableCell className="max-w-xs truncate text-muted-foreground">{d.matched_rule ?? "—"}</TableCell>
        <TableCell className="text-right text-muted-foreground">
          {d.approval_status ? d.approval_status : d.decision === "allow" ? "executed" : "—"}
        </TableCell>
      </TableRow>
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
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="p-2">
          <EmptyState icon={MixIcon} title="No matching decisions" description="Try clearing a filter or search term." />
        </div>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                Time
                {sortDir === "desc" ? (
                  <ArrowDownIcon className="size-3" />
                ) : (
                  <ArrowUpIcon className="size-3" />
                )}
              </button>
            </TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Tool</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead className="text-right">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped
            ? GROUPS.map((g) => {
                const rows = filtered.filter((d) => d.decision === g.key);
                if (rows.length === 0) return null;
                const open = openGroups[g.key];
                return (
                  <Fragment key={g.key}>
                    <TableRow className="cursor-default border-border hover:bg-transparent">
                      <TableCell colSpan={7} className="bg-panel-raised py-2">
                        <button
                          type="button"
                          onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
                          className="flex items-center gap-2 text-[12.5px] font-medium text-foreground"
                        >
                          <ChevronDownIcon className={`size-3 transition-transform ${!open ? "-rotate-90" : ""}`} />
                          <span className={`size-1.5 rounded-full ${g.dot}`} />
                          {g.label}
                          <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {rows.length}
                          </span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {open && rows.map((d) => renderRow(d))}
                  </Fragment>
                );
              })
            : filtered.map((d) => renderRow(d))}
        </TableBody>
      </Table>
      )}

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
