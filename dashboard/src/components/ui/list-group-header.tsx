"use client";

import { ChevronDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

/** A collapsible group header for a row-list — colored status dot, label, count chip, chevron. */
export function ListGroupHeader({
  label,
  count,
  dotColor,
  open,
  onToggle,
}: {
  label: string;
  count: number;
  dotColor: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 border-b border-border bg-panel-raised px-4 py-2 text-[12px] font-semibold tracking-wide text-foreground transition-colors duration-150 hover:bg-[var(--overlay-hover)]"
    >
      <ChevronDownIcon className={cn("size-3 shrink-0 text-faint-foreground transition-transform", !open && "-rotate-90")} />
      <span className={cn("size-1.5 shrink-0 rounded-full", dotColor)} />
      {label}
      <span className="rounded-full bg-[var(--overlay-strong)] px-1.5 py-0.5 font-mono text-[11px] font-normal tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
  );
}
