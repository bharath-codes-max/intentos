import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
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
    <div className="flex h-full min-h-full">
      <Sidebar orgs={orgs} currentOrgId={currentOrgId} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="w-full px-8 py-7">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
