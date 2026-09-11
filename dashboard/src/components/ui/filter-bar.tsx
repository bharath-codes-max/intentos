import { ReactNode } from "react";

export function FilterBar({
  children,
  resultCount,
  totalCount,
}: {
  children: ReactNode;
  resultCount?: number;
  totalCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[var(--overlay-subtle)] px-4 py-3">
      {children}
      {resultCount !== undefined && totalCount !== undefined && (
        <span className="ml-auto shrink-0 font-mono text-[11.5px] tabular-nums text-faint-foreground">
          {resultCount === totalCount ? `${totalCount}` : `${resultCount} / ${totalCount}`}
        </span>
      )}
    </div>
  );
}
