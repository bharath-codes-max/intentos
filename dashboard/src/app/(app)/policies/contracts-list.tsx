"use client";

import { useMemo, useState } from "react";
import { FileTextIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import { DataRow } from "@/components/ui/data-row";
import { AvatarChip } from "@/components/ui/avatar-chip";
import { ListGroupHeader } from "@/components/ui/list-group-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { colorFor } from "@/lib/color-hash";
import type { Contract } from "@/lib/api";

type StatusFilter = "all" | "active" | "draft" | "archived";
type SortDir = "desc" | "asc";

const GROUPS: { key: "active" | "archived" | "draft"; label: string; dot: string }[] = [
  { key: "active", label: "Active", dot: "bg-status-allow" },
  { key: "draft", label: "Draft", dot: "bg-status-review" },
  { key: "archived", label: "Archived", dot: "bg-faint-foreground" },
];

export function ContractsList({ contracts }: { contracts: Contract[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    active: true,
    draft: true,
    archived: true,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = contracts.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.natural_language.toLowerCase().includes(q);
    });
    return [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [contracts, status, search, sortDir]);

  const grouped = status === "all";

  if (contracts.length === 0) {
    return (
      <div className="rounded-none border border-border bg-panel">
        <EmptyState
          icon={FileTextIcon}
          title="No Intent Contracts yet"
          description="Describe an agent's intent in plain English to create your first one."
        />
      </div>
    );
  }

  function renderRow(c: Contract) {
    return (
      <DataRow
        key={c.id}
        icon={<FileTextIcon />}
        iconColor={colorFor(c.name)}
        href={`/policies/${c.id}`}
        trailing={
          <>
            <span className="text-[12px] whitespace-nowrap">
              <span className="text-status-allow">{c.allow_count}</span>
              <span className="text-faint-foreground"> · </span>
              <span className="text-status-review">{c.review_count}</span>
              <span className="text-faint-foreground"> · </span>
              <span className="text-status-block">{c.block_count}</span>
            </span>
            <AvatarChip label={c.agent_label} />
            <span className="w-20 shrink-0 text-right text-[12px] text-muted-foreground">
              {new Date(c.created_at).toLocaleDateString()}
            </span>
          </>
        }
      >
        <p className="truncate text-[13px] font-medium text-foreground">{c.name}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{c.natural_language}</p>
      </DataRow>
    );
  }

  return (
    <>
      <FilterBar resultCount={filtered.length} totalCount={contracts.length}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search contracts…" className="w-56" />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger size="sm">
            <SelectValue>{status === "all" ? "All statuses" : status}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
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
          <EmptyState icon={FileTextIcon} title="No matching contracts" description="Try clearing a filter or search term." />
        </div>
      ) : grouped ? (
        <div>
          {GROUPS.map((g) => {
            const rows = filtered.filter((c) => c.status === g.key);
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
                {open && <div className="divide-y divide-white/[0.06]">{rows.map(renderRow)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">{filtered.map(renderRow)}</div>
      )}
    </>
  );
}
