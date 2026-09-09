import { PageHeader } from "@/components/ui/page-header";
import { CubeIcon } from "@radix-ui/react-icons";
import { listTokens, listDecisions } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { NewTokenDialog } from "./new-token-dialog";
import { AgentsTable } from "./agents-table";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const orgId = await getCurrentOrgId();
  const [tokens, decisions] = await Promise.all([listTokens(orgId), listDecisions(orgId, 200)]);

  const lastActivityByLabel = new Map<string, string>();
  for (const d of decisions) {
    if (d.agent_label && !lastActivityByLabel.has(d.agent_label)) {
      lastActivityByLabel.set(d.agent_label, d.created_at);
    }
  }

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] px-4 py-3 text-[13px] text-foreground">
          Company created. Register your first agent below to get a token, then write a policy for it.
        </div>
      )}
      <PageHeader
        title="Agents"
        description="Every agent token issued to this company."
        actions={<NewTokenDialog />}
        icon={CubeIcon}
        iconColor="#B39CE8"
      />

      <AgentsTable tokens={tokens} lastActivityByLabel={lastActivityByLabel} />
    </div>
  );
}
