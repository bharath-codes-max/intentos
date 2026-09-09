import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { listRuns } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { Activity, ChevronRight } from "lucide-react";

function formatDuration(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

const STATUS_LABEL: Record<string, string> = {
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_DOT: Record<string, string> = {
  running: "bg-status-review",
  completed: "bg-status-allow",
  failed: "bg-status-block",
  cancelled: "bg-faint-foreground",
};

export default async function ActivityPage() {
  const runs = await listRuns(await getCurrentOrgId());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Activity"
        description="What each agent run actually did — observed through connected agent integrations."
        actions={<LiveRefresh />}
      />

      <div className="rounded-lg border border-border bg-panel">
        {runs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No runs observed yet"
            description="Start a connected agent (Codex) in a repo wired to Intentos and its activity will appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/activity/${run.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[run.status] ?? "bg-faint-foreground"}`} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {run.task_summary ?? "Untitled run"}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {run.agent_label ?? run.provider} ·{" "}
                      {new Date(run.started_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {formatDuration(run.started_at, run.ended_at)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4 text-[12px]">
                  <span className="text-muted-foreground">{run.activity_count} actions</span>
                  <span className="text-status-allow">{run.allow_count}</span>
                  <span className="text-status-review">{run.review_count}</span>
                  <span className="text-status-block">{run.block_count}</span>
                  <span className="w-16 text-right text-muted-foreground">{STATUS_LABEL[run.status] ?? run.status}</span>
                  <ChevronRight className="size-3.5 text-faint-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
