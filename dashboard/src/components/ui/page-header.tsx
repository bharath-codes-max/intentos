import { ReactNode, ComponentType } from "react";

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  iconColor,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 text-[32px] font-bold tracking-tight text-foreground">
          {Icon && (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md"
              style={{ background: iconColor ? `color-mix(in oklch, ${iconColor}, transparent 85%)` : undefined }}
            >
              <Icon className="size-[18px]" style={{ color: iconColor }} />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>}
    </div>
  );
}
