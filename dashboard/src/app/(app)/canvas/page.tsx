import { Share2Icon } from "@radix-ui/react-icons";
import { EmptyState } from "@/components/common/empty-state";
import { listDecisions, getDecisionFlow } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { GovernanceCanvas } from "./governance-canvas";

export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ decision?: string }>;
}) {
  const { decision } = await searchParams;
  const orgId = await getCurrentOrgId();
  const recentDecisions = await listDecisions(orgId, 30);

  const targetId = decision ?? recentDecisions[0]?.id;

  if (!targetId) {
    return (
      <div className="flex h-full items-center justify-center p-2">
        <EmptyState
          icon={Share2Icon}
          title="Nothing to visualize yet"
          description="Once an agent's action is checked, you'll be able to see it walk through your governance here."
        />
      </div>
    );
  }

  const flow = await getDecisionFlow(orgId, targetId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <GovernanceCanvas flow={flow} recentDecisions={recentDecisions} />
    </div>
  );
}
