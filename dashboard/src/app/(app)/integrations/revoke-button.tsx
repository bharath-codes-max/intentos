"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeTokenAction } from "./actions";

export function RevokeButton({ tokenId }: { tokenId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm("Disconnect this device? It will stop being able to run governed actions immediately.")) {
          start(() => revokeTokenAction(tokenId));
        }
      }}
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
