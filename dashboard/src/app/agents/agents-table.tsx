"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CubeIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import type { AgentToken } from "@/lib/api";

type StatusFilter = "all" | "active" | "revoked";
type SortKey = "activity" | "created";
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

export function AgentsTable({
  tokens,
  lastActivityByLabel,
}: {
  tokens: AgentToken[];
  lastActivityByLabel: Map<string, string>;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("activity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const t of tokens) set.add(t.agent_type);
    return [...set].sort();
  }, [tokens]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = tokens.filter((t) => {
      if (status === "active" && t.revoked_at) return false;
      if (status === "revoked" && !t.revoked_at) return false;
      if (type !== "all" && t.agent_type !== type) return false;
      if (q && !t.label.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      const av =
        sortKey === "activity"
          ? new Date(lastActivityByLabel.get(a.label) ?? a.created_at).getTime()
          : new Date(a.created_at).getTime();
      const bv =
        sortKey === "activity"
          ? new Date(lastActivityByLabel.get(b.label) ?? b.created_at).getTime()
          : new Date(b.created_at).getTime();
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [tokens, status, type, search, sortKey, sortDir, lastActivityByLabel]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIcon(active: boolean) {
    if (!active) return null;
    return sortDir === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />;
  }

  if (tokens.length === 0) {
    return <EmptyState icon={CubeIcon} title="No agents registered yet" description="Register one to get a token." />;
  }

  return (
    <>
      <FilterBar resultCount={filtered.length} totalCount={tokens.length}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search label…" className="w-48" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger size="sm">
            <SelectValue>{status === "all" ? "All statuses" : status === "active" ? "Active" : "Revoked"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        {types.length > 1 && (
          <Select value={type} onValueChange={setType}>
            <SelectTrigger size="sm">
              <SelectValue>{type === "all" ? "All types" : type}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="p-2">
          <EmptyState icon={CubeIcon} title="No matching agents" description="Try clearing a filter or search term." />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("activity")}
                  className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Last activity
                  {sortIcon(sortKey === "activity")}
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("created")}
                  className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground ml-auto"
                >
                  Created
                  {sortIcon(sortKey === "created")}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const lastActivity = lastActivityByLabel.get(t.label);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-foreground">{t.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {t.agent_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`size-1.5 rounded-full ${t.revoked_at ? "bg-faint-foreground" : "bg-status-allow"}`}
                      />
                      {t.revoked_at ? "Revoked" : "Active"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lastActivity ? timeAgo(lastActivity) : "No activity yet"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
