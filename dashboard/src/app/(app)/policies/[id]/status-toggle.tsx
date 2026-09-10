"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleContractStatusAction } from "./actions";

export function ContractStatusToggle({ id, status }: { id: string; status: "draft" | "active" | "archived" }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={status === "active" ? "destructive" : "secondary"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() => toggleContractStatusAction(id, status === "active" ? "archived" : "active"))
      }
    >
      {status === "active" ? "Archive" : "Reactivate"}
    </Button>
  );
}
