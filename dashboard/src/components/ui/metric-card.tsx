import { ComponentType, CSSProperties } from "react";

/** Rounded matte metric card — icon badge + label up top, big bold number below. */
export function MetricCard({
  label,
  value,
  iconColor,
  icon: Icon,
}: {
  label: string;
  value: number;
  iconColor: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel-raised px-4 py-4 shadow-[var(--shadow-md)] transition-transform duration-200 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: iconColor + "22", color: iconColor }}
        >
          <Icon className="size-4" />
        </span>
        <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-[30px] font-bold tabular-nums leading-none tracking-tight text-foreground">{value}</p>
    </div>
  );
}
