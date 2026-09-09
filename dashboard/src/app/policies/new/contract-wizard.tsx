"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompiledRule, CompileResult, Condition } from "@/lib/api";
import { compileIntentAction, activateContractAction } from "./actions";
import { CheckCircledIcon, ClockIcon, CrossCircledIcon, TrashIcon, CodeIcon } from "@radix-ui/react-icons";

const EXAMPLE =
  "Allow Codex to read and modify source code and run tests.\n" +
  "Never allow access to environment files, credentials, or production secrets.\n" +
  "Deleting files, pushing directly to main, deploying to production,\n" +
  "or destructive database operations require human approval.\n" +
  "Log every attempted action.";

const TEMPLATES = [
  { label: "Software engineering", text: EXAMPLE },
  {
    label: "Healthcare claims",
    text: "Allow Claims Agent to read eligibility, claim status, provider information, and approved claims data. It may automatically process claims below $1,000 when confidence is above 95%. Claims between $1,000 and $10,000 require human approval. Claims above $10,000 must not be automatically approved or denied. Modifying medical records, changing payment details, or exporting member data is blocked.",
  },
  {
    label: "Finance",
    text: "Allow Finance Agent to read approved financial reports and prepare analysis. Creating transactions above $1,000 requires human approval. Changing bank details, initiating unapproved transfers, accessing credentials, or exporting confidential financial data is blocked.",
  },
  {
    label: "Procurement",
    text: "Allow Procurement Agent to create purchase orders below $5,000 for approved vendors. Orders between $5,000 and $25,000 require manager approval. Orders above $25,000 are blocked. New vendors require approval. Payments to bank accounts different from the verified vendor account are blocked.",
  },
];

function conditionText(condition: Condition | Condition[] | null): string {
  if (!condition) return "No specific trigger — informational only";
  const clauses = Array.isArray(condition) ? condition : [condition];
  const opLabel: Record<string, string> = {
    contains: "contains",
    not_contains: "doesn't contain",
    equals: "is",
    lt: "<",
    lte: "≤",
    gt: ">",
    gte: "≥",
  };
  return clauses.map((c) => `${c.field.replace("tool_input.", "")} ${opLabel[c.op] ?? c.op} ${c.value}`).join(" and ");
}

const EFFECT_META = {
  ALLOW: {
    label: "ALLOWED",
    color: "text-status-allow",
    bg: "bg-[var(--status-allow-bg)] border-[color-mix(in_oklch,var(--status-allow),transparent_65%)]",
    icon: CheckCircledIcon,
  },
  REVIEW: {
    label: "HUMAN REVIEW",
    color: "text-status-review",
    bg: "bg-[var(--status-review-bg)] border-[color-mix(in_oklch,var(--status-review),transparent_65%)]",
    icon: ClockIcon,
  },
  BLOCK: {
    label: "BLOCKED",
    color: "text-status-block",
    bg: "bg-[var(--status-block-bg)] border-[color-mix(in_oklch,var(--status-block),transparent_65%)]",
    icon: CrossCircledIcon,
  },
} as const;

export function ContractWizard({ agents }: { agents: { id: string; label: string; agent_type: string }[] }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [text, setText] = useState("");
  const [compiling, startCompiling] = useTransition();
  const [activating, startActivating] = useTransition();
  const [result, setResult] = useState<CompileResult | null>(null);
  const [rules, setRules] = useState<CompiledRule[]>([]);
  const [contractName, setContractName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const selectedAgent = agents.find((a) => a.id === agentId);

  function handleCompile() {
    if (!text.trim()) {
      setError("Describe the intent first.");
      return;
    }
    setError(null);
    startCompiling(async () => {
      try {
        const r = await compileIntentAction(text, selectedAgent?.agent_type);
        setResult(r);
        setRules(r.rules);
        setContractName(text.trim().split(/[.\n]/)[0].slice(0, 60));
        setStep(2);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Compile failed");
      }
    });
  }

  function updateRule(id: string, patch: Partial<CompiledRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function handleActivate() {
    if (!contractName.trim()) {
      setError("Give this contract a name first.");
      return;
    }
    setError(null);
    startActivating(() => activateContractAction({
      name: contractName.trim(),
      natural_language: text,
      agent_token_id: agentId || undefined,
      rules,
    }));
  }

  if (step === 1) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-1.5">
            <Label>Agent</Label>
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No agents registered yet — register one on the Agents page first, or leave this
                contract unassigned for now.
              </p>
            ) : (
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue>{selectedAgent?.label ?? "Select agent"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="intent">Intent</Label>
              <div className="flex gap-1.5">
                {TEMPLATES.map((t) => (
                  <Button key={t.label} variant="ghost" size="sm" onClick={() => setText(t.text)}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              id="intent"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              rows={9}
            />
          </div>

          {error && <p className="text-[13px] text-status-block">{error}</p>}

          <Button onClick={handleCompile} disabled={compiling} size="lg">
            {compiling ? "Compiling…" : "Compile policy"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const grouped = {
    ALLOW: rules.filter((r) => r.effect === "ALLOW"),
    REVIEW: rules.filter((r) => r.effect === "REVIEW"),
    BLOCK: rules.filter((r) => r.effect === "BLOCK"),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Review compiled policy
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{result?.summary}</p>
              {result?.note && <p className="mt-1 text-[12px] text-status-review">{result.note}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowRaw((v) => !v)} className="gap-1.5">
              <CodeIcon className="size-3.5" /> {showRaw ? "Hide" : "View"} raw JSON
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contract_name">Contract name</Label>
            <Input id="contract_name" value={contractName} onChange={(e) => setContractName(e.target.value)} />
          </div>
          {showRaw && (
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-black/30 p-3 font-mono text-[12px] text-muted-foreground">
              {JSON.stringify(rules, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {(["ALLOW", "REVIEW", "BLOCK"] as const).map((effect) => {
        const meta = EFFECT_META[effect];
        const items = grouped[effect];
        if (items.length === 0) return null;
        return (
          <Card key={effect} className={meta.bg}>
            <CardContent className="pt-6">
              <p className={`mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${meta.color}`}>
                <meta.icon className="size-3.5" /> {meta.label}
              </p>
              <div className="space-y-2">
                {items.map((rule) => (
                  <div key={rule.id} className="flex items-start gap-3 rounded-none border border-border bg-panel p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground">{rule.reason}</p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
                        {rule.resource}.{rule.resource_action} — {conditionText(rule.condition)}
                      </p>
                    </div>
                    <Select value={rule.effect} onValueChange={(v) => updateRule(rule.id, { effect: v as CompiledRule["effect"] })}>
                      <SelectTrigger className="w-32 shrink-0">
                        <SelectValue>{rule.effect}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALLOW">Allow</SelectItem>
                        <SelectItem value="REVIEW">Review</SelectItem>
                        <SelectItem value="BLOCK">Block</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeRule(rule.id)}>
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {error && <p className="text-[13px] text-status-block">{error}</p>}

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button onClick={handleActivate} disabled={activating || rules.length === 0} size="lg">
          {activating ? "Activating…" : "Activate Intent Contract"}
        </Button>
      </div>
    </div>
  );
}
