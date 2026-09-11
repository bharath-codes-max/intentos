"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon, LockClosedIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyCommand } from "./copy-command";

type ScopeMode = "all" | "include_only" | "exclude";
type Entry = { project: string; action: "include" | "exclude" };

const EXAMPLES = [
  { label: "Folder name", value: "my-project", color: "#7FC6EC" },
  { label: "Full local path fragment", value: "Users/yourname/code/my-project", color: "#B39CE8" },
  { label: "Git repo identity", value: "github.com/your-org/my-project", color: "#A9D66B" },
];

/**
 * Mandatory scope step, gating the install command itself — this mirrors the same
 * include/exclude concept already used for employee-side scope requests, but resolved here
 * by the admin directly, at install time, since they're the one already approving it. The
 * chosen scope is baked into the generated command (INTENTOS_SCOPE_MODE / _PROJECTS env vars,
 * read by the connector and sent to /v1/devices/start) so the resulting token is correctly
 * scoped from its very first run — never "all" by default and fixed later.
 */
export function ScopeGate({ installUrl }: { installUrl: string }) {
  const [choice, setChoice] = useState<"everything" | "specific" | null>(null);
  const [mode, setMode] = useState<Exclude<ScopeMode, "all">>("include_only");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [draftAction, setDraftAction] = useState<"include" | "exclude">("include");
  const [confirmed, setConfirmed] = useState(false);

  function addEntry() {
    const value = draft.trim();
    if (!value) return;
    setEntries((prev) => [...prev, { project: value, action: draftAction }]);
    setDraft("");
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canConfirm = choice === "everything" || (choice === "specific" && entries.length > 0);

  // "curl | bash" doesn't propagate env vars set before it — the pipe starts an unrelated
  // subshell. "VAR=val bash -c "$(curl ...)"" runs bash directly, inheriting the env vars,
  // so a chosen scope actually reaches the connector script instead of silently being dropped.
  let finalCommand = `curl -fsSL ${installUrl} | bash`;
  if (confirmed && choice === "specific") {
    const projects = entries.map((e) => e.project).join(",");
    // All entries in one step share a single mode on purpose — mixing include and exclude
    // rules in one device link would be ambiguous about precedence, so the UI collapses
    // whatever the user picked as their dominant action into one scope_mode for this device.
    const dominantMode: Exclude<ScopeMode, "all"> = entries.every((e) => e.action === "exclude") ? "exclude" : "include_only";
    finalCommand = `INTENTOS_SCOPE_MODE=${dominantMode} INTENTOS_SCOPE_PROJECTS="${projects}" bash -c "$(curl -fsSL ${installUrl})"`;
  }

  if (confirmed) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            <CheckCircledIcon className="size-4 text-status-allow" />
            Scope confirmed — {choice === "everything" ? "governs everything on this device" : `${mode === "exclude" ? "excludes" : "includes only"} ${entries.length} project${entries.length === 1 ? "" : "s"}`}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmed(false)}>
            Change
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Run this on the machine you want governed. It installs the connector, opens your browser to approve the
          device, and applies the scope above automatically — no per-project setup.
        </p>
        <CopyCommand command={finalCommand} />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <LockClosedIcon className="size-4 text-muted-foreground" />
        Choose what this device governs before the install command unlocks
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("everything")}
          className={`rounded-lg border p-3 text-left text-[13px] transition-colors ${
            choice === "everything" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="font-medium">Govern everything</div>
          <div className="mt-0.5 text-[12px]">Every project on this device is governed. Simplest option.</div>
        </button>
        <button
          type="button"
          onClick={() => setChoice("specific")}
          className={`rounded-lg border p-3 text-left text-[13px] transition-colors ${
            choice === "specific" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="font-medium">Only specific folders</div>
          <div className="mt-0.5 text-[12px]">List projects to include or exclude by name/path/repo.</div>
        </button>
      </div>

      {choice === "specific" && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-foreground">What to type — examples:</span>
            {EXAMPLES.map((ex) => (
              <div
                key={ex.value}
                className="flex items-center gap-2.5 rounded-md border-l-2 py-1.5 pr-2.5 pl-2.5"
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. my-project or github.com/org/repo"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
            />
            <Select value={draftAction} onValueChange={(v) => setDraftAction(v as "include" | "exclude")}>
              <SelectTrigger size="sm">
                <SelectValue>{draftAction === "include" ? "Include" : "Exclude"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="include">Include</SelectItem>
                <SelectItem value="exclude">Exclude</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="outline" onClick={addEntry} disabled={!draft.trim()}>
              <PlusIcon className="size-3.5" /> Add
            </Button>
          </div>

          {entries.length > 0 && (
            <ul className="space-y-1.5">
              {entries.map((e, i) => (
                <li key={`${e.project}-${i}`} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-1.5">
                  <span className="font-mono text-[12.5px] text-foreground">
                    <span className={e.action === "include" ? "text-status-allow" : "text-status-block"}>
                      {e.action === "include" ? "Include" : "Exclude"}
                    </span>{" "}
                    {e.project}
                  </span>
                  <button type="button" onClick={() => removeEntry(i)} className="text-muted-foreground hover:text-foreground">
                    <TrashIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            if (choice === "specific") setMode(entries.every((e) => e.action === "exclude") ? "exclude" : "include_only");
            setConfirmed(true);
          }}
        >
          Next — unlock install command
        </Button>
      </div>
    </div>
  );
}
