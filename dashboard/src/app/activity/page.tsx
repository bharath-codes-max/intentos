import { PageHeader } from "@/components/ui/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { listRuns } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { ActivityList } from "./activity-list";

export default async function ActivityPage() {
  const runs = await listRuns(await getCurrentOrgId());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Activity"
        description="What each agent run actually did — observed through connected agent integrations."
        actions={<LiveRefresh />}
      />

      <ActivityList runs={runs} />
    </div>
  );
}
