"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { TOP_NAV, GOVERNANCE_NAV, MONITORING_NAV, type NavItem } from "./nav-items";
import { NavSearch } from "./nav-search";
import { useSidebarCollapsed, setSidebarCollapsed } from "./sidebar-collapse-store";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const [governanceOpen, setGovernanceOpen] = useState(true);
  const [monitoringOpen, setMonitoringOpen] = useState(true);

  function toggle() {
    setSidebarCollapsed(!collapsed);
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  function renderItem(item: NavItem) {
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          title={collapsed ? item.label : undefined}
          className={cn(
            "flex h-10 items-center gap-3 rounded-lg text-[14.5px] transition-colors",
            collapsed ? "justify-center px-0" : "px-2.5",
            active
              ? "bg-sidebar-accent text-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          )}
        >
          <item.icon
            className="size-[18px] shrink-0"
            style={item.colorVar ? { color: `var(${item.colorVar})` } : undefined}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
      </li>
    );
  }

  function renderSection(
    label: string,
    items: NavItem[],
    open: boolean,
    setOpen: (v: boolean) => void
  ) {
    return (
      <div className="mt-5">
        {!collapsed && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center gap-1 px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-faint-foreground transition-colors hover:text-muted-foreground"
          >
            {label}
            <ChevronDownIcon
              className={cn("size-3 transition-transform", !open && "-rotate-90")}
            />
          </button>
        )}
        {(collapsed || open) && <ul className="flex flex-col gap-0.5">{items.map(renderItem)}</ul>}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-white/[0.08] bg-sidebar shadow-[10px_0_36px_rgba(0,0,0,0.65)] transition-[width] duration-150",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className={cn("flex h-16 items-center gap-2", collapsed ? "justify-center px-2" : "px-4")}>
        <Link href="/" className="flex shrink-0 items-center">
          <Logo size={22} />
        </Link>
        {!collapsed && (
          <>
            <span className="shrink-0 text-[16px] font-semibold tracking-tight text-foreground">Intentos</span>
            <NavSearch />
          </>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-faint-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronLeftIcon className="size-[15px]" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">{TOP_NAV.map(renderItem)}</ul>

        {renderSection("Governance", GOVERNANCE_NAV, governanceOpen, setGovernanceOpen)}
        {renderSection("Monitoring", MONITORING_NAV, monitoringOpen, setMonitoringOpen)}

        {collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="mx-auto mt-4 flex size-7 shrink-0 items-center justify-center rounded-md text-faint-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronRightIcon className="size-[15px]" />
          </button>
        )}
      </nav>
    </aside>
  );
}
