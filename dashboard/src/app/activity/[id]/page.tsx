import Link from "next/link";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VerdictBadge, ExecutionStatusBadge } from "@/components/verdict-badge";
import { ToolIcon } from "@/components/tool-icon";
import { DataRow } from "@/components/ui/data-row";
import { getRun } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function formatDuration(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);

  const categoryCounts = run.events.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});
  const failedCount = run.events.filter((e) => e.execution_status === "failed").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/activity" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" /> Back to Agent Activity
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">{run.task_summary ?? "Untitled run"}</h1>
          {run.task_source === "captured_prompt" && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">Captured from the agent&apos;s actual prompt.</p>
          )}
          <p className="mt-1 text-[13px] text-muted-foreground">
            {run.agent_label ?? run.provider} · Started {new Date(run.started_at).toLocaleString()} · Duration{" "}
            {formatDuration(run.started_at, run.ended_at)}
          </p>
        </div>
        <Badge variant={run.status === "completed" ? "default" : run.status === "running" ? "secondary" : "destructive"}>
          {STATUS_LABEL[run.status] ?? run.status}
        </Badge>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-5">
          <Summary label="Activities" value={run.activity_count} />
          <Summary label="Allowed" value={run.allow_count} tone="allow" />
          <Summary label="Review" value={run.review_count} tone="review" />
          <Summary label="Blocked" value={run.block_count} tone="block" />
          <Summary label="Errors" value={run.error_count || failedCount} tone={run.error_count || failedCount ? "block" : undefined} />
        </CardContent>
      </Card>

      {Object.keys(categoryCounts).length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              What changed
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="font-normal">
                  {cat}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Activity timeline ({run.events.length})
          </p>
          {run.events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded for this run.</p>
          ) : (
            <div className="divide-y divide-border">
              {run.events.map((e) => (
                <DataRow
                  key={e.id}
                  icon={<ToolIcon toolName={e.tool ?? ""} />}
                  className="px-0"
                  trailing={
                    <>
                      {e.decision && <VerdictBadge verdict={e.decision} />}
                      <ExecutionStatusBadge status={e.execution_status} />
                    </>
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="secondary" className="font-normal">
                      {e.category}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{e.action ?? e.tool}</span>
                  </div>
                  {e.resource && <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{e.resource}</p>}
                  {e.decision && e.decision !== "allow" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.decision_reason}
                      {e.matched_rule && ` — matched rule: ${e.matched_rule}`}
                      {e.decision_id && (
                        <>
                          {" · "}
                          <Link href="/decisions" className="text-primary hover:underline">
                            View decision
                          </Link>
                        </>
                      )}
                      {e.execution_status === "waiting_approval" && (
                        <>
                          {" · "}
                          <Link href="/approvals" className="text-primary hover:underline">
                            View in Approvals
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                  {e.error_summary && (
                    <p className="mt-1.5 rounded-none border border-[color-mix(in_oklch,var(--status-block),transparent_65%)] bg-[var(--status-block-bg)] px-2.5 py-1.5 font-mono text-[12px] text-status-block">
                      {e.error_summary}
                    </p>
                  )}
                </DataRow>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: "allow" | "review" | "block" }) {
  const toneClass = tone === "allow" ? "text-status-allow" : tone === "review" ? "text-status-review" : tone === "block" ? "text-status-block" : "text-foreground";
  return (
    <div>
      <p className={`text-[20px] font-semibold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-[12px] text-muted-foreground">{label}</p>
    </div>
  );
}
