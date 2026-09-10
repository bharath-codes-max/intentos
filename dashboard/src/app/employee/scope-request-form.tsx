"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { requestScopeChangeAction } from "./actions";

const EXAMPLES = [
  { label: "Folder name", value: "my-project", color: "#7FC6EC" },
  { label: "Full local path fragment", value: "Users/yourname/code/my-project", color: "#B39CE8" },
  { label: "Git repo identity", value: "github.com/your-org/my-project", color: "#A9D66B" },
];

export function ScopeRequestForm() {
  const [project, setProject] = useState("");
  const [action, setAction] = useState<"include" | "exclude">("include");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (sent) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Request sent — your admin needs to approve it before it takes effect.
      </p>
    );
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="text-[12px] font-medium text-foreground">Request a project be included or excluded</div>
      <p className="text-[11px] text-muted-foreground">
        Ask your admin to specifically govern (or ignore) one project/repo on this device.
        Nothing changes until they approve it. This must match text that actually appears in
        the project&apos;s real folder path or git remote — it&apos;s matched literally, not guessed.
      </p>
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-foreground">What to type — examples:</span>
        {EXAMPLES.map((ex) => (
          <div
            key={ex.value}
            className="flex items-center gap-2.5 rounded-md border-l-2 bg-[color-mix(in_oklch,var(--panel-raised),transparent_0%)] py-1.5 pr-2.5 pl-2.5"
            style={{ borderLeftColor: ex.color, backgroundColor: `color-mix(in oklch, ${ex.color}, transparent 92%)` }}
          >
            <span className="w-32 shrink-0 text-[11px] font-medium" style={{ color: ex.color }}>
              {ex.label}
            </span>
            <code className="truncate font-mono text-[11px] text-foreground">{ex.value}</code>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g. my-project or github.com/org/repo"
          className="flex-1"
        />
        <Select value={action} onValueChange={(v) => setAction(v as "include" | "exclude")}>
          <SelectTrigger size="sm">
            <SelectValue>{action === "include" ? "Include" : "Exclude"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="include">Include</SelectItem>
            <SelectItem value="exclude">Exclude</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="sm" disabled={pending || !project.trim()} onClick={() => setConfirmOpen(true)}>
          {pending ? "Sending…" : "Request"}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Double-check before sending</DialogTitle>
            <DialogDescription>
              This text must match your real project&apos;s folder name or git remote exactly —
              a typo means the request won&apos;t apply to anything, so verify it now.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/20 p-3 text-[13px]">
            <div className="text-muted-foreground">
              You&apos;re asking to <span className="font-medium text-foreground">{action}</span> actions in:
            </div>
            <div className="mt-1 font-mono text-foreground">{project}</div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Let me fix it
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                start(async () => {
                  await requestScopeChangeAction(project.trim(), action);
                  setSent(true);
                });
              }}
            >
              Yes, send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
