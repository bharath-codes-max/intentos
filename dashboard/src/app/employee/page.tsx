import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ClaudeIcon } from "@/components/agent-icons";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { getMe, listTokens } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";
import { CopyCommand } from "@/app/(app)/integrations/copy-command";

export default async function EmployeePage() {
  const token = await getSessionToken();
  if (!token) redirect("/enter");

  const me = await getMe(token);
  const tokens = await listTokens(me.org_id);
  const myDevices = tokens.filter((t) => t.owner_email === me.email && !t.revoked_at);
  const connected = myDevices.length > 0;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;
  const installCommand = `curl -fsSL ${origin}/install.sh | bash`;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/employee" className="flex items-center gap-2 text-[17px] font-semibold text-foreground">
          <Logo size={24} />
          Intentos
        </Link>
        <LogoutButton />
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div>
            <div className="text-[13px] text-muted-foreground">Signed in as</div>
            <div className="text-[15px] font-semibold text-foreground">{me.email}</div>
            <div className="text-[13px] text-muted-foreground">{me.org_name}</div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/40">
                <ClaudeIcon size={18} />
              </div>
              <div>
                <div className="text-[14px] font-medium text-foreground">Claude Code</div>
                <div className="text-[12px] text-muted-foreground">
                  {connected ? `Connected on ${myDevices.length} device${myDevices.length > 1 ? "s" : ""}` : "Not connected on this machine"}
                </div>
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                connected
                  ? "border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              {connected ? "Connected ✓" : "Not connected"}
            </span>
          </div>

          {!connected && (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                Run this once on this computer. It works in every project automatically — nothing else to set up.
              </p>
              <CopyCommand command={installCommand} />
            </div>
          )}

          <p className="text-[12px] text-muted-foreground">
            Once connected, you can close this page — Claude Code stays governed automatically. You don&apos;t need to come back here unless you want to disconnect a device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
