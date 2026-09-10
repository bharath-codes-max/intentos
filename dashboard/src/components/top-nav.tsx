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
import type { Org } from "@/lib/api";

export function TopNav({ orgs, currentOrgId }: { orgs: Org[]; currentOrgId: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 pb-2 sm:px-5">
      <nav className="mx-auto flex max-w-[1400px] items-center gap-1 rounded-2xl border border-white/[0.08] bg-black/75 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:gap-2 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 pr-1">
          <Logo size={22} />
          <span className="text-[15px] font-bold tracking-tight text-foreground">Intentos</span>
        </Link>

        <ul className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
          {ALL_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-full px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                    active ? "bg-white/[0.08] text-foreground" : "text-[rgba(235,235,245,0.6)] hover:text-[rgba(235,235,245,0.9)]"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
          <OrgSwitcher orgs={orgs} currentOrgId={currentOrgId} compact />
          <LogoutButton />
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <Cross1Icon className="size-4" /> : <HamburgerMenuIcon className="size-4" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-6xl rounded-2xl border border-white/[0.08] bg-black/90 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden">
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
                      active ? "bg-white/[0.08] text-foreground" : "text-[rgba(235,235,245,0.65)] hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[15px] shrink-0" style={{ color: item.color }} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.08] pt-3">
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
