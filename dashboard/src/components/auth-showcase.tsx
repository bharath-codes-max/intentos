import { CodeIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { VerdictBadge } from "@/components/verdict-badge";

const ROWS = [
  { tool: "Read", target: "src/payments/charge.ts", verdict: "allow" },
  { tool: "Bash", target: "rm config/prod.env", verdict: "block" },
  { tool: "Edit", target: "infra/terraform/main.tf", verdict: "review" },
];

/** Right-hand showcase panel for the (auth) route group — same dark palette as the product,
 *  with a static mock of the real Decisions view so the login/signup screen isn't a blank
 *  form next to empty space. No live data, no network calls — purely illustrative. */
export function AuthShowcase() {
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

      <div className="relative mt-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-panel/90 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur">
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-3">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Decisions</span>
          <span className="flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] px-2.5 py-1 text-[11px] font-medium text-foreground">
            <CheckCircledIcon className="size-3" /> Claude Code connected
          </span>
        </div>
        <ul className="space-y-2.5">
          {ROWS.map((row) => (
            <li key={row.target} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CodeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-[12px] text-foreground">{row.target}</span>
              </div>
              <VerdictBadge verdict={row.verdict} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
