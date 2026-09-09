import { ComponentType, CSSProperties } from "react";

/** Grey matte metric card — solid panel-raised surface, white 28px number, one colored icon. */
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
    <div className="rounded-none border border-white/[0.1] bg-panel-raised px-4 py-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-transform duration-200 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(0,0,0,0.5)]">
      <Icon className="size-4" style={{ color: iconColor }} />
      <p className="mt-3 text-[28px] font-bold tabular-nums leading-none tracking-tight text-white">{value}</p>
      <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
