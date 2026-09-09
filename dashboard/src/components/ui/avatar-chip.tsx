const PALETTE = ["#7FC6EC", "#B39CE8", "#A9D66B", "#F2C438", "#EE9A5C", "#F2789F", "#22D3EE"];

function colorFor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

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
