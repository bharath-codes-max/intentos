"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PersonIcon,
  LightningBoltIcon,
  FileTextIcon,
  MixIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  MinusIcon,
  PlusIcon,
  HomeIcon,
} from "@radix-ui/react-icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { colorFor, initialsFromEmail } from "@/lib/color-hash";
import type { Decision, DecisionFlow } from "@/lib/api";

type Tone = "neutral" | "allow" | "review" | "block";

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  icon: typeof PersonIcon;
  title: string;
  subtitle: string;
  fields: { label: string; value: string }[];
  tone: Tone;
  statusLabel?: string;
  dimmed: boolean;
  detail: string;
}

interface CanvasEdge {
  from: string;
  to: string;
  tone: Tone;
  active: boolean;
}

const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--border-hover)",
  allow: "var(--status-allow)",
  review: "var(--status-review)",
  block: "var(--status-block)",
};

const TONE_BG: Record<Tone, string> = {
  neutral: "bg-white/[0.05] text-muted-foreground border-white/[0.1]",
  allow: "bg-[var(--status-allow-bg)] text-[var(--status-allow)] border-[color-mix(in_oklch,var(--status-allow),transparent_60%)]",
  review: "bg-[var(--status-review-bg)] text-[var(--status-review)] border-[color-mix(in_oklch,var(--status-review),transparent_60%)]",
  block: "bg-[var(--status-block-bg)] text-[var(--status-block)] border-[color-mix(in_oklch,var(--status-block),transparent_60%)]",
};

const WORLD_W = 1860;
const WORLD_H = 720;
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.8;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

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

