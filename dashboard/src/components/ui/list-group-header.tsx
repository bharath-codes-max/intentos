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
      className="flex w-full items-center gap-2 border-b border-white/[0.06] bg-[#171819] px-4 py-1.5 text-[12px] font-medium text-foreground transition-colors duration-150 hover:bg-[#1b1c1d]"
    >
      <ChevronDownIcon className={cn("size-3 transition-transform", !open && "-rotate-90")} />
      <span className={cn("size-1.5 rounded-full", dotColor)} />
      {label}
      <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[11px] text-muted-foreground">{count}</span>
    </button>
  );
}
