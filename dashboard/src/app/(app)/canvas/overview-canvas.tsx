"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PersonIcon,
  DesktopIcon,
  FileTextIcon,
  QuestionMarkCircledIcon,
  ExternalLinkIcon,
  ArrowLeftIcon,
  PaperPlaneIcon,
  CopyIcon,
  CheckIcon,
  ReloadIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import { colorFor, initialsFromEmail } from "@/lib/color-hash";
import type { Employee, AgentToken, ScopeRequest, Contract, Decision } from "@/lib/api";
import { useCanvasControls } from "./use-canvas-controls";
import { CanvasSurface, TONE_COLOR, TONE_BG, type Tone, type GenericNode, type GenericEdge } from "./canvas-shell";
import { ApproveDialog, type SelectableContract } from "../employees/approve-request-dialog";
import { RevokeDialog } from "../employees/revoke-employee-dialog";
import { resolveScopeRequestAction, regenerateInviteAction } from "../employees/actions";
import { addToast } from "@/components/ui/toast";

type NodeKind = "employee" | "device" | "request" | "contract" | "invite";

interface OverviewNode extends GenericNode {
  kind: NodeKind;
  icon: typeof PersonIcon;
  title: string;
  subtitle: string;
  tone: Tone;
  statusLabel?: string;
  employee?: Employee;
  device?: AgentToken;
  request?: ScopeRequest;
  contract?: Contract;
  /** True only for nodes the admin dragged onto the canvas themselves (not derived from live
   *  server data) — these are the only ones that can be removed from the canvas. */
  composed?: boolean;
}

const PALETTE_ITEMS = [{ kind: "invite" as const, label: "Invite Employee", icon: PaperPlaneIcon }];

const COL_EMPLOYEE = 40;
const COL_DEVICE = 340;
const COL_REQUEST = 660;
const COL_CONTRACT = 1000;
const NODE_H = 64;
const REQUEST_H = 76;
const GAP = 14;
const TOP_PAD = 40;

