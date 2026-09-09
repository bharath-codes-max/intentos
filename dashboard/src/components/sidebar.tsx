"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Bot,
  ScrollText,
  ListChecks,
  CircleCheck,
  Activity,
  TerminalSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Org } from "@/lib/api";
import { OrgSwitcher } from "./org-switcher";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/policies", label: "Intent Contracts", icon: ScrollText },
  { href: "/decisions", label: "Decisions", icon: ListChecks },
  { href: "/approvals", label: "Approvals", icon: CircleCheck },
  { href: "/activity", label: "Agent Activity", icon: Activity },
];

const UTILITY = [{ href: "/test", label: "Test console", icon: TerminalSquare }];

export function Sidebar({ orgs, currentOrgId }: { orgs: Org[]; currentOrgId: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-12 items-center gap-2 px-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-[13px] font-medium tracking-tight text-foreground">Intentos</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <item.icon className="size-[15px] shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 border-t border-border pt-2">
          <ul className="flex flex-col gap-0.5">
            {UTILITY.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-foreground"
                        : "text-faint-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[15px] shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="border-t border-border p-2">
        <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} />
      </div>
    </aside>
  );
}
