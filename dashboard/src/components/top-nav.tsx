"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HamburgerMenuIcon, Cross1Icon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ALL_NAV } from "./nav-items";
import { OrgSwitcher } from "./org-switcher";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import type { Org } from "@/lib/api";

export function TopNav({ orgs, currentOrgId }: { orgs: Org[]; currentOrgId: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background shadow-[var(--shadow-lg)]">
      <nav className="mx-auto flex max-w-[1400px] items-center gap-1 px-3 py-3.5 sm:gap-2 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 pr-1 text-foreground">
          <Logo size={22} />
          <span className="text-[16px] font-semibold tracking-tight">Intentos</span>
        </Link>

        <ul className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto pl-4 lg:flex">
          {ALL_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-2.5 py-1.5 font-mono text-[13px] whitespace-nowrap transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
          <ThemeToggle />
          <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} compact />
          <LogoutButton />
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--overlay-hover)] hover:text-foreground lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <Cross1Icon className="size-4" /> : <HamburgerMenuIcon className="size-4" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-background p-3 lg:hidden">
          <ul className="flex flex-col gap-0.5">
            {ALL_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                      active ? "bg-[var(--overlay-hover)] text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[15px] shrink-0" style={{ color: item.color }} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <ThemeToggle />
            <div className="flex-1">
              <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} />
            </div>
            <LogoutButton />
          </div>
        </div>
      )}
    </header>
  );
}
