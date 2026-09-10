import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { decisionSummary, listDecisions, listApprovals, listTokens } from "@/lib/api";
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
        <div className="rounded-none border border-[color-mix(in_oklch,var(--status-review),transparent_60%)] bg-[var(--status-review-bg)] px-4 py-3">
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

      <OverviewDecisions decisions={decisions} />
    </div>
  );
}
