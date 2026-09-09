"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Org } from "@/lib/api";
import { OrgSwitcher } from "./org-switcher";
import { Logo } from "./logo";
import { NAV, UTILITY } from "./nav-items";
import { NavSearch } from "./nav-search";

export function Sidebar({ orgs, currentOrgId }: { orgs: Org[]; currentOrgId: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center">
          <Logo size={22} />
        </Link>
        <span className="shrink-0 text-[16px] font-semibold tracking-tight text-foreground">Intentos</span>
        <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} compact />
        <NavSearch />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-faint-foreground">
          Workspace
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-2.5 text-[14.5px] transition-colors",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <p className="px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-faint-foreground">
            Tools
          </p>
          <ul className="flex flex-col gap-0.5">
            {UTILITY.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-lg px-2.5 text-[14.5px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-foreground"
                        : "text-faint-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
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
