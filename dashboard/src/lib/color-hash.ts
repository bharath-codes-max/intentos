const PALETTE = ["#7FC6EC", "#B39CE8", "#A9D66B", "#F2C438", "#EE9A5C", "#F2789F", "#22D3EE"];

/** Deterministic color for a name/label — same input always gets the same palette color. */
export function colorFor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Two-letter initials from an email — "JB" from "john.blaze@co.com" (first letter of the
 *  first and last name-like segment), or the first two characters of the local part when
 *  there's nothing to split on, e.g. "JO" from "johnblaze@gmail.com". */
export function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._+-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "?";
}
