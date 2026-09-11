"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";

/** Reads the class the FOUC-prevention script in layout.tsx already applied to <html>, so there's
 *  no mismatch between what that script decided and what this button shows. Toggling updates both
 *  the class and localStorage, so a later reload picks the same theme back up. */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage can throw in private/locked-down browser contexts — theme just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--overlay-hover)] hover:text-foreground"
    >
      {isDark === null ? null : isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </button>
  );
}
