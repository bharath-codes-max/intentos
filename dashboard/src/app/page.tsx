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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Agents connected" value={activeAgents} />
        <StatCard label="Total checks" value={total} />
        <StatCard label="Allowed" value={allow} tone="allow" />
        <StatCard label="Needs review" value={review} tone="review" />
        <StatCard label="Blocked" value={block} tone="block" />
      </div>

      {total > 0 && (
        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
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
                  <TableCell className="max-w-xs truncate text-muted-foreground">{d.reason}</TableCell>
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
  const styles =
    tone === "allow"
      ? { bg: "bg-[var(--status-allow-bg)]", border: "border-[color-mix(in_oklch,var(--status-allow),transparent_65%)]", text: "text-status-allow" }
      : tone === "review"
        ? { bg: "bg-[var(--status-review-bg)]", border: "border-[color-mix(in_oklch,var(--status-review),transparent_65%)]", text: "text-status-review" }
        : tone === "block"
          ? { bg: "bg-[var(--status-block-bg)]", border: "border-[color-mix(in_oklch,var(--status-block),transparent_65%)]", text: "text-status-block" }
          : { bg: "bg-panel", border: "border-border", text: "text-foreground" };

  return (
    <div className={`rounded-lg border px-3.5 py-3 ${styles.bg} ${styles.border}`}>
      <p className={`text-[22px] font-semibold tabular-nums leading-none ${styles.text}`}>{value}</p>
      <p className="mt-1.5 text-[12px] text-muted-foreground">{label}</p>
    </div>
  );
}
