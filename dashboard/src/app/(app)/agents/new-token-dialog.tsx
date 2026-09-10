"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTokenAction } from "./actions";

const AGENT_TYPES = [
  { value: "claude-code", label: "Claude Code" },
  { value: "cursor", label: "Cursor" },
  { value: "github-copilot", label: "GitHub Copilot" },
  { value: "codex", label: "Codex (OpenAI CLI)" },
  { value: "openai-agents-sdk", label: "OpenAI Agents SDK" },
  { value: "custom", label: "Custom agent" },
];

export function NewTokenDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [agentType, setAgentType] = useState(AGENT_TYPES[0].value);
  const [label, setLabel] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  function reset() {
    setAgentType(AGENT_TYPES[0].value);
    setLabel("");
    setIssuedToken(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Register agent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a new agent</DialogTitle>
        </DialogHeader>

        {issuedToken ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy this token now — it will not be shown again. Put it wherever that agent&apos;s hook config expects
              a bearer token.
            </p>
            <pre className="overflow-x-auto rounded-md border bg-secondary/40 p-3 text-xs">{issuedToken}</pre>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Agent type</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger className="w-full">
                  <SelectValue>{AGENT_TYPES.find((t) => t.value === agentType)?.label ?? agentType}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Finzo engineering — Claude Code"
              />
            </div>
            <DialogFooter>
              <Button
                disabled={pending || !label.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createTokenAction(agentType, label);
                    setIssuedToken(result.token);
                  })
                }
              >
                {pending ? "Creating…" : "Create token"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
