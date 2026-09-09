import { cn } from "@/lib/utils";

/**
 * Compact status treatment for table/list rows — a small colored dot plus a quiet label.
 * Deliberately not a filled pill: color should mark meaning, not paint the row.
 * Covers both governance verdicts (allow/review/block) and execution status
 * (executed/waiting_approval/failed/denied/attempted/cancelled).
 */
const TONE_VAR: Record<string, string> = {
  allow: "var(--status-allow)",
  executed: "var(--status-allow)",
  approved: "var(--status-allow)",
  review: "var(--status-review)",
  waiting_approval: "var(--status-review)",
  block: "var(--status-block)",
  failed: "var(--status-block)",
  denied: "var(--status-block)",
};

export function StatusIndicator({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  const color = TONE_VAR[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap",
        !color && "text-muted-foreground",
        className
      )}
      style={color ? { color } : undefined}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", !color && "bg-faint-foreground")}
        style={color ? { background: color } : undefined}
      />
      {status.replace(/_/g, " ")}
    </span>
  );
}
