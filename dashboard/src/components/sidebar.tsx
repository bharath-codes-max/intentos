"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  CubeIcon,
  FileTextIcon,
  MixIcon,
  CheckCircledIcon,
  ActivityLogIcon,
  CodeIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Org } from "@/lib/api";
import { OrgSwitcher } from "./org-switcher";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Overview", icon: DashboardIcon },
  { href: "/agents", label: "Agents", icon: CubeIcon },
  { href: "/policies", label: "Intent Contracts", icon: FileTextIcon },
  { href: "/decisions", label: "Decisions", icon: MixIcon },
  { href: "/approvals", label: "Approvals", icon: CheckCircledIcon },
  { href: "/activity", label: "Agent Activity", icon: ActivityLogIcon },
];

const UTILITY = [{ href: "/test", label: "Test console", icon: CodeIcon }];

export function Sidebar({ orgs, currentOrgId }: { orgs: Org[]; currentOrgId: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-white/[0.05] bg-sidebar">
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center">
          <Logo size={20} />
        </Link>
        <span className="shrink-0 text-[15px] font-semibold tracking-tight text-foreground">Intentos</span>
        <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} compact />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-1">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <item.icon className="size-[17px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <ul className="flex flex-col gap-0.5">
            {UTILITY.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-foreground"
                        : "text-faint-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[17px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
