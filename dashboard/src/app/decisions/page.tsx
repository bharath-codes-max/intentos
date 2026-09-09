import { PageHeader } from "@/components/ui/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { listDecisions } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { DecisionsTable } from "./decisions-table";

export default async function DecisionsPage() {
  const orgId = await getCurrentOrgId();
  const decisions = await listDecisions(orgId, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decisions"
        description="The permanent audit log — every check any agent has made, in order."
        actions={<LiveRefresh />}
      />

      <DecisionsTable decisions={decisions} />
    </div>
  );
}
