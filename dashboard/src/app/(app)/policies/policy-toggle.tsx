"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { togglePolicyAction } from "./actions";

export function PolicyToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => togglePolicyAction(id, !active))}
    >
      {active ? "Disable" : "Enable"}
    </Button>
  );
}
