"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.8;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Pan/zoom/drag for a node canvas. Two things here fix real bugs found in the first version:
 *
 * 1. Zoom uses a native `wheel` listener added with `{ passive: false }`, not React's `onWheel`.
 *    React attaches wheel handlers passively for scroll performance, which means
 *    `e.preventDefault()` inside a React `onWheel` prop can silently fail to stop the browser's
 *    own page/trackpad-pinch zoom — so pinching zoomed the whole page instead of the canvas.
 *    A manually-attached non-passive listener is the only reliable way to own that gesture.
 * 2. `fitToView` runs in a rAF loop until the container reports a real, non-zero size, instead
 *    of once on mount — `getBoundingClientRect()` can read 0 on the very first paint before
 *    layout settles, which produced an off-center, not-actually-fit initial view.
 */
export function useCanvasControls(worldW: number, worldH: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 });

  const fitToView = useCallback(() => {
    let attempts = 0;
    function attempt() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width < 2 || rect.height < 2) {
        if (attempts++ < 30) requestAnimationFrame(attempt);
        return;
      }
      const scale = clamp(Math.min(rect.width / worldW, rect.height / worldH) * 0.92, MIN_SCALE, 1);
      setTransform({ x: (rect.width - worldW * scale) / 2, y: (rect.height - worldH * scale) / 2, scale });
    }
    attempt();
  }, [worldW, worldH]);

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

  // Native, non-passive wheel listener — see the note above on why React's onWheel can't do this.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.012));
      } else {
        setTransform((t) => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Cmd+=/Cmd+-/Cmd+0 zoom the canvas instead of the browser page, while it has focus.
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

  const pan = useRef<{ startClientX: number; startClientY: number; startX: number; startY: number; moved: boolean } | null>(null);
  const nodeDrag = useRef<{ id: string; startClientX: number; startClientY: number; moved: boolean } | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function onBackgroundMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-canvas-node]")) return;
    pan.current = { startClientX: e.clientX, startClientY: e.clientY, startX: transform.x, startY: transform.y, moved: false };
  }

  function onNodeMouseDown(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    nodeDrag.current = { id, startClientX: e.clientX, startClientY: e.clientY, moved: false };
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (pan.current) {
        const p = pan.current;
        if (Math.abs(e.clientX - p.startClientX) > 3 || Math.abs(e.clientY - p.startClientY) > 3) p.moved = true;
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
      else if (pan.current && !pan.current.moved) setSelectedId(null);
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

  return {
    containerRef,
    transform,
    fitToView,
    zoomAt,
    dragOffsets,
    resetDragOffsets: () => setDragOffsets({}),
    selectedId,
    setSelectedId,
    onBackgroundMouseDown,
    onNodeMouseDown,
  };
}
