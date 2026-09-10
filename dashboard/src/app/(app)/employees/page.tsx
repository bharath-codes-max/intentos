import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PersonIcon } from "@radix-ui/react-icons";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listEmployees, getActiveInvite, listScopeRequests, listContracts } from "@/lib/api";
import { getSessionToken, getRole } from "@/lib/current-session";
import { getCurrentOrgId } from "@/lib/current-org";
import { InviteLinkCard } from "./invite-link-card";
import { EmployeesTable } from "./employees-table";
import { ScopeRequestsPanel } from "./scope-requests-panel";

export default async function EmployeesPage() {
  const token = await getSessionToken();
  const role = await getRole();
  if (!token) redirect("/enter");
  if (role !== "admin") redirect("/employee");

  const orgId = await getCurrentOrgId();
  const [employees, invite, scopeRequests, contracts] = await Promise.all([
    listEmployees(token),
    getActiveInvite(token),
    listScopeRequests(token),
    listContracts(orgId),
  ]);
  const activeContracts = contracts.filter((c) => c.status === "active");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const inviteUrl = `${proto}://${host}/join/${invite.code}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Everyone at your company who can connect Claude Code, and who did what."
        icon={PersonIcon}
        iconColor="#F2A5C4"
      />

      <Card>
        <CardContent className="pt-6">
          <InviteLinkCard inviteUrl={inviteUrl} />
        </CardContent>
      </Card>

      {scopeRequests.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <ScopeRequestsPanel requests={scopeRequests} contracts={activeContracts} />
          </CardContent>
        </Card>
      )}

      <EmployeesTable employees={employees} />
    </div>
  );
}
