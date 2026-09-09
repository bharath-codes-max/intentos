"use client";

import { useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/verdict-badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import { Code, CodeBlock } from "@/components/ui/code";
import { ToolIcon } from "@/components/tool-icon";
import { EmptyState } from "@/components/common/empty-state";
import { MixIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import type { Decision } from "@/lib/api";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function summarizeInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(", ");
}

export function DecisionsTable({ decisions }: { decisions: Decision[] }) {
  const [selected, setSelected] = useState<Decision | null>(null);

  if (decisions.length === 0) {
    return (
      <div className="p-2">
        <EmptyState icon={MixIcon} title="No decisions logged yet" description="They'll appear here as agents act." />
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Tool</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead className="text-right">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decisions.map((d) => (
            <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
              <TableCell className="text-muted-foreground">{formatTime(d.created_at)}</TableCell>
              <TableCell className="text-foreground">{d.agent_label ?? "—"}</TableCell>
              <TableCell className="font-mono text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ToolIcon toolName={d.tool_name} />
                  {d.tool_name}
                </span>
              </TableCell>
              <TableCell className="max-w-md truncate font-mono text-[12px] text-muted-foreground">
                {summarizeInput(d.tool_input)}
              </TableCell>
              <TableCell>
                <VerdictBadge verdict={d.decision} />
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {d.matched_rule ?? "—"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {d.approval_status ? d.approval_status : d.decision === "allow" ? "executed" : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Drawer open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <>
              <DrawerHeader>
                <DrawerTitle>Decision detail</DrawerTitle>
              </DrawerHeader>
              <DrawerBody className="space-y-5">
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={selected.decision} />
                  <span className="text-[12.5px] text-muted-foreground">{formatTime(selected.created_at)}</span>
                </div>

                <Field label="Agent">{selected.agent_label ?? "—"}</Field>
                <Field label="Tool">
                  <Code>{selected.tool_name}</Code>
                </Field>
                <Field label="Action input">
                  <CodeBlock>{JSON.stringify(selected.tool_input, null, 2)}</CodeBlock>
                </Field>
                <Field label="Reason">{selected.reason}</Field>
                {selected.matched_rule && <Field label="Matched rule">{selected.matched_rule}</Field>}
                {selected.approval_status && (
                  <Field label="Approval">
                    {selected.approval_status}
                    {selected.reviewer && ` — ${selected.reviewer}`}
                  </Field>
                )}
                <Field label="Latency">{selected.latency_ms}ms</Field>
                <Field label="Decision ID">
                  <Code>{selected.id}</Code>
                </Field>
                {selected.run_id && (
                  <Link
                    href={`/activity/${selected.run_id}`}
                    className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
                  >
                    View run <ExternalLinkIcon className="size-3" />
                  </Link>
                )}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-wide text-faint-foreground uppercase">{label}</p>
      <div className="text-[13px] text-foreground">{children}</div>
    </div>
  );
}
