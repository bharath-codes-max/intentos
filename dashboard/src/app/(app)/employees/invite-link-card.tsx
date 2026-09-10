"use client";

import { useState, useTransition } from "react";
import { CopyIcon, CheckIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { regenerateInviteAction } from "./actions";

function RegenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [pending, start] = useTransition();

  function handleRegenerate() {
    start(async () => {
      const result = await regenerateInviteAction();
      if (!result.ok) {
        addToast({ title: "Couldn't regenerate link", description: result.error, type: "error" });
        return;
      }
      onOpenChange(false);
      addToast({ title: "Invite link regenerated", description: "The old link no longer works.", type: "success" });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate the invite link?</DialogTitle>
          <DialogDescription>The old link will stop working immediately — anyone using it will need the new one.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleRegenerate} disabled={pending}>
            {pending ? "Regenerating…" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InviteLinkCard({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[13px] font-medium text-foreground">Invite employees</div>
        <p className="text-[13px] text-muted-foreground">
          Share this link with anyone at your company. Each person signs in with their own work
          email — the link itself doesn&apos;t grant access to anyone.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-foreground">{inviteUrl}</code>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setRegenOpen(true)}>
          <ReloadIcon /> Regenerate
        </Button>
        <RegenerateDialog open={regenOpen} onOpenChange={setRegenOpen} />
      </div>
    </div>
  );
}
