"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";
import type { ScopeRequest, Contract } from "@/lib/api";
import { resolveScopeRequestAction } from "./actions";
import { ApproveDialog } from "./approve-request-dialog";

function Row({ request, contracts }: { request: ScopeRequest; contracts: Contract[] }) {
  const [pending, start] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const isPending = request.status === "pending";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">
          {request.requested_by_email}
          <span className="text-muted-foreground"> wants to </span>
          <span className="font-mono">{request.requested_action}</span>
          <span className="text-muted-foreground"> govern </span>
          <span className="font-mono">{request.project_identifier}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {request.device_label ?? "Unknown device"} · {new Date(request.created_at).toLocaleString()}
        </p>
      </div>
      {isPending ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await resolveScopeRequestAction(request.id, false);
                if (!result.ok) addToast({ title: "Couldn't deny", description: result.error, type: "error" });
              })
            }
          >
            Deny
          </Button>
          <Button type="button" size="sm" onClick={() => setApproveOpen(true)}>
            Approve
          </Button>
          <ApproveDialog
            request={request}
            contracts={contracts}
            open={approveOpen}
            onOpenChange={setApproveOpen}
            onApproved={() => setApproveOpen(false)}
          />
        </div>
      ) : (
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            request.status === "approved"
              ? "border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] text-foreground"
              : "border-[color-mix(in_oklch,var(--status-block),transparent_65%)] bg-[var(--status-block-bg)] text-foreground"
          }`}
        >
          {request.status}
        </span>
      )}
    </div>
  );
}

export function ScopeRequestsPanel({ requests, contracts }: { requests: ScopeRequest[]; contracts: Contract[] }) {
  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending").slice(0, 10);

  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[13px] font-medium text-foreground">Project access requests</div>
        <p className="text-[13px] text-muted-foreground">
          Employees can ask to add or exclude a project from their device&apos;s governance —
          including one requires picking which Intent Contract governs it before it takes effect.
        </p>
      </div>
      {pending.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border">
          {pending.map((r) => (
            <Row key={r.id} request={r} contracts={contracts} />
          ))}
        </div>
      )}
      {resolved.length > 0 && (
        <details className="text-[12px] text-muted-foreground">
          <summary className="cursor-pointer select-none">Recently resolved ({resolved.length})</summary>
          <div className="mt-2 divide-y divide-border rounded-lg border border-border">
            {resolved.map((r) => (
              <Row key={r.id} request={r} contracts={contracts} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
