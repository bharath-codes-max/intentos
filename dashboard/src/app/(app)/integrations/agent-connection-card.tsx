import type { ReactNode } from "react";
import { CopyCommand } from "./copy-command";
import { RevokeButton } from "./revoke-button";

export function AgentConnectionCard({
  icon,
  name,
  description,
  connectedTokens,
  installCommand,
  advanced,
  extraNote,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  connectedTokens: { id: string; label: string; created_at: string }[];
  installCommand: string;
  advanced: ReactNode;
  extraNote?: ReactNode;
}) {
  const connected = connectedTokens.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40">
            {icon}
          </div>
          <div>
            <div className="text-[15px] font-semibold text-foreground">{name}</div>
            <div className="text-[13px] text-muted-foreground">{description}</div>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
            connected
              ? "border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] text-foreground"
              : "border-border bg-muted/40 text-muted-foreground"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

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
