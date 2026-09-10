"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Employee } from "@/lib/api";
import { revokeEmployeeAction } from "./actions";

/** Confirm-before-revoke dialog for one employee. */
export function RevokeDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();

  function handleRevoke() {
    start(async () => {
      const result = await revokeEmployeeAction(employee.id);
      if (!result.ok) {
        addToast({ title: "Couldn't revoke access", description: result.error, type: "error" });
        return;
      }
      onOpenChange(false);
      addToast({
        title: "Access revoked",
        description: `${employee.email} can no longer sign in or connect devices.`,
        type: "success",
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke {employee.email}&apos;s access?</DialogTitle>
          <DialogDescription>
            All their connected devices will be disconnected, and they won&apos;t be able to sign in again until you
            reinvite them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleRevoke} disabled={pending}>
            {pending ? "Revoking…" : "Revoke access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
