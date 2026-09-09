import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Code } from "@/components/ui/code";
import { ToolIcon } from "@/components/tool-icon";
import { DataRow } from "@/components/ui/data-row";
import { listApprovals, listResolvedApprovals } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { LiveRefresh } from "@/components/live-refresh";
import { ApprovalButtons } from "./approval-buttons";
import { CheckCircledIcon } from "@radix-ui/react-icons";

function summarizeInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(", ");
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default async function ApprovalsPage() {
  const orgId = await getCurrentOrgId();
  const [pending, resolved] = await Promise.all([listApprovals(orgId), listResolvedApprovals(orgId, 20)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Actions paused for human review. Nothing here executes until you decide."
        actions={<LiveRefresh />}
      />

      {pending.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel">
          <EmptyState
            icon={CheckCircledIcon}
            title="Nothing waiting on you"
            description="Actions your policies mark as REVIEW land here until a human approves or denies them."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((a) => (
            <DataRow
              key={a.id}
              icon={<ToolIcon toolName={a.tool_name} className="text-status-review" />}
              className="rounded-lg border border-[color-mix(in_oklch,var(--status-review),transparent_65%)] bg-[var(--status-review-bg)] hover:bg-[var(--status-review-bg)]"
              trailing={<ApprovalButtons id={a.id} />}
            >
              <p className="text-[13px] font-medium text-foreground">
                {a.agent_label ?? "Unknown agent"}
                <span className="text-muted-foreground"> requested </span>
                <Code>{a.tool_name}</Code>
              </p>
              <p className="mt-1 truncate font-mono text-[12px] text-muted-foreground">
                {summarizeInput(a.tool_input)}
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">{a.reason}</p>
              <div className="flex items-center gap-3 pt-1 text-[11.5px] text-faint-foreground">
                {a.matched_rule && <span>Rule: {a.matched_rule}</span>}
                <span>{timeAgo(a.created_at)}</span>
              </div>
            </DataRow>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="rounded-lg border border-border bg-panel">
          <div className="border-b border-border px-4 py-2.5">
            <h2 className="text-[13.5px] font-medium text-foreground">Recently resolved</h2>
          </div>
          <div className="divide-y divide-border px-4">
            {resolved.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-foreground">
                    {r.agent_label ?? "Unknown agent"} — <span className="font-mono text-[12px]">{r.tool_name}</span>
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">{r.reason}</p>
                </div>
                <div className="shrink-0 text-right text-[12px]">
                  <p
                    className={
                      r.approval_status === "approved" ? "text-status-allow" : "text-status-block"
                    }
                  >
                    {r.approval_status} by {r.reviewer}
                  </p>
                  <p className="text-faint-foreground">{new Date(r.resolved_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
