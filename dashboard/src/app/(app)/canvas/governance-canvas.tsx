"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PersonIcon,
  LightningBoltIcon,
  FileTextIcon,
  MixIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from "@radix-ui/react-icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { colorFor, initialsFromEmail } from "@/lib/color-hash";
import type { Decision, DecisionFlow } from "@/lib/api";
import { useCanvasControls } from "./use-canvas-controls";
import { CanvasSurface, TONE_COLOR, TONE_BG, type Tone, type GenericNode, type GenericEdge } from "./canvas-shell";

interface CanvasNode extends GenericNode {
  icon: typeof PersonIcon;
  title: string;
  subtitle: string;
  fields: { label: string; value: string }[];
  tone: Tone;
  statusLabel?: string;
  dimmed: boolean;
  detail: string;
}

const WORLD_W = 1860;
const WORLD_H = 720;

function projectIdentity(project: DecisionFlow["project"]): string {
  if (!project) return "—";
  return project.normalized_repo || project.repo_root || project.cwd || "—";
}

function summarizeAction(toolName: string, toolInput: Record<string, unknown>): string {
  const path = (toolInput.file_path as string) || (toolInput.path as string);
  const command = toolInput.command as string;
  if (path) return `${toolName} — ${path}`;
  if (command) return `${toolName} — ${command.length > 54 ? command.slice(0, 54) + "…" : command}`;
  return toolName;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  // Fixed locale, not `undefined` — the server's runtime locale and the browser's can differ,
  // which renders different text on each side and trips a React hydration mismatch.
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function buildGraph(flow: DecisionFlow): { nodes: CanvasNode[]; edges: GenericEdge[] } {
  const verdictTone: Tone = flow.decision;
  const employeeName = flow.employee_email ?? flow.device_owner_email ?? "Unknown employee";
  const isReview = flow.decision === "review";

  const nodes: CanvasNode[] = [
    {
      id: "employee",
      x: 40,
      y: 300,
      width: 216,
      icon: PersonIcon,
      title: "Employee",
      subtitle: "Identity",
      fields: [
        { label: "Employee", value: employeeName },
        { label: "Device", value: flow.agent_label ?? "Unknown device" },
      ],
      tone: "neutral",
      dimmed: false,
      detail: "The person whose connected device triggered this action.",
    },
    {
      id: "agent",
      x: 336,
      y: 300,
      width: 216,
      icon: LightningBoltIcon,
      title: flow.agent_type ?? "AI Agent",
      subtitle: "AI Agent",
      fields: [
        { label: "Project", value: projectIdentity(flow.project) },
        { label: "Action", value: summarizeAction(flow.tool_name, flow.tool_input) },
      ],
      tone: "neutral",
      statusLabel: flow.tool_name,
      dimmed: false,
      detail: "The agent that requested this action, and what it was trying to do.",
    },
    flow.contract_id
      ? {
          id: "contract",
          x: 632,
          y: 300,
          width: 236,
          icon: FileTextIcon,
          title: flow.contract_name ?? "Intent Contract",
          subtitle: flow.contract_project_scope ? `Scoped to ${flow.contract_project_scope}` : "Org-wide policy",
          fields: [{ label: "Intent", value: flow.contract_intent ?? "—" }],
          tone: "neutral",
          statusLabel: flow.contract_status === "active" ? "Active" : (flow.contract_status ?? "draft"),
          dimmed: false,
          detail: "The Intent Contract whose rule produced this verdict.",
        }
      : {
          id: "contract",
          x: 632,
          y: 300,
          width: 236,
          icon: FileTextIcon,
          title: "No contract matched",
          subtitle: "Default behavior",
          fields: [{ label: "Result", value: flow.reason }],
          tone: "neutral",
          dimmed: true,
          detail: "No active Intent Contract's scope covered this action, so no contract-specific rule applied.",
        },
    {
      id: "evaluate",
      x: 940,
      y: 300,
      width: 216,
      icon: MixIcon,
      title: "Evaluate Action",
      subtitle: "Policy engine",
      fields: [
        { label: "Matched rule", value: flow.matched_rule ?? "No rule matched" },
        { label: "Reason", value: flow.reason },
      ],
      tone: "neutral",
      dimmed: false,
      detail: "Intentos checks the action against every active rule in priority order and returns the first match.",
    },
    {
      id: "outcome-allow",
      x: 1244,
      y: 108,
      width: 190,
      icon: CheckCircledIcon,
      title: "Allow",
      subtitle: "Execute immediately",
      fields: [],
      tone: "allow",
      statusLabel: "ALLOW",
      dimmed: flow.decision !== "allow",
      detail: "The action runs immediately, no human involved.",
    },
    {
      id: "outcome-review",
      x: 1244,
      y: 300,
      width: 190,
      icon: ExclamationTriangleIcon,
      title: "Review",
      subtitle: "Approval required",
      fields: [],
      tone: "review",
      statusLabel: "REVIEW",
      dimmed: flow.decision !== "review",
      detail: "The action is held until a human approves or denies it.",
    },
    {
      id: "outcome-block",
      x: 1244,
      y: 492,
      width: 190,
      icon: CrossCircledIcon,
      title: "Block",
      subtitle: "Prevent action",
      fields: [],
      tone: "block",
      statusLabel: "BLOCK",
      dimmed: flow.decision !== "block",
      detail: "The action is refused outright — it never runs.",
    },
  ];

  const edges: GenericEdge[] = [
    { from: "employee", to: "agent", tone: "neutral", active: true },
    { from: "agent", to: "contract", tone: "neutral", active: true },
    { from: "contract", to: "evaluate", tone: "neutral", active: true },
    { from: "evaluate", to: "outcome-allow", tone: "allow", active: flow.decision === "allow" },
    { from: "evaluate", to: "outcome-review", tone: "review", active: flow.decision === "review" },
    { from: "evaluate", to: "outcome-block", tone: "block", active: flow.decision === "block" },
  ];

  if (isReview) {
    const resolved = flow.approval_status && flow.approval_status !== "pending";
    const approved = flow.approval_status === "approved";
    nodes.push({
      id: "approval",
      x: 1548,
      y: 300,
      width: 236,
      icon: PersonIcon,
      title: resolved ? (approved ? "Approved" : "Denied") : "Awaiting approval",
      subtitle: flow.reviewer ?? "Pending review",
      fields: [
        {
          label: "Result",
          value: resolved
            ? approved
              ? "Action was allowed to proceed."
              : "Action stayed blocked."
            : "Waiting for a human to decide.",
        },
        { label: "Resolved", value: formatTime(flow.resolved_at) },
      ],
      tone: resolved ? (approved ? "allow" : "block") : "review",
      statusLabel: resolved ? (approved ? "EXECUTED" : "DENIED") : "PENDING",
      dimmed: false,
      detail: "The human decision on this held action, and what happened as a result.",
    });
    edges.push({ from: "outcome-review", to: "approval", tone: verdictTone, active: true });
  }

  return { nodes, edges };
}

function timeline(flow: DecisionFlow): { title: string; detail: string }[] {
  const events: { title: string; detail: string }[] = [
    { title: `${flow.agent_type ?? "Agent"} requested action`, detail: summarizeAction(flow.tool_name, flow.tool_input) },
    {
      title: "Intentos evaluated policy",
      detail: flow.matched_rule ? `Matched "${flow.matched_rule}"` : "No specific rule matched",
    },
  ];
  if (flow.decision === "allow") events.push({ title: "Allowed", detail: flow.reason });
  if (flow.decision === "block") events.push({ title: "Blocked", detail: flow.reason });
  if (flow.decision === "review") {
    events.push({ title: "Review required", detail: flow.reason });
    if (flow.approval_status && flow.approval_status !== "pending") {
      events.push({
        title: `${flow.reviewer ?? "Reviewer"} ${flow.approval_status}`,
        detail: flow.approval_status === "approved" ? "Action resumed" : "Action stayed blocked",
      });
    } else {
      events.push({ title: "Waiting for review", detail: "Not yet resolved" });
    }
  }
  const executed = flow.decision === "allow" || (flow.decision === "review" && flow.approval_status === "approved");
  const settled = flow.decision === "block" || flow.decision === "allow" || (flow.decision === "review" && flow.approval_status && flow.approval_status !== "pending");
  if (settled) events.push({ title: executed ? "Executed" : "Not executed", detail: "Logged in audit trail" });
  return events;
}

export function GovernanceCanvas({ flow, recentDecisions }: { flow: DecisionFlow; recentDecisions: Decision[] }) {
  const router = useRouter();
  const controls = useCanvasControls(WORLD_W, WORLD_H);
  const { nodes, edges } = useMemo(() => buildGraph(flow), [flow]);
  const events = useMemo(() => timeline(flow), [flow]);
  const selected = nodes.find((n) => n.id === controls.selectedId) ?? nodes.find((n) => n.id === "contract") ?? nodes[0];

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-2 border-b border-border bg-white/[0.015] px-4 py-2.5">
          <button
            type="button"
            onClick={() => router.push("/canvas")}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" /> Overview
          </button>
          <span className="h-4 w-px bg-border" />
          <span className="text-[12px] text-muted-foreground">Viewing decision</span>
          <Select value={flow.id} onValueChange={(v) => router.push(`/canvas?decision=${v}`)}>
            <SelectTrigger size="sm" className="max-w-sm">
              <SelectValue>
                <span className="truncate">{flow.reason}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {recentDecisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="truncate">
                    {d.decision.toUpperCase()} · {d.reason}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_BG[flow.decision]}`}
          >
            <span className="size-1.5 rounded-full" style={{ background: TONE_COLOR[flow.decision] }} />
            {flow.decision === "allow" ? "Allowed" : flow.decision === "block" ? "Blocked" : "Needs review"}
          </span>
        </div>

        <CanvasSurface
          worldW={WORLD_W}
          worldH={WORLD_H}
          nodes={nodes}
          edges={edges}
          controls={controls}
          resetKey={flow.id}
          renderNode={(n, isSelected) => (
            <div
              className={`rounded-xl border bg-panel-raised shadow-[var(--shadow-md)] transition-[opacity,border-color] duration-150 ${
                isSelected ? "border-primary" : "border-border"
              } ${n.dimmed ? "opacity-45" : "opacity-100"}`}
            >
              <div className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md"
                  style={{ background: TONE_COLOR[n.tone] + "22", color: TONE_COLOR[n.tone] }}
                >
                  <n.icon className="size-[15px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-foreground">{n.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{n.subtitle}</p>
                </div>
              </div>
              {(n.fields.length > 0 || n.statusLabel) && (
                <div className="space-y-2 px-3 py-2.5">
                  {n.fields.map((f) => (
                    <div key={f.label}>
                      <p className="text-[9.5px] font-medium tracking-wide text-faint-foreground uppercase">{f.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] text-foreground">{f.value}</p>
                    </div>
                  ))}
                  {n.statusLabel && (
                    <span
                      className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold tracking-wide uppercase ${TONE_BG[n.tone]}`}
                    >
                      {n.statusLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div className="w-[320px] shrink-0 overflow-y-auto rounded-lg border border-border bg-panel p-4 shadow-[var(--shadow-md)]">
        {selected && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-md"
                style={{ background: TONE_COLOR[selected.tone] + "22", color: TONE_COLOR[selected.tone] }}
              >
                <selected.icon className="size-[13px]" />
              </span>
              <p className="text-[14px] font-semibold text-foreground">{selected.title}</p>
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">{selected.detail}</p>

            {selected.fields.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {selected.fields.map((f) => (
                  <div key={f.label}>
                    <p className="text-[10.5px] font-medium tracking-wide text-faint-foreground uppercase">{f.label}</p>
                    <p className="mt-1 text-[12.5px] text-foreground">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-[11px] font-medium tracking-wide text-faint-foreground uppercase">Current execution</p>
          <div className="space-y-3.5">
            {events.map((ev, i) => (
              <div key={i} className="border-l-2 border-border pl-3">
                <p className="text-[12.5px] font-medium text-foreground">{ev.title}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{ev.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold text-black/70"
            style={{ background: colorFor(flow.employee_email ?? "?") }}
          >
            {flow.employee_email ? initialsFromEmail(flow.employee_email) : "?"}
          </span>
          <span className="truncate text-[11.5px] text-muted-foreground">{flow.employee_email ?? "Unknown employee"}</span>
          <span className="ml-auto shrink-0 text-[11px] text-faint-foreground">{formatTime(flow.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
