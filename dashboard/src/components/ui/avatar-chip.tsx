import { colorFor } from "@/lib/color-hash";

/** A tiny colored initial-circle avatar for a person or agent name in a row's trailing cluster.
 *  Pass `initials` (e.g. from initialsFromEmail) to show two letters instead of the default
 *  single first-character initial — used wherever a real person, not just an agent, did the
 *  action, so the avatar is actually useful for telling rows apart at a glance. */
export function AvatarChip({ label, initials }: { label: string | null | undefined; initials?: string }) {
  const name = label ?? "?";
  const shown = initials ?? (name.trim().charAt(0).toUpperCase() || "?");
  const color = colorFor(name);
  return (
    <span
      title={label ?? undefined}
      className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold tracking-tight text-black/70"
      style={{ background: color }}
    >
      {shown}
    </span>
  );
}
