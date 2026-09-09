import Link from "next/link";
import { VerdictBadge, ExecutionStatusBadge } from "@/components/verdict-badge";
import { DataRow } from "@/components/ui/data-row";
import { ToolIcon } from "@/components/tool-icon";
import { EmptyState } from "@/components/common/empty-state";
import { decisionSummary, listDecisions, listApprovals, listTokens } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { LiveRefresh } from "@/components/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import {
  MixIcon,
  ArrowRightIcon,
  CubeIcon,
  ActivityLogIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  CrossCircledIcon,
  DashboardIcon,
} from "@radix-ui/react-icons";
import type { ComponentType, CSSProperties } from "react";

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
        <StatCard label="Agents connected" value={activeAgents} iconColor="#B39CE8" icon={CubeIcon} />
        <StatCard label="Total checks" value={total} iconColor="#7FC6EC" icon={ActivityLogIcon} />
        <StatCard label="Allowed" value={allow} iconColor="#A9D66B" icon={CheckCircledIcon} />
        <StatCard label="Needs review" value={review} iconColor="#F2C438" icon={ExclamationTriangleIcon} />
        <StatCard label="Blocked" value={block} iconColor="#EE9A5C" icon={CrossCircledIcon} />
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

      <section className="rounded-none border border-white/[0.1] bg-panel-raised shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Recent decisions
          </h2>
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
          <div className="divide-y divide-white/[0.06]">
            {decisions.map((d) => (
              <DataRow
                key={d.id}
                icon={<ToolIcon toolName={d.tool_name} />}
                trailing={
                  <>
                    <VerdictBadge verdict={d.decision} />
                    <ExecutionStatusBadge
                      status={d.approval_status ?? (d.decision === "allow" ? "executed" : "attempted")}
                    />
                    <span className="w-16 shrink-0 text-right text-[12px] text-muted-foreground">
                      {timeAgo(d.created_at)}
                    </span>
                  </>
                }
              >
                <p className="truncate text-[13px] font-medium text-foreground">{d.reason}</p>
                <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
                  {d.tool_name} · {d.agent_label ?? "Unknown agent"}
                </p>
              </DataRow>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  iconColor,
  icon: Icon,
}: {
  label: string;
  value: number;
  iconColor: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
}) {
  return (
    <div className="rounded-none border border-white/[0.1] bg-panel-raised px-4 py-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-transform duration-200 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(0,0,0,0.5)]">
      <Icon className="size-4" style={{ color: iconColor }} />
      <p className="mt-3 text-[28px] font-bold tabular-nums leading-none tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
