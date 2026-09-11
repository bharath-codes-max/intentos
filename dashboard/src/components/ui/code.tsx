import { cn } from "@/lib/utils";

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        "rounded bg-[var(--overlay-hover)] px-1.5 py-0.5 font-mono text-[12px] text-foreground",
        className
      )}
    >
      {children}
    </code>
  );
}

export function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <pre
      className={cn(
        // Deliberately always-dark "terminal" look, unlike most of this app — so its own text
        // color is fixed too, instead of the theme-adaptive --muted-foreground, which would turn
        // dark-on-dark and become unreadable in light mode.
        "overflow-x-auto rounded-none border border-border bg-black/30 p-3 font-mono text-[12px] leading-relaxed text-gray-300",
        className
      )}
    >
      {children}
    </pre>
  );
}
