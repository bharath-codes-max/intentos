import Link from "next/link";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { DataRow } from "@/components/ui/data-row";
import { AvatarChip } from "@/components/ui/avatar-chip";
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
import type { ComponentType } from "react";

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
        icon={DashboardIcon}
        iconColor="#7FC6EC"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Agents connected" value={activeAgents} tone="purple" icon={CubeIcon} />
        <StatCard label="Total checks" value={total} tone="blue" icon={ActivityLogIcon} />
        <StatCard label="Allowed" value={allow} tone="green" icon={CheckCircledIcon} />
        <StatCard label="Needs review" value={review} tone="yellow" icon={ExclamationTriangleIcon} />
        <StatCard label="Blocked" value={block} tone="orange" icon={CrossCircledIcon} />
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

      <section>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-2 pb-2.5">
          <h2 className="text-[13px] font-medium text-foreground">Recent decisions</h2>
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
                    <StatusIndicator status={d.decision} />
                    <AvatarChip label={d.agent_label} />
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

const STAT_COLORS = {
  yellow: "#F2C438",
  orange: "#EE9A5C",
  green: "#A9D66B",
  purple: "#B39CE8",
  blue: "#7FC6EC",
} as const;

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_COLORS;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className="rounded-none px-4 py-3.5 transition-transform duration-200 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
      style={{ background: STAT_COLORS[tone] }}
    >
      <Icon className="size-4 text-black/60" />
      <p className="mt-3 text-[30px] font-bold tabular-nums leading-none tracking-tight text-black">
        {value}
      </p>
      <p className="mt-1.5 text-[12.5px] font-medium text-black/65">{label}</p>
    </div>
  );
}
