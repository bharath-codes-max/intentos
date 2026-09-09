import { colorFor } from "@/lib/color-hash";

/** A tiny colored initial-circle avatar for an agent/reviewer name in a row's trailing cluster. */
export function AvatarChip({ label }: { label: string | null | undefined }) {
  const name = label ?? "?";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const color = colorFor(name);
  return (
    <span
      title={label ?? undefined}
      className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-black/70"
      style={{ background: color }}
    >
      {initial}
    </span>
  );
}
