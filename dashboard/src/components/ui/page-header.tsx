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
              className="flex size-9 shrink-0 items-center justify-center rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
              style={{ background: iconColor }}
            >
              <Icon className="size-[19px] text-white" />
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
