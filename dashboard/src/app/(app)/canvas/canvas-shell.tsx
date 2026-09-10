"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MinusIcon, PlusIcon, HomeIcon } from "@radix-ui/react-icons";
import type { useCanvasControls } from "./use-canvas-controls";

export type Tone = "neutral" | "allow" | "review" | "block";

export const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--border-hover)",
  allow: "var(--status-allow)",
  review: "var(--status-review)",
  block: "var(--status-block)",
};

export const TONE_BG: Record<Tone, string> = {
  neutral: "bg-white/[0.05] text-muted-foreground border-white/[0.1]",
  allow: "bg-[var(--status-allow-bg)] text-[var(--status-allow)] border-[color-mix(in_oklch,var(--status-allow),transparent_60%)]",
  review: "bg-[var(--status-review-bg)] text-[var(--status-review)] border-[color-mix(in_oklch,var(--status-review),transparent_60%)]",
  block: "bg-[var(--status-block-bg)] text-[var(--status-block)] border-[color-mix(in_oklch,var(--status-block),transparent_60%)]",
};

export interface GenericNode {
  id: string;
  x: number;
  y: number;
  width: number;
}

export interface GenericEdge {
  from: string;
  to: string;
  tone: Tone;
  active: boolean;
}

function anchorPoint(node: GenericNode, size: { width: number; height: number } | undefined, side: "in" | "out") {
  const h = size?.height ?? 120;
  const w = size?.width ?? node.width;
  return { x: node.x + (side === "out" ? w : 0), y: node.y + h / 2 };
}

function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const curve = Math.max(60, (to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
}

/** The interactive surface every canvas view is built on: pan, zoom, per-node drag, click to
 *  select, animated edges between real measured node boxes. Node visuals are fully supplied by
 *  the caller via `renderNode` — this component owns only the mechanics, so the overview map and
 *  the single-decision flow view can look completely different while sharing one, correctly
 *  fixed, interaction engine. */
export function CanvasSurface<T extends GenericNode>({
  worldW,
  worldH,
  nodes,
  edges,
  controls,
  renderNode,
  resetKey,
  worldOverlay,
  onDrop,
}: {
  worldW: number;
  worldH: number;
  nodes: T[];
  edges: GenericEdge[];
  controls: ReturnType<typeof useCanvasControls>;
  renderNode: (node: T, isSelected: boolean) => ReactNode;
  /** Change this when the node set fundamentally changes (e.g. switching decisions) to
   *  re-measure sizes, clear drag offsets, and re-fit the view. */
  resetKey: string;
  /** Extra content rendered inside the same pannable/zoomable world as the nodes — e.g. column
   *  labels — so it stays aligned with them under pan and zoom instead of drifting. */
  worldOverlay?: ReactNode;
  /** Drop target for palette drag-and-drop — receives the raw DragEvent so the caller can read
   *  dataTransfer and convert clientX/clientY to world coordinates itself (it already has the
   *  transform via `controls`). */
  onDrop?: (e: React.DragEvent) => void;
}) {
  const { containerRef, transform, fitToView, zoomAt, dragOffsets, resetDragOffsets, selectedId, setSelectedId, onBackgroundMouseDown, onNodeMouseDown } =
    controls;
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});

  useLayoutEffect(() => {
    const next: Record<string, { width: number; height: number }> = {};
    for (const n of nodes) {
      const el = nodeRefs.current[n.id];
      if (el) next[n.id] = { width: el.offsetWidth, height: el.offsetHeight };
    }
    setSizes(next);
    resetDragOffsets();
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const positioned = nodes.map((n) => {
    const off = dragOffsets[n.id];
    return off ? { ...n, x: n.x + off.dx, y: n.y + off.dy } : n;
  });

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseDown={onBackgroundMouseDown}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={onDrop}
      className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:22px_22px] outline-none active:cursor-grabbing"
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: worldW,
          height: worldH,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {worldOverlay}
        <svg className="pointer-events-none absolute inset-0" width={worldW} height={worldH}>
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
            className="absolute cursor-grab active:cursor-grabbing"
          >
            {renderNode(n, selectedId === n.id)}
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
  );
}
