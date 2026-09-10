import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDeviceByCode } from "@/lib/api";
import { getSessionToken } from "@/lib/current-session";
import { approveDeviceAction, denyDeviceAction } from "./actions";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; result?: string }>;
}) {
  const { code, result } = await searchParams;

  if (!code) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
        <h1 className="text-[24px] font-bold text-foreground">Enter your connection code</h1>
        <p className="text-[13px] text-muted-foreground">
          Run the install command shown on the Integrations page — it will open this page with your code automatically.
        </p>
      </div>
    );
  }

  const token = await getSessionToken();
  if (!token) {
    redirect(`/login?next=${encodeURIComponent(`/connect?code=${code}`)}`);
  }

  let device;
  try {
    device = await getDeviceByCode(token, code);
  } catch {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
        <h1 className="text-[24px] font-bold text-foreground">Code not found</h1>
        <p className="text-[13px] text-muted-foreground">
          This connection code doesn&apos;t exist or already expired. Re-run the install command to get a new one.
        </p>
      </div>
    );
  }

  if (result === "approved" || device.status === "approved" || device.status === "claimed") {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
        <h1 className="text-[24px] font-bold text-foreground">Device connected</h1>
        <p className="text-[13px] text-muted-foreground">
          {device.hostname ?? "This device"} is now connected as {device.agent_type}. Go back to your terminal — it will finish automatically.
        </p>
      </div>
    );
  }
  if (result === "denied" || device.status === "denied") {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
        <h1 className="text-[24px] font-bold text-foreground">Connection denied</h1>
        <p className="text-[13px] text-muted-foreground">You denied this device. Nothing was connected.</p>
      </div>
    );
  }
  if (device.status === "expired") {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
        <h1 className="text-[24px] font-bold text-foreground">Code expired</h1>
        <p className="text-[13px] text-muted-foreground">Re-run the install command in your terminal to get a fresh code.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-16">
      <div className="text-center">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Connect a new device</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Approve this only if you just ran the install command yourself.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-center">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Code</div>
            <div className="mt-1 font-mono text-[22px] tracking-widest text-foreground">{device.user_code}</div>
          </div>
          <dl className="space-y-1 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Connector</dt>
              <dd className="text-foreground">Claude Code</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Device</dt>
              <dd className="text-foreground">{device.hostname ?? "Unknown host"}</dd>
            </div>
          </dl>
          <div className="flex gap-2 pt-2">
            <form action={denyDeviceAction} className="flex-1">
              <input type="hidden" name="user_code" value={device.user_code} />
              <Button type="submit" variant="outline" className="w-full">
                Deny
              </Button>
            </form>
            <form action={approveDeviceAction} className="flex-1">
              <input type="hidden" name="user_code" value={device.user_code} />
              <Button type="submit" className="w-full">
                Approve
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
