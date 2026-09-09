const PALETTE = ["#7FC6EC", "#B39CE8", "#A9D66B", "#F2C438", "#EE9A5C", "#F2789F", "#22D3EE"];

/** Deterministic color for a name/label — same input always gets the same palette color. */
export function colorFor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