function stack<T>(items: T[], x: number, w: number, h: number): { item: T; x: number; y: number; w: number }[] {
  return items.map((item, i) => ({ item, x, y: TOP_PAD + i * (h + GAP), w }));
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function buildGraph(
  employees: Employee[],
  devices: AgentToken[],
  pendingRequests: ScopeRequest[],
  contracts: Contract[]
): { nodes: OverviewNode[]; edges: GenericEdge[]; worldW: number; worldH: number } {
  const nodes: OverviewNode[] = [];
  const edges: GenericEdge[] = [];

  const employeeStack = stack(employees, COL_EMPLOYEE, 220, NODE_H);
  for (const { item: e, x, y, w } of employeeStack) {
    nodes.push({
      id: `employee:${e.id}`,
      x,
      y,
      width: w,
      kind: "employee",
      icon: PersonIcon,
      title: e.email,
      subtitle: e.role === "admin" ? "Admin" : "Employee",
      tone: "neutral",
      statusLabel: e.revoked_at ? "REVOKED" : undefined,
      employee: e,
    });
  }

  const deviceStack = stack(devices, COL_DEVICE, 220, NODE_H);
  for (const { item: d, x, y, w } of deviceStack) {
    nodes.push({
      id: `device:${d.id}`,
      x,
      y,
      width: w,
      kind: "device",
      icon: DesktopIcon,
      title: d.label,
      subtitle: d.agent_type,
      tone: "neutral",
      statusLabel: d.revoked_at ? "REVOKED" : undefined,
      device: d,
    });
    const owner = employees.find((e) => e.email === d.owner_email);
    if (owner) edges.push({ from: `employee:${owner.id}`, to: `device:${d.id}`, tone: "neutral", active: !d.revoked_at });
  }

  const requestStack = stack(pendingRequests, COL_REQUEST, 260, REQUEST_H);
  for (const { item: r, x, y, w } of requestStack) {
    nodes.push({
      id: `request:${r.id}`,
      x,
      y,
      width: w,
      kind: "request",
      icon: QuestionMarkCircledIcon,
      title: `${r.requested_action === "include" ? "Include" : "Exclude"} "${r.project_identifier}"`,
      subtitle: r.requested_by_email,
      tone: "review",
      statusLabel: "PENDING",
      request: r,
    });
    const requester = employees.find((e) => e.email === r.requested_by_email);
    if (requester) edges.push({ from: `employee:${requester.id}`, to: `request:${r.id}`, tone: "review", active: true });
  }

  const contractStack = stack(contracts, COL_CONTRACT, 260, NODE_H);
  for (const { item: c, x, y, w } of contractStack) {
    nodes.push({
      id: `contract:${c.id}`,
      x,
      y,
      width: w,
      kind: "contract",
      icon: FileTextIcon,
      title: c.name,
      subtitle: c.project_scope ? `Scoped to ${c.project_scope}` : "Org-wide",
      tone: "allow",
      contract: c,
    });
  }

  const tallest = Math.max(employeeStack.length * (NODE_H + GAP), deviceStack.length * (NODE_H + GAP), requestStack.length * (REQUEST_H + GAP), contractStack.length * (NODE_H + GAP), 200);

  return { nodes, edges, worldW: COL_CONTRACT + 300, worldH: tallest + TOP_PAD * 2 };
}

function NodeCard({ n, isSelected, onRemove }: { n: OverviewNode; isSelected: boolean; onRemove?: () => void }) {
  return (
    <div
      className={`group/node rounded-xl border bg-panel-raised shadow-[var(--shadow-md)] transition-colors duration-150 ${
        isSelected ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: TONE_COLOR[n.tone] + "22", color: TONE_COLOR[n.tone] }}
        >
          <n.icon className="size-[14px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-foreground">{n.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{n.subtitle}</p>
        </div>
        {n.statusLabel && (
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${TONE_BG[n.tone]}`}>
            {n.statusLabel}
          </span>
        )}
        {n.composed && onRemove && (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-md text-faint-foreground opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-foreground group-hover/node:opacity-100"
            aria-label="Remove from canvas"
          >
            <Cross2Icon className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function PaletteItem({ label, icon: Icon, onDragStartKind }: { label: string; icon: typeof PersonIcon; onDragStartKind: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", onDragStartKind);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-panel-raised px-2.5 py-2 shadow-[var(--shadow-sm)] transition-colors active:cursor-grabbing hover:border-border-hover"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="size-3.5" />
      </span>
      <span className="text-[12px] font-medium text-foreground">{label}</span>
    </div>
  );
}

function ColumnLabel({ text, x }: { text: string; x: number }) {
  return (
    <p className="absolute text-[10.5px] font-semibold tracking-wide text-faint-foreground uppercase" style={{ left: x, top: 10 }}>
      {text}
    </p>
  );
}

function RevokeFromCanvas({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Revoke access
      </Button>
      <RevokeDialog employee={employee} open={open} onOpenChange={setOpen} />
    </>
  );
}

function DenyFromCanvas({ request, onDone }: { request: ScopeRequest; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await resolveScopeRequestAction(request.id, false);
          if (!result.ok) {
            addToast({ title: "Couldn't deny", description: result.error, type: "error" });
            return;
          }
          onDone();
        })
      }
    >
      {pending ? "Denying…" : "Deny"}
    </Button>
  );
}

