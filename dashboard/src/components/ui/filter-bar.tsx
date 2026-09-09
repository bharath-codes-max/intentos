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
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
      {children}
      {resultCount !== undefined && totalCount !== undefined && (
        <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">
          {resultCount === totalCount ? `${totalCount}` : `${resultCount} of ${totalCount}`}
        </span>
      )}
    </div>
  );
}
