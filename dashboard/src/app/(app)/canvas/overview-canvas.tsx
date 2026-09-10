"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaperPlaneIcon, CopyIcon, CheckIcon, ReloadIcon, Cross2Icon, ArrowLeftIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import type { Decision } from "@/lib/api";
import { useCanvasControls } from "./use-canvas-controls";
import { CanvasSurface, TONE_COLOR, type GenericNode, type GenericEdge } from "./canvas-shell";
import { regenerateInviteAction } from "../employees/actions";
import { addToast } from "@/components/ui/toast";

type NodeKind = "invite";

interface OverviewNode extends GenericNode {
  kind: NodeKind;
  icon: typeof PaperPlaneIcon;
  title: string;
  subtitle: string;
  /** Purely local tracking of who an invite node was meant for. Nothing is actually emailed;
   *  this just labels the node so it reads as "invited: x@y.com" instead of a bare box. Not
   *  persisted server-side. */
  inviteTarget?: string | null;
}

const PALETTE_ITEMS = [{ kind: "invite" as const, label: "Invite Employee", icon: PaperPlaneIcon }];

const WORLD_W = 1600;
const WORLD_H = 900;

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Darker-gray "matte" background for any editable field sitting on a pure-black card — the
 *  contrast is what makes it read as an input rather than more label text. */
const CARD_INPUT_CLASS =
  "w-full rounded-md border border-white/[0.08] bg-[#1c1c1f] px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-faint-foreground outline-none focus:border-white/20";

function InviteNodeBody({ node, onTrack }: { node: OverviewNode; onTrack: (email: string) => void }) {
  const [email, setEmail] = useState("");
  if (node.inviteTarget) {
    return (
      <div className="border-t border-white/[0.06] px-3.5 py-3">
        <p className="text-[9.5px] font-medium tracking-wide text-faint-foreground uppercase">Invited</p>
        <p className="mt-1 truncate text-[12.5px] text-foreground">{node.inviteTarget}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Not yet joined — copy the link in the panel and send it yourself.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 border-t border-white/[0.06] px-3.5 py-3" onMouseDown={(e) => e.stopPropagation()}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={CARD_INPUT_CLASS} />
      <Button type="button" size="sm" className="w-full" disabled={!email.trim()} onClick={() => onTrack(email.trim())}>
        Mark as invited
      </Button>
    </div>
  );
}

function NodeCard({
  n,
  isSelected,
  onRemove,
  onTrackInvite,
}: {
  n: OverviewNode;
  isSelected: boolean;
  onRemove: () => void;
  onTrackInvite: (email: string) => void;
}) {
  return (
    <div
      className={`group/node overflow-hidden rounded-xl border bg-black shadow-[var(--shadow-md)] transition-colors duration-150 ${
        isSelected ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md" style={{ background: TONE_COLOR.neutral + "22", color: TONE_COLOR.neutral }}>
          <n.icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{n.title}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">{n.subtitle}</p>
        </div>
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
      </div>
      <InviteNodeBody node={n} onTrack={onTrackInvite} />
    </div>
  );
}

function PaletteItem({ label, icon: Icon, onDragStartKind }: { label: string; icon: typeof PaperPlaneIcon; onDragStartKind: string }) {
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

export function OverviewCanvas({ decisions, inviteUrl }: { decisions: Decision[]; inviteUrl: string }) {
  const router = useRouter();
  const controls = useCanvasControls(WORLD_W, WORLD_H);
  const [nodes, setNodes] = useState<OverviewNode[]>([]);
  const edges: GenericEdge[] = [];
  const selected = nodes.find((n) => n.id === controls.selectedId);

  function handleDrop(e: React.DragEvent) {
    const kind = e.dataTransfer.getData("text/plain");
    if (kind !== "invite") return;
    const rect = controls.containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - controls.transform.x) / controls.transform.scale;
    const worldY = (e.clientY - rect.top - controls.transform.y) / controls.transform.scale;
    const id = `invite:${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        x: Math.max(0, worldX - 120),
        y: Math.max(0, worldY - 30),
        width: 260,
        kind: "invite",
        icon: PaperPlaneIcon,
        title: "Invite Employee",
        subtitle: "Not shared yet",
        inviteTarget: null,
      },
    ]);
    controls.setSelectedId(id);
  }

  function removeNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (controls.selectedId === id) controls.setSelectedId(null);
  }

  function trackInvite(id: string, email: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, inviteTarget: email } : n)));
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
        </div>

        {nodes.length === 0 ? (
          <div
            className="flex flex-1 items-center justify-center p-6 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Empty canvas — drag &quot;Invite Employee&quot; from the left onto here to get started.
            </p>
          </div>
        ) : (
          <CanvasSurface
            worldW={WORLD_W}
            worldH={WORLD_H}
            nodes={nodes}
            edges={edges}
            controls={controls}
            resetKey="blank"
            onDrop={handleDrop}
            renderNode={(n, isSelected) => (
              <NodeCard n={n} isSelected={isSelected} onRemove={() => removeNode(n.id)} onTrackInvite={(email) => trackInvite(n.id, email)} />
            )}
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
          <>
            <button
              type="button"
              onClick={() => controls.setSelectedId(null)}
              className="mb-3 flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3" /> Back to recent decisions
            </button>
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