function ApproveFromCanvas({ request, contracts }: { request: ScopeRequest; contracts: SelectableContract[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Approve…
      </Button>
      <ApproveDialog request={request} contracts={contracts} open={open} onOpenChange={setOpen} onApproved={() => setOpen(false)} />
    </>
  );
}

export function OverviewCanvas({
  employees,
  devices,
  pendingRequests,
  contracts,
  decisions,
  inviteUrl,
}: {
  employees: Employee[];
  devices: AgentToken[];
  pendingRequests: ScopeRequest[];
  contracts: Contract[];
  decisions: Decision[];
  inviteUrl: string;
}) {
  const router = useRouter();
  const { nodes: liveNodes, edges, worldW, worldH } = useMemo(
    () => buildGraph(employees, devices, pendingRequests, contracts),
    [employees, devices, pendingRequests, contracts]
  );
  const controls = useCanvasControls(worldW, worldH);
  const [composedNodes, setComposedNodes] = useState<OverviewNode[]>([]);
  const nodes = useMemo(() => [...liveNodes, ...composedNodes], [liveNodes, composedNodes]);
  const selected = nodes.find((n) => n.id === controls.selectedId);
  const isEmpty = nodes.length === 0;

  function handleDrop(e: React.DragEvent) {
    const kind = e.dataTransfer.getData("text/plain");
    if (kind !== "invite") return;
    const rect = controls.containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - controls.transform.x) / controls.transform.scale;
    const worldY = (e.clientY - rect.top - controls.transform.y) / controls.transform.scale;
    const id = `invite:${Date.now()}`;
    setComposedNodes((prev) => [
      ...prev,
      {
        id,
        x: Math.max(0, worldX - 100),
        y: Math.max(0, worldY - 30),
        width: 220,
        kind: "invite",
        icon: PaperPlaneIcon,
        title: "Invite Employee",
        subtitle: "Not shared yet",
        tone: "neutral",
        composed: true,
      },
    ]);
    controls.setSelectedId(id);
  }

  function removeComposedNode(id: string) {
    setComposedNodes((prev) => prev.filter((n) => n.id !== id));
    if (controls.selectedId === id) controls.setSelectedId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border shadow-[var(--shadow-md)]">
      <div className="flex w-[176px] shrink-0 flex-col gap-2 border-r border-border bg-panel p-3">
        <p className="px-0.5 text-[10.5px] font-semibold tracking-wide text-faint-foreground uppercase">Drag onto canvas</p>
        {PALETTE_ITEMS.map((item) => (
          <PaletteItem key={item.kind} label={item.label} icon={item.icon} onDragStartKind={item.kind} />
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-white/[0.015] px-4 py-2.5">
          <span className="text-[13px] font-medium text-foreground">Command Center</span>
          <span className="text-[12px] text-muted-foreground">
            {employees.length} employees · {devices.filter((d) => !d.revoked_at).length} devices · {pendingRequests.length} pending ·{" "}
            {contracts.length} contracts
          </span>
        </div>

        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Nothing to show yet — drag &quot;Invite Employee&quot; onto the canvas to bring your first person in.
            </p>
          </div>
        ) : (
          <CanvasSurface
            worldW={worldW}
            worldH={worldH}
            nodes={nodes}
            edges={edges}
            controls={controls}
            resetKey={`${employees.length}-${devices.length}-${pendingRequests.length}-${contracts.length}`}
            onDrop={handleDrop}
            renderNode={(n, isSelected) => (
              <NodeCard n={n} isSelected={isSelected} onRemove={n.composed ? () => removeComposedNode(n.id) : undefined} />
            )}
            worldOverlay={
              <>
                <ColumnLabel text="Employees" x={COL_EMPLOYEE} />
                <ColumnLabel text="Devices" x={COL_DEVICE} />
                <ColumnLabel text="Pending requests" x={COL_REQUEST} />
                <ColumnLabel text="Intent contracts" x={COL_CONTRACT} />
              </>
            }
          />
        )}
      </div>

      <div className="w-[340px] shrink-0 overflow-y-auto border-l border-border bg-panel p-4">
        {!selected && (
          <>
            <p className="text-[11px] font-medium tracking-wide text-faint-foreground uppercase">Recent decisions</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Click anything on the canvas to act on it. Nothing selected — here&apos;s what just happened.</p>
            <div className="mt-4 space-y-1">
              {decisions.length === 0 && <p className="text-[12px] text-muted-foreground">No decisions logged yet.</p>}
              {decisions.slice(0, 20).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => router.push(`/canvas?decision=${d.id}`)}
                  className="block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2">
                    <VerdictBadge verdict={d.decision} />
                    <span className="ml-auto shrink-0 text-[10.5px] text-faint-foreground">{timeAgo(d.created_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-foreground">{d.reason}</p>
                  {d.employee_email && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{d.employee_email}</p>}
                </button>
              ))}
            </div>
          </>
        )}

        {selected && (
          <button
            type="button"
            onClick={() => controls.setSelectedId(null)}
            className="mb-3 flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" /> Back to recent decisions
          </button>
        )}

        {selected?.kind === "employee" && selected.employee && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-black/70"
                style={{ background: colorFor(selected.employee.email) }}
              >
                {initialsFromEmail(selected.employee.email)}
              </span>
              <p className="truncate text-[14px] font-semibold text-foreground">{selected.employee.email}</p>
            </div>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <Field label="Role" value={selected.employee.role} />
              <Field label="Connected devices" value={String(selected.employee.connected_devices)} />
              <Field label="Joined" value={formatDate(selected.employee.created_at)} />
              <Field label="Last activity" value={selected.employee.last_activity_at ? formatDate(selected.employee.last_activity_at) : "No activity yet"} />
            </div>
            {selected.employee.role !== "admin" && (
              <div className="mt-4 border-t border-border pt-4">
                {selected.employee.revoked_at ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_BG.block}`}>
                    <span className="size-1.5 rounded-full" style={{ background: TONE_COLOR.block }} />
                    Access revoked
                  </span>
                ) : (
                  <RevokeFromCanvas employee={selected.employee} />
                )}
              </div>
            )}
          </>
        )}

        {selected?.kind === "device" && selected.device && (
          <>
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-muted-foreground">
                <DesktopIcon className="size-3.5" />
              </span>
              <p className="truncate text-[14px] font-semibold text-foreground">{selected.device.label}</p>
            </div>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <Field label="Agent type" value={selected.device.agent_type} />
              <Field label="Owner" value={selected.device.owner_email ?? "—"} />
              <Field label="Connected" value={formatDate(selected.device.created_at)} />
              <Field label="Status" value={selected.device.revoked_at ? "Revoked" : "Active"} />
            </div>
          </>
        )}

        {selected?.kind === "request" && selected.request && (
          <>
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--status-review-bg)] text-[var(--status-review)]">
                <QuestionMarkCircledIcon className="size-3.5" />
              </span>
              <p className="truncate text-[14px] font-semibold text-foreground">
                {selected.request.requested_action === "include" ? "Include" : "Exclude"} request
              </p>
            </div>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <Field label="Requested by" value={selected.request.requested_by_email} />
              <Field label="Device" value={selected.request.device_label ?? "Unknown device"} />
              <Field label="Project / folder" value={selected.request.project_identifier} />
              <Field label="Requested" value={formatDate(selected.request.created_at)} />
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <DenyFromCanvas request={selected.request} onDone={() => {}} />
              <ApproveFromCanvas request={selected.request} contracts={contracts} />
            </div>
          </>
        )}

        {selected?.kind === "contract" && selected.contract && (
          <>
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--status-allow-bg)] text-[var(--status-allow)]">
                <FileTextIcon className="size-3.5" />
              </span>
              <p className="truncate text-[14px] font-semibold text-foreground">{selected.contract.name}</p>
            </div>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <Field label="Scope" value={selected.contract.project_scope ?? "Org-wide"} />
              <Field label="Status" value={selected.contract.status} />
              <Field label="Intent" value={selected.contract.natural_language} />
              <Field
                label="Rules"
                value={`${selected.contract.allow_count} allow · ${selected.contract.review_count} review · ${selected.contract.block_count} block`}
              />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Link
                href={`/policies/${selected.contract.id}`}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
              >
                View full rules <ExternalLinkIcon className="size-3" />
              </Link>
            </div>
          </>
        )}

        {selected?.kind === "invite" && (
          <>
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                <PaperPlaneIcon className="size-3.5" />
              </span>
              <p className="text-[14px] font-semibold text-foreground">Invite Employee</p>
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Share this link with anyone at your company. Each person signs in with their own work email — the link itself doesn&apos;t
              grant access to anyone.
            </p>
            <InviteLinkForCanvas inviteUrl={inviteUrl} />
          </>
        )}
      </div>
    </div>
  );
}

function InviteLinkForCanvas({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-[10.5px] font-medium tracking-wide text-faint-foreground uppercase">Invite link</p>
        <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2">
          <code className="flex-1 overflow-x-auto text-[11.5px] whitespace-nowrap text-foreground">{inviteUrl}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(inviteUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
            aria-label="Copy invite link"
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </button>
        </div>
      </div>

      {regenOpen ? (
        <div className="space-y-2 rounded-md border border-border bg-background p-2.5">
          <p className="text-[11.5px] text-muted-foreground">Regenerate? The old link stops working immediately.</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRegenOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await regenerateInviteAction();
                  if (!result.ok) {
                    addToast({ title: "Couldn't regenerate link", description: result.error, type: "error" });
                    return;
                  }
                  setRegenOpen(false);
                  addToast({ title: "Invite link regenerated", description: "The old link no longer works.", type: "success" });
                })
              }
            >
              {pending ? "Regenerating…" : "Confirm"}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
          <ReloadIcon /> Regenerate link
        </Button>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-medium tracking-wide text-faint-foreground uppercase">{label}</p>
      <p className="mt-1 text-[12.5px] text-foreground">{value}</p>
    </div>
  );
}
