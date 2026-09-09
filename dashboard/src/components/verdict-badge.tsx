import { cn } from "@/lib/utils";

/** Governance decision — ALLOW / REVIEW / BLOCK. Never used for execution status. */
const STYLES: Record<string, { fg: string; bg: string }> = {
  allow: { fg: "text-[var(--status-allow)]", bg: "bg-[var(--status-allow-bg)]" },
  block: { fg: "text-[var(--status-block)]", bg: "bg-[var(--status-block-bg)]" },
  review: { fg: "text-[var(--status-review)]", bg: "bg-[var(--status-review-bg)]" },
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  const key = verdict.toLowerCase();
  const style = STYLES[key] ?? { fg: "text-muted-foreground", bg: "bg-muted" };
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-16 items-center justify-center gap-1.5 rounded px-2 text-[11px] leading-none font-medium tracking-wide uppercase",
        style.bg,
        style.fg
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.fg.replace("text-", "bg-"))} />
      {verdict}
    </span>
  );
}

/** Execution status — ATTEMPTED / WAITING_APPROVAL / EXECUTED / FAILED / DENIED / CANCELLED.
 *  Deliberately distinct visual language from VerdictBadge so decision vs. outcome never blur. */
const EXECUTION_STYLES: Record<string, string> = {
  attempted: "text-muted-foreground border-border",
  waiting_approval: "text-[var(--status-review)] border-[var(--status-review)]/30",
  executed: "text-[var(--status-allow)] border-[var(--status-allow)]/30",
  approved: "text-[var(--status-allow)] border-[var(--status-allow)]/30",
  failed: "text-[var(--status-block)] border-[var(--status-block)]/30",
  denied: "text-[var(--status-block)] border-[var(--status-block)]/30",
  cancelled: "text-faint-foreground border-border",
};

export function ExecutionStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-16 items-center justify-center rounded border px-2 text-[11px] leading-none font-medium tracking-wide uppercase",
        EXECUTION_STYLES[key] ?? "text-muted-foreground border-border"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
