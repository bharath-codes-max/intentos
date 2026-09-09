import { cn } from "@/lib/utils";

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        "rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-foreground",
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
        "overflow-x-auto rounded-md border border-border bg-black/30 p-3 font-mono text-[12px] leading-relaxed text-muted-foreground",
        className
      )}
    >
      {children}
    </pre>
  );
}
