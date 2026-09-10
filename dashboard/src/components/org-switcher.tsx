"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CaretSortIcon, PlusIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Org } from "@/lib/api";
import { switchOrgAction } from "@/app/(app)/switch-org-action";

export function OrgSwitcher({
  orgs,
  currentOrgId,
  compact = false,
}: {
  orgs: Org[];
  currentOrgId: string;
  /** Header-row style: transparent, no border, tighter — used inline next to the logo. */
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const current = orgs.find((o) => o.id === currentOrgId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 min-w-0 flex-1 justify-start gap-1 px-1.5 text-[13px] font-medium"
            disabled={pending}
          >
            <span className="truncate">{current?.name ?? "Select company"}</span>
            <CaretSortIcon className="size-3.5 shrink-0 text-faint-foreground" />
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="gap-1.5" disabled={pending}>
            {current?.name ?? "Select company"}
            <CaretSortIcon className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => startTransition(() => switchOrgAction(org.id))}
            className={org.id === currentOrgId ? "font-medium" : ""}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/signup" className="flex items-center gap-1.5">
            <PlusIcon className="size-[15px]" /> New company
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