function buildGraph(flow: DecisionFlow): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
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

  const edges: CanvasEdge[] = [
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

function anchorPoint(node: CanvasNode, size: { width: number; height: number } | undefined, side: "in" | "out") {
  const h = size?.height ?? 120;
  const w = size?.width ?? node.width;
  return { x: node.x + (side === "out" ? w : 0), y: node.y + h / 2 };
}

function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const curve = Math.max(60, (to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
}

export function GovernanceCanvas({ flow, recentDecisions }: { flow: DecisionFlow; recentDecisions: Decision[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 0.85 });
  const [selectedId, setSelectedId] = useState<string>("contract");
  const [dragOffsets, setDragOffsets] = useState<Record<string, { dx: number; dy: number }>>({});

  const { nodes, edges } = useMemo(() => buildGraph(flow), [flow]);
  const events = useMemo(() => timeline(flow), [flow]);

  const positioned = useMemo(
    () =>
      nodes.map((n) => {
        const off = dragOffsets[n.id];
        return off ? { ...n, x: n.x + off.dx, y: n.y + off.dy } : n;
      }),
    [nodes, dragOffsets]
  );

  const selected = positioned.find((n) => n.id === selectedId) ?? positioned[0];

  // Measure real rendered node sizes so connector lines meet the actual box edges, not a guess.
  useLayoutEffect(() => {
    const next: Record<string, { width: number; height: number }> = {};
    for (const n of nodes) {
      const el = nodeRefs.current[n.id];
      if (el) next[n.id] = { width: el.offsetWidth, height: el.offsetHeight };
    }
    setSizes(next);
    setDragOffsets({});
    setSelectedId(nodes.some((n) => n.id === "contract") ? "contract" : nodes[0].id);
  }, [nodes]);

  const fitToView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = clamp(Math.min(rect.width / WORLD_W, rect.height / WORLD_H) * 0.94, MIN_SCALE, 1);
    setTransform({ x: (rect.width - WORLD_W * scale) / 2, y: (rect.height - WORLD_H * scale) / 2, scale });
  }, []);

  useEffect(() => {
    fitToView();
  }, [fitToView, flow.id]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTransform((t) => {
      const newScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      const wx = (cx - t.x) / t.scale;
      const wy = (cy - t.y) / t.scale;
      return { x: cx - wx * newScale, y: cy - wy * newScale, scale: newScale };
    });
  }, []);

  // Mac trackpad pinch arrives as a wheel event with ctrlKey set; plain two-finger scroll pans.
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.012));
      } else {
        setTransform((t) => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
      }
    },
    [zoomAt]
  );

  // Cmd+=/Cmd+-/Cmd+0 zoom the canvas instead of the browser page, while the canvas has focus.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      const el = containerRef.current;
      if (!el || !el.contains(document.activeElement)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.15);
      } else if (e.key === "-") {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / 1.15);
      } else if (e.key === "0") {
        e.preventDefault();
        fitToView();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomAt, fitToView]);

  const pan = useRef<{ startClientX: number; startClientY: number; startX: number; startY: number } | null>(null);
  const nodeDrag = useRef<{ id: string; startClientX: number; startClientY: number; moved: boolean } | null>(null);

  function onBackgroundMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-canvas-node]")) return;
    pan.current = { startClientX: e.clientX, startClientY: e.clientY, startX: transform.x, startY: transform.y };
  }

  function onNodeMouseDown(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    nodeDrag.current = { id, startClientX: e.clientX, startClientY: e.clientY, moved: false };
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (pan.current) {
        const p = pan.current;
        setTransform((t) => ({ ...t, x: p.startX + (e.clientX - p.startClientX), y: p.startY + (e.clientY - p.startClientY) }));
      } else if (nodeDrag.current) {
        const d = nodeDrag.current;
        const dx = (e.clientX - d.startClientX) / transform.scale;
        const dy = (e.clientY - d.startClientY) / transform.scale;
        if (Math.abs(e.clientX - d.startClientX) > 3 || Math.abs(e.clientY - d.startClientY) > 3) d.moved = true;
        setDragOffsets((prev) => ({ ...prev, [d.id]: { dx, dy } }));
      }
    }
    function onUp() {
      if (nodeDrag.current && !nodeDrag.current.moved) setSelectedId(nodeDrag.current.id);
      pan.current = null;
      nodeDrag.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [transform.scale]);

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-2 border-b border-border bg-white/[0.015] px-4 py-2.5">
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

        <div
          ref={containerRef}
          tabIndex={0}
          onWheel={onWheel}
          onMouseDown={onBackgroundMouseDown}
          className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:22px_22px] outline-none active:cursor-grabbing"
        >
          <div
            className="absolute top-0 left-0"
            style={{
              width: WORLD_W,
              height: WORLD_H,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <svg className="pointer-events-none absolute inset-0" width={WORLD_W} height={WORLD_H}>
              {edges.map((e) => {
                const from = positioned.find((n) => n.id === e.from);
                const to = positioned.find((n) => n.id === e.to);
                if (!from || !to) return null;
                const start = anchorPoint(from, sizes[from.id], "out");
                const end = anchorPoint(to, sizes[to.id], "in");
                return (
                  <path
                    key={`${e.from}-${e.to}`}
                    d={edgePath(start, end)}
                    fill="none"
                    stroke={e.active ? TONE_COLOR[e.tone] : "var(--border-hover)"}
                    strokeWidth={e.active ? 2.25 : 1.5}
                    strokeDasharray={e.active ? "7 6" : undefined}
                    className={e.active ? "animate-[flow-dash_0.7s_linear_infinite]" : ""}
                    opacity={e.active ? 1 : 0.5}
                  />
                );
              })}
            </svg>

            {positioned.map((n) => (
              <div
                key={n.id}
                ref={(el) => {
                  nodeRefs.current[n.id] = el;
                }}
                data-canvas-node
                onMouseDown={(e) => onNodeMouseDown(n.id, e)}
                style={{ left: n.x, top: n.y, width: n.width }}
                className={`absolute cursor-grab rounded-xl border bg-panel-raised shadow-[var(--shadow-md)] transition-[opacity,border-color] duration-150 active:cursor-grabbing ${
                  selectedId === n.id ? "border-primary" : "border-border"
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
            ))}
          </div>

          <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-border bg-panel-raised p-1 shadow-[var(--shadow-md)]">
            <button
              type="button"
              onClick={() => {
                const r = containerRef.current!.getBoundingClientRect();
                zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2);
              }}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              aria-label="Zoom out"
            >
              <MinusIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={fitToView}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              aria-label="Fit to view"
            >
              <HomeIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const r = containerRef.current!.getBoundingClientRect();
                zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2);
              }}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              aria-label="Zoom in"
            >
              <PlusIcon className="size-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] tabular-nums text-faint-foreground">{Math.round(transform.scale * 100)}%</span>
          </div>
        </div>
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
