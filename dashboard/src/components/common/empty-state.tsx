import type { ComponentType } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Icon className="size-5 text-faint-foreground" />
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-[12.5px] text-muted-foreground">{description}</p>
    </div>
  );
}
