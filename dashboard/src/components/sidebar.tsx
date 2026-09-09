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

const TEXT_INACTIVE = "text-[rgba(235,235,245,0.65)]";
const TEXT_INACTIVE_HOVER = "hover:text-[rgba(235,235,245,0.9)]";
const TEXT_ACTIVE = "text-[rgba(255,255,255,0.92)]";

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
            "flex h-[33px] items-center gap-[10px] rounded-md text-[13.5px] transition-colors",
            collapsed ? "justify-center px-0" : "px-[10px]",
            active
              ? cn("bg-sidebar-accent font-medium", TEXT_ACTIVE)
              : cn("font-normal", TEXT_INACTIVE, TEXT_INACTIVE_HOVER, "hover:bg-sidebar-accent/70")
          )}
        >
          <item.icon
            className="size-[15px] shrink-0"
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
            className="flex w-full items-center gap-1 px-[10px] pb-1.5 text-[11.5px] font-medium tracking-[0.02em] text-[rgba(235,235,245,0.34)] transition-colors hover:text-[rgba(235,235,245,0.5)]"
          >
            {label}
            <ChevronDownIcon className={cn("size-3 transition-transform", !open && "-rotate-90")} />
          </button>
        )}
        {(collapsed || open) && <ul className="flex flex-col gap-[2px]">{items.map(renderItem)}</ul>}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-white/[0.06] bg-sidebar shadow-[10px_0_36px_rgba(0,0,0,0.65)] transition-[width] duration-150",
        collapsed ? "w-[60px]" : "w-[228px]"
      )}
    >
      <div className={cn("flex h-12 items-center gap-2", collapsed ? "justify-center px-2" : "px-3.5")}>
        <Link href="/" className="flex shrink-0 items-center">
          <Logo size={19} />
        </Link>
        {!collapsed && (
          <>
            <span className="shrink-0 text-[15px] font-bold tracking-tight text-foreground">Intentos</span>
            <NavSearch />
          </>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-[rgba(235,235,245,0.4)] transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronLeftIcon className="size-[15px]" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3.5 pt-3 pb-2">
        <ul className="flex flex-col gap-[2px]">{TOP_NAV.map(renderItem)}</ul>

        {renderSection("Governance", GOVERNANCE_NAV, governanceOpen, setGovernanceOpen)}
        {renderSection("Monitoring", MONITORING_NAV, monitoringOpen, setMonitoringOpen)}

        {collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="mx-auto mt-4 flex size-7 shrink-0 items-center justify-center rounded-md text-[rgba(235,235,245,0.4)] transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronRightIcon className="size-[15px]" />
          </button>
        )}
      </nav>
    </aside>
  );
}
