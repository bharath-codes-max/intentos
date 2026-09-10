import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Toaster } from "@/components/ui/toast";
import type { Org } from "@/lib/api";

/** The persistent app frame: sidebar + scrollable content column. One shell, every page renders inside it. */
export function AppShell({
  orgs,
  currentOrgId,
  children,
}: {
  orgs: Org[];
  currentOrgId: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-full w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 p-3">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border border-white/[0.08] bg-panel shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
            <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} />
            <LogoutButton />
          </div>
          <div className="w-full flex-1 overflow-y-auto p-6">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
