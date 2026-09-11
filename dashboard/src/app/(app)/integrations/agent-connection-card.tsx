import type { ReactNode } from "react";
import { RevokeButton } from "./revoke-button";
import { ScopeGate } from "./scope-gate";

/** For a provider with a real, working installer — shows connected devices, or the
 *  mandatory scope step gating a fresh install command. */
export function InstallCard({
  description,
  connectedTokens,
  installUrl,
  advanced,
  extraNote,
}: {
  description: string;
  connectedTokens: { id: string; label: string; created_at: string }[];
  installUrl: string;
  advanced: ReactNode;
  extraNote?: ReactNode;
}) {
  const connected = connectedTokens.length > 0;
  return (
    <div className="space-y-5">
      <p className="text-[13px] text-muted-foreground">{description}</p>
      {extraNote}

      {!connected ? (
        <ScopeGate installUrl={installUrl} />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {connectedTokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-[13px] font-medium text-foreground">{t.label}</div>
                  <div className="text-[12px] text-muted-foreground">
                    Connected {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <RevokeButton tokenId={t.id} />
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="mb-3 text-[13px] text-muted-foreground">Add another device? Configure its scope, then copy its own command.</p>
            <ScopeGate installUrl={installUrl} />
          </div>
        </div>
      )}

      <details className="text-[12px] text-muted-foreground">
        <summary className="cursor-pointer select-none">Advanced</summary>
        <div className="mt-2 space-y-1 rounded-lg border border-border bg-muted/10 p-3 font-mono text-[11px]">
          {advanced}
        </div>
      </details>
    </div>
  );
}
