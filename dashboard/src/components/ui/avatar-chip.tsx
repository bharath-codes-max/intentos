/** A tiny initial-circle avatar for an agent/reviewer name in a row's trailing cluster. */
export function AvatarChip({ label }: { label: string | null | undefined }) {
  const initial = (label ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      title={label ?? undefined}
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-medium text-muted-foreground"
    >
      {initial}
    </span>
  );
}
