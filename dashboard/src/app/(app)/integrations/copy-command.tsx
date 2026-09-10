"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-foreground">{command}</code>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => {
          navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  );
}
