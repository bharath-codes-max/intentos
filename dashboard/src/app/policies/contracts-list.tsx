"use client";

import { useState } from "react";
import { FileTextIcon } from "@radix-ui/react-icons";
import { DataRow } from "@/components/ui/data-row";
import { AvatarChip } from "@/components/ui/avatar-chip";
import { ListGroupHeader } from "@/components/ui/list-group-header";
import { EmptyState } from "@/components/common/empty-state";
import type { Contract } from "@/lib/api";

const GROUPS: { key: "active" | "archived" | "draft"; label: string; dot: string }[] = [
  { key: "active", label: "Active", dot: "bg-status-allow" },
  { key: "draft", label: "Draft", dot: "bg-status-review" },
  { key: "archived", label: "Archived", dot: "bg-faint-foreground" },
];

export function ContractsList({ contracts }: { contracts: Contract[] }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    active: true,
    draft: true,
    archived: true,
  });

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
    <div>
      {GROUPS.map((g) => {
        const rows = contracts.filter((c) => c.status === g.key);
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
  );
}
