import { listTokens } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { PageHeader } from "@/components/ui/page-header";
import { ContractWizard } from "./contract-wizard";

export default async function NewContractPage() {
  const tokens = await listTokens(await getCurrentOrgId());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Intent Contract"
        description="Describe what the agent may do, must never do, and what needs a human — in plain English."
      />
      <ContractWizard agents={tokens.filter((t) => !t.revoked_at)} />
    </div>
  );
}
