"use client";

import { useTransition } from "react";
import { PersonIcon } from "@radix-ui/react-icons";
import { DataRow } from "@/components/ui/data-row";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
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

function Row({ employee }: { employee: Employee }) {
  const [pending, start] = useTransition();
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
          {employee.role !== "admin" && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm(`Revoke ${employee.email}'s access? All their connected devices will be disconnected.`)) {
                  start(() => revokeEmployeeAction(employee.id));
                }
              }}
            >
              {pending ? "Revoking…" : "Revoke"}
            </Button>
          )}
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
