"use client";

import { useState, useTransition } from "react";
import { CopyIcon, CheckIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { regenerateInviteAction } from "./actions";

export function InviteLinkCard({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

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
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (confirm("Regenerate the invite link? The old link will stop working immediately.")) {
              start(() => regenerateInviteAction());
            }
          }}
        >
          <ReloadIcon /> {pending ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
    </div>
  );
}
