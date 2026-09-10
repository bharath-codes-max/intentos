"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestScopeChangeAction } from "./actions";

export function ScopeRequestForm() {
  const [project, setProject] = useState("");
  const [action, setAction] = useState<"include" | "exclude">("include");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

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
        Nothing changes until they approve it.
      </p>
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
        <Button
          type="button"
          size="sm"
          disabled={pending || !project.trim()}
          onClick={() =>
            start(async () => {
              await requestScopeChangeAction(project.trim(), action);
              setSent(true);
            })
          }
        >
          {pending ? "Sending…" : "Request"}
        </Button>
      </div>
    </div>
  );
}
