"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Silently re-runs the server component tree every `intervalMs` so new rows show up with no reload. */
export function LiveRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-allow opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-status-allow" />
      </span>
      updating live
    </span>
  );
}
