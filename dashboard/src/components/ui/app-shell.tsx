import { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";
import { Toaster } from "@/components/ui/toast";
import type { Org } from "@/lib/api";

/** The persistent app frame: a full-width top nav bar over a centered, editorial-width content
 *  column — every page renders inside that column. */
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
    <div className="min-h-full w-full bg-background">
      <TopNav orgs={orgs} currentOrgId={currentOrgId} />
      <main className="mx-auto w-full max-w-[1400px] px-3 py-6 sm:px-4 sm:py-8">{children}</main>
      <Toaster />
    </div>
  );
}
