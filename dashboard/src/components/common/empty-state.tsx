import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Icon className="size-6 text-faint-foreground" strokeWidth={1.5} />
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-[12.5px] text-muted-foreground">{description}</p>
    </div>
  );
}
