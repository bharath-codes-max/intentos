import { AppShell } from "@/components/ui/app-shell";
import { listOrgs } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const [orgs, currentOrgId] = await Promise.all([listOrgs(), getCurrentOrgId()]);
  return (
    <AppShell orgs={orgs} currentOrgId={currentOrgId}>
      {children}
    </AppShell>
  );
}
