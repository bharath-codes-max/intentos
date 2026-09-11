import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { ActivityBarChart } from "@/components/ui/activity-bar-chart";
import { decisionSummary, listDecisions, listApprovals, listTokens, dailyDecisionCounts, type DailyDecisionCount } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { LiveRefresh } from "@/components/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { OverviewDecisions } from "./overview-decisions";
import {
  ArrowRightIcon,
  CubeIcon,
  ActivityLogIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  CrossCircledIcon,
  DashboardIcon,
} from "@radix-ui/react-icons";

export default async function OverviewPage() {
  const orgId = await getCurrentOrgId();
  const [summary, decisions, approvals, tokens, daily] = await Promise.all([
    decisionSummary(orgId),
    listDecisions(orgId, 8),
    listApprovals(orgId),
    listTokens(orgId),
    // Falls back to an empty week rather than crashing the whole page if this specific
    // endpoint isn't deployed yet (e.g. API redeploy still pending after a dashboard push).
    dailyDecisionCounts(orgId).catch((): DailyDecisionCount[] => {
      const days: DailyDecisionCount[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ day: d.toISOString().slice(0, 10), count: 0 });
      }
      return days;
    }),
  ]);

  const total = Number(summary.total);
  const allow = Number(summary.allow);
  const review = Number(summary.review);
  const block = Number(summary.block);
  const activeAgents = tokens.filter((t) => !t.revoked_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Every action your agents attempt, checked in real time."
        actions={<LiveRefresh />}
        icon={DashboardIcon}
        iconColor="#FF3D9A"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Agents connected" value={activeAgents} iconColor="#B39CE8" icon={CubeIcon} />
        <MetricCard label="Total checks" value={total} iconColor="#7FC6EC" icon={ActivityLogIcon} />
        <MetricCard label="Allowed" value={allow} iconColor="#A9D66B" icon={CheckCircledIcon} />
        <MetricCard label="Needs review" value={review} iconColor="#F2C438" icon={ExclamationTriangleIcon} />
        <MetricCard label="Blocked" value={block} iconColor="#EE9A5C" icon={CrossCircledIcon} />
      </div>

      {approvals.length > 0 && (
        <div className="rounded-2xl border border-[color-mix(in_oklch,var(--status-review),transparent_60%)] bg-[var(--status-review-bg)] px-4 py-3">
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

      <ActivityBarChart data={daily} />

      <OverviewDecisions decisions={decisions} />
    </div>
  );
}
