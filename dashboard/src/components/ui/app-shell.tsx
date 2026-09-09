import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
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
    <div className="flex h-full min-h-full w-full">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex h-14 shrink-0 items-center border-b border-white/[0.05] px-8">
          <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} />
        </div>
        <div className="w-full px-8 py-7">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
