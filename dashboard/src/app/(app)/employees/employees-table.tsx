"use client";

import { useState, useTransition } from "react";
import { PersonIcon } from "@radix-ui/react-icons";
import { DataRow } from "@/components/ui/data-row";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { addToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { colorFor } from "@/lib/color-hash";
import type { Employee } from "@/lib/api";
import { revokeEmployeeAction } from "./actions";

function timeAgo(iso: string | null): string {
  if (!iso) return "No activity yet";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function RevokeDialog({
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

function Row({ employee }: { employee: Employee }) {
  const [revokeOpen, setRevokeOpen] = useState(false);
  const devices = Number(employee.connected_devices);

  return (
    <DataRow
      icon={<PersonIcon className="size-[14px]" />}
      iconColor={colorFor(employee.email)}
      trailing={
        <>
          <Chip label={employee.role} />
          <span className="w-24 shrink-0 text-right text-[12px] text-muted-foreground">
            {devices} device{devices === 1 ? "" : "s"}
          </span>
          <span className="w-24 shrink-0 text-right text-[12px] text-muted-foreground">
            {timeAgo(employee.last_activity_at)}
          </span>
          {employee.role !== "admin" &&
            (employee.revoked_at ? (
              <Chip label="Revoked" />
            ) : (
              <>
                <Button type="button" variant="destructive" size="sm" onClick={() => setRevokeOpen(true)}>
                  Revoke
                </Button>
                <RevokeDialog employee={employee} open={revokeOpen} onOpenChange={setRevokeOpen} />
              </>
            ))}
        </>
      }
    >
      <p className="truncate text-[13px] font-medium text-foreground">{employee.email}</p>
      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
        Joined {new Date(employee.created_at).toLocaleDateString()}
      </p>
    </DataRow>
  );
}

export function EmployeesTable({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) {
    return <EmptyState icon={PersonIcon} title="No employees yet" description="Share the invite link above to add your first one." />;
  }
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {employees.map((e) => (
        <Row key={e.id} employee={e} />
      ))}
    </div>
  );
}
