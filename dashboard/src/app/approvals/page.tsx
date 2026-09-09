import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listApprovals, listResolvedApprovals } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { LiveRefresh } from "@/components/live-refresh";
import { PendingApprovals, ResolvedApprovals } from "./approvals-list";
import { CheckCircledIcon } from "@radix-ui/react-icons";

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
        <div className="rounded-none border border-border bg-panel">
          <EmptyState
            icon={CheckCircledIcon}
            title="Nothing waiting on you"
            description="Actions your policies mark as REVIEW land here until a human approves or denies them."
          />
        </div>
      ) : (
        <PendingApprovals pending={pending} />
      )}

      {resolved.length > 0 && <ResolvedApprovals resolved={resolved} />}
    </div>
  );
}
