"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ALL_NAV } from "./nav-items";

export function NavSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  function setOpenAndReset(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenAndReset(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAV;
    return ALL_NAV.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  function go(href: string) {
    router.push(href);
    setOpenAndReset(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpenAndReset}>
      <button
        type="button"
        onClick={() => setOpenAndReset(true)}
        className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-faint-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        aria-label="Search"
      >
        <MagnifyingGlassIcon className="size-[15px]" />
      </button>
      <DialogContent className="top-[20%] max-w-md translate-y-0 gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Jump to</DialogTitle>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-faint-foreground"
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0].href);
          }}
        />
        <div className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-2.5 py-3 text-[13px] text-muted-foreground">No matches.</p>
          )}
          {results.map((item) => (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-sidebar-accent"
            >
              <item.icon className="size-[15px] shrink-0" style={{ color: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
