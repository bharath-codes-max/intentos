import { cn } from "@/lib/utils";

/** A small pill badge — colored dot + label — for tags, refs, and rule names in row lists. */
export function Chip({ label, color, className }: { label: string; color?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-40 items-center gap-1.5 truncate rounded-full border border-white/[0.09] bg-white/[0.05] px-2.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {color && <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="truncate">{label}</span>
    </span>
  );
}
