"use client";

import { useState } from "react";
import { CodeIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { VerdictBadge } from "@/components/verdict-badge";
import { ClaudeIcon } from "@/components/agent-icons";

type Step = {
  narration: string;
  tool: string;
  target: string;
  verdict: "allow" | "block" | "review";
  note: string;
};

const STEPS: Step[] = [
  {
    narration: "Claude Code reads a file to understand the task.",
    tool: "Read",
    target: "src/payments/charge.ts",
    verdict: "allow",
    note: "Safe — allowed instantly.",
  },
  {
    narration: "It tries to delete a protected config file.",
    tool: "Bash",
    target: "rm config/prod.env",
    verdict: "block",
    note: "Blocked automatically — never reaches your codebase.",
  },
  {
    narration: "It wants to touch production infrastructure.",
    tool: "Edit",
    target: "infra/terraform/main.tf",
    verdict: "review",
    note: "Paused — waiting on a human.",
  },
  {
    narration: "You approve it, once, from your dashboard.",
    tool: "Edit",
    target: "infra/terraform/main.tf",
    verdict: "allow",
    note: "Approved and logged — Claude continues automatically.",
  },
];

/** Right-hand showcase panel for the (auth) route group. Click-driven (no autoplay) walk
 *  through a short, realistic story — deliberately free of any implementation vocabulary
 *  (no hook names, no endpoint names, no internal terms). */
export function AuthShowcase() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const advance = () => setStep((s) => (s === STEPS.length - 1 ? 0 : s + 1));

  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-[radial-gradient(ellipse_120%_80%_at_20%_0%,color-mix(in_oklch,var(--primary),transparent_55%),var(--background)_60%)] lg:flex lg:flex-col lg:justify-center lg:p-16">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative max-w-md">
        <h2 className="text-[28px] leading-tight font-bold tracking-tight text-foreground">
          Every AI agent action, seen before it happens.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Intentos sits between your coding agents and your codebase — allowing what&apos;s safe,
          blocking what&apos;s not, and routing the rest to a human.
        </p>
      </div>

      <button
        type="button"
        onClick={advance}
        className="group relative mt-10 w-full max-w-md cursor-pointer rounded-xl border border-white/[0.08] bg-panel/90 p-4 text-left shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur transition-colors hover:border-white/[0.16]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-3">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {isLast ? "Resolved" : `Step ${step + 1} of ${STEPS.length}`}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] px-2.5 py-1 text-[11px] font-medium text-foreground">
            <ClaudeIcon size={12} /> Claude Code connected
          </span>
        </div>

        <p className="mb-3 text-[13px] leading-relaxed text-foreground">{current.narration}</p>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <CodeIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-[12px] text-foreground">{current.target}</span>
          </div>
          <VerdictBadge verdict={current.verdict} />
        </div>

        <p className="mt-3 text-[12px] text-muted-foreground">{current.note}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <span className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground group-hover:text-foreground">
            {isLast ? "Start over" : "See what happens next"}
            <ChevronRightIcon className="size-3.5" />
          </span>
        </div>
      </button>
    </div>
  );
}
