import Link from "next/link";
import { GearIcon, FileTextIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { listContracts } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { ContractsList } from "./contracts-list";

export default async function PoliciesPage() {
  const contracts = await listContracts(await getCurrentOrgId());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intent Contracts"
        description="Describe what an agent may do in plain English — Intentos compiles it into enforceable rules and enforces them deterministically, every time."
        icon={FileTextIcon}
        iconColor="#22D3EE"
        actions={
          <>
            <Link href="/policies/advanced">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <GearIcon className="size-3.5" /> Advanced
              </Button>
            </Link>
            <Link href="/policies/new">
              <Button size="sm">Create Intent Contract</Button>
            </Link>
          </>
        }
      />

      <ContractsList contracts={contracts} />
    </div>
  );
}
