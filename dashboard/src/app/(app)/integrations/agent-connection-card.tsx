import type { ReactNode } from "react";
import { CopyCommand } from "./copy-command";
import { RevokeButton } from "./revoke-button";

/** For a surface with a real, working installer — shows connected devices or the install command. */
export function InstallCard({
  description,
  connectedTokens,
  installCommand,
  advanced,
  extraNote,
}: {
  description: string;
  connectedTokens: { id: string; label: string; created_at: string }[];
  installCommand: string;
  advanced: ReactNode;
  extraNote?: ReactNode;
}) {
  const connected = connectedTokens.length > 0;
  return (
    <div className="space-y-5">
      <p className="text-[13px] text-muted-foreground">{description}</p>
      {extraNote}

      {!connected ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="text-[13px] font-medium text-foreground">Connect in one step</div>
          <p className="text-[13px] text-muted-foreground">
            Run this on the machine you want governed. It installs the connector, opens your browser to approve
            the device, and works automatically from then on — no per-project setup.
          </p>
          <CopyCommand command={installCommand} />
        </div>
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
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-[13px] text-muted-foreground">
              Add another machine? Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{installCommand}</code> there.
            </p>
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

/** For a surface with no built connector yet — never shows a fake install command. */
export function NotCertifiedCard({ description, why }: { description: string; why: string }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">{description}</p>
      <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4">
        <div className="text-[13px] font-medium text-foreground">Not available yet</div>
        <p className="mt-1 text-[13px] text-muted-foreground">{why}</p>
      </div>
    </div>
  );
}
