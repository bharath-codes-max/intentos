import type { DailyDecisionCount } from "@/lib/api";

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Real checks-per-day for the last 7 days, zero-filled — no fabricated numbers. Busier days
 *  render as a fuller, more saturated bar; quieter days are a lighter tint of the same color. */
export function ActivityBarChart({ data }: { data: DailyDecisionCount[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-2xl border border-border bg-panel-raised px-5 py-4 shadow-[var(--shadow-md)]">
      <p className="text-[12.5px] font-medium text-muted-foreground">Checks this week</p>
      <div className="mt-5 flex h-32 gap-2.5 sm:gap-4">
        {data.map((d) => {
          const ratio = d.count / max;
          const heightPct = Math.max(ratio * 100, d.count > 0 ? 6 : 2);
          const date = new Date(d.day);
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex min-h-0 w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-primary transition-[height] duration-300"
                  style={{ height: `${heightPct}%`, opacity: 0.35 + ratio * 0.65 }}
                  title={`${d.count} check${d.count === 1 ? "" : "s"}`}
                />
              </div>
              <span className="text-[11px] text-faint-foreground">{DAY_LABEL[date.getDay()]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
