import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/verdict-badge";
import { EmptyState } from "@/components/common/empty-state";
import { decisionSummary, listDecisions, listApprovals, listTokens } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { LiveRefresh } from "@/components/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { MixIcon, ArrowRightIcon } from "@radix-ui/react-icons";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function OverviewPage() {
  const orgId = await getCurrentOrgId();
  const [summary, decisions, approvals, tokens] = await Promise.all([
    decisionSummary(orgId),
    listDecisions(orgId, 8),
    listApprovals(orgId),
    listTokens(orgId),
  ]);

  const total = Number(summary.total);
  const allow = Number(summary.allow);
  const review = Number(summary.review);
  const block = Number(summary.block);
  const activeAgents = tokens.filter((t) => !t.revoked_at).length;

  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Every action your agents attempt, checked in real time."
        actions={<LiveRefresh />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Agents connected" value={activeAgents} />
        <StatCard label="Total checks" value={total} />
        <StatCard label="Allowed" value={allow} tone="allow" />
        <StatCard label="Needs review" value={review} tone="review" />
        <StatCard label="Blocked" value={block} tone="block" />
      </div>

      {total > 0 && (
        <div
          className="flex h-1 w-full overflow-hidden rounded-full bg-white/[0.05]"
          style={{ boxShadow: "0 0 16px rgba(63,185,80,.06), 0 0 16px rgba(229,83,75,.06)" }}
        >
          <div className="h-full bg-status-allow" style={{ width: `${pct(allow)}%` }} />
          <div className="h-full bg-status-review" style={{ width: `${pct(review)}%` }} />
          <div className="h-full bg-status-block" style={{ width: `${pct(block)}%` }} />
        </div>
      )}

      {approvals.length > 0 && (
        <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-review),transparent_60%)] bg-[var(--status-review-bg)] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground">
              {approvals.length} action{approvals.length === 1 ? "" : "s"} waiting on your approval
            </p>
            <Link
              href="/approvals"
              className="flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:underline"
            >
              Review <ArrowRightIcon className="size-3" />
            </Link>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-[13.5px] font-medium text-foreground">Recent decisions</h2>
          <Link href="/decisions" className="text-[12.5px] text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
        {decisions.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={MixIcon}
              title="No decisions yet"
              description="Waiting on the first agent check."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Decision</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <VerdictBadge verdict={d.decision} />
                  </TableCell>
                  <TableCell className="text-foreground">{d.agent_label ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">{d.tool_name}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">{d.reason}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{timeAgo(d.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "allow" | "review" | "block";
}) {
  const border =
    tone === "allow"
      ? "color-mix(in oklch, var(--status-allow), transparent 75%)"
      : tone === "review"
        ? "color-mix(in oklch, var(--status-review), transparent 75%)"
        : tone === "block"
          ? "color-mix(in oklch, var(--status-block), transparent 75%)"
          : "rgba(255,255,255,0.08)";

  const glow =
    tone === "allow"
      ? "0 0 24px color-mix(in oklch, var(--status-allow), transparent 95%)"
      : tone === "review"
        ? "0 0 24px color-mix(in oklch, var(--status-review), transparent 95%)"
        : tone === "block"
          ? "0 0 24px color-mix(in oklch, var(--status-block), transparent 95%)"
          : "none";

  const text = tone ? { allow: "text-status-allow", review: "text-status-review", block: "text-status-block" }[tone] : "text-foreground";

  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: border,
        boxShadow: `inset 0 1px rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.2), ${glow}`,
      }}
    >
      <p className={`text-[26px] font-medium tabular-nums leading-none tracking-tight ${text}`}>{value}</p>
      <p className="mt-2 text-[12.5px] text-muted-foreground">{label}</p>
    </div>
  );
}
