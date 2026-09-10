"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveApprovalAction } from "./actions";

export function ApprovalButtons({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<"approved" | "denied" | null>(null);

  if (resolved) {
    return (
      <span className="text-[12.5px] font-medium text-muted-foreground">
        {resolved === "approved" ? "Approved — resuming agent…" : "Denied"}
      </span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolveApprovalAction(id, true);
            setResolved("approved");
          })
        }
      >
        Approve once
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolveApprovalAction(id, false);
            setResolved("denied");
          })
        }
      >
        Deny
      </Button>
    </div>
  );
}
