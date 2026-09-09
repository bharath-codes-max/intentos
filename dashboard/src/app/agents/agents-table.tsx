"use client";

import { useMemo, useState } from "react";
import { DataRow } from "@/components/ui/data-row";
import { Chip } from "@/components/ui/chip";
import { AvatarChip } from "@/components/ui/avatar-chip";
import { ListGroupHeader } from "@/components/ui/list-group-header";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CubeIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import { colorFor } from "@/lib/color-hash";
import type { AgentToken } from "@/lib/api";

type StatusFilter = "all" | "active" | "revoked";
type SortDir = "desc" | "asc";

const GROUPS: { key: "active" | "revoked"; label: string; dot: string }[] = [
  { key: "active", label: "Active", dot: "bg-status-allow" },
  { key: "revoked", label: "Revoked", dot: "bg-faint-foreground" },
];

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
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ active: true, revoked: true });

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
      const av = new Date(lastActivityByLabel.get(a.label) ?? a.created_at).getTime();
      const bv = new Date(lastActivityByLabel.get(b.label) ?? b.created_at).getTime();
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [tokens, status, type, search, sortDir, lastActivityByLabel]);

  const grouped = status === "all";

  function renderRow(t: AgentToken) {
    const lastActivity = lastActivityByLabel.get(t.label);
    return (
      <DataRow
        key={t.id}
        icon={<CubeIcon className="size-[14px]" />}
        iconColor={colorFor(t.label)}
        trailing={
          <>
            <Chip label={t.agent_type} />
            {!grouped && (
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className={`size-1.5 rounded-full ${t.revoked_at ? "bg-faint-foreground" : "bg-status-allow"}`} />
                {t.revoked_at ? "Revoked" : "Active"}
              </span>
            )}
            <AvatarChip label={t.label} />
            <span className="w-20 shrink-0 text-right text-[12px] text-muted-foreground">
              {lastActivity ? timeAgo(lastActivity) : "No activity"}
            </span>
          </>
        }
      >
        <p className="truncate text-[13px] font-medium text-foreground">{t.label}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          Created {new Date(t.created_at).toLocaleDateString()}
        </p>
      </DataRow>
    );
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
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="ml-auto flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {sortDir === "desc" ? "Newest activity" : "Oldest activity"}
          {sortDir === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
        </button>
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="p-2">
          <EmptyState icon={CubeIcon} title="No matching agents" description="Try clearing a filter or search term." />
        </div>
      ) : grouped ? (
        <div>
          {GROUPS.map((g) => {
            const rows = filtered.filter((t) => (g.key === "active" ? !t.revoked_at : !!t.revoked_at));
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
