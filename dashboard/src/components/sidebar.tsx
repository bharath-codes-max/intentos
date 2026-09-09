"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV, UTILITY } from "./nav-items";
import { NavSearch } from "./nav-search";
import { useSidebarCollapsed, setSidebarCollapsed } from "./sidebar-collapse-store";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();

  function toggle() {
    setSidebarCollapsed(!collapsed);
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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
        {!collapsed && (
          <p className="px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-faint-foreground">
            Workspace
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
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
                  <item.icon className="size-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          {!collapsed && (
            <p className="px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-faint-foreground">
              Tools
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {UTILITY.map((item) => {
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
                        : "text-faint-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

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
