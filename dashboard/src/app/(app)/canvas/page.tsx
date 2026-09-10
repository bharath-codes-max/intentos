import { redirect } from "next/navigation";
import { listDecisions, getDecisionFlow, listEmployees, listScopeRequests, listContracts, listTokens } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { getSessionToken } from "@/lib/current-session";
import { GovernanceCanvas } from "./governance-canvas";
import { OverviewCanvas } from "./overview-canvas";

export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ decision?: string }>;
}) {
  const { decision } = await searchParams;
  const token = await getSessionToken();
  if (!token) redirect("/enter");
  const orgId = await getCurrentOrgId();

  if (decision) {
    const [flow, recentDecisions] = await Promise.all([getDecisionFlow(orgId, decision), listDecisions(orgId, 30)]);
    return (
      <div className="flex h-full min-h-0 flex-col">
        <GovernanceCanvas flow={flow} recentDecisions={recentDecisions} />
      </div>
    );
  }

  const [employees, scopeRequests, contracts, devices, decisions] = await Promise.all([
    listEmployees(token),
    listScopeRequests(token),
    listContracts(orgId),
    listTokens(orgId),
    listDecisions(orgId, 40),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OverviewCanvas
        employees={employees}
        devices={devices}
        pendingRequests={scopeRequests.filter((r) => r.status === "pending")}
        contracts={contracts.filter((c) => c.status === "active")}
        decisions={decisions}
      />
    </div>
  );
}
