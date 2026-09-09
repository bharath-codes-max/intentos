/**
 * Solid-filled pill badges — matching the reference "Status badge" component
 * (rounded-full, saturated color fill, small dot, light text). Two distinct
 * vocabularies: VerdictBadge for governance decisions (ALLOW/REVIEW/BLOCK),
 * ExecutionStatusBadge for outcomes (executed/failed/denied/etc) — kept as
 * separate components so decision vs. outcome never blur, even though they
 * now share the same solid-pill visual language.
 */
const COLOR: Record<string, string> = {
  allow: "var(--status-allow)",
  executed: "var(--status-allow)",
  approved: "var(--status-allow)",
  review: "var(--status-review)",
  waiting_approval: "var(--status-review)",
  block: "var(--status-block)",
  failed: "var(--status-block)",
  denied: "var(--status-block)",
  attempted: "#6b6c74",
  cancelled: "#6b6c74",
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap text-white uppercase tracking-wide"
      style={{ background: color }}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-white/70" />
      {label}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  const color = COLOR[verdict.toLowerCase()] ?? "#6b6c74";
  return <Pill label={verdict} color={color} />;
}

export function ExecutionStatusBadge({ status }: { status: string }) {
  const color = COLOR[status.toLowerCase()] ?? "#6b6c74";
  return <Pill label={status.replace(/_/g, " ")} color={color} />;
}
