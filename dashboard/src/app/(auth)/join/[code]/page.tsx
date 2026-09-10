import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInvitePreview } from "@/lib/api";
import { joinAction } from "./actions";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;

  let orgName: string | null = null;
  let invalid = false;
  try {
    const preview = await getInvitePreview(code);
    orgName = preview.org_name;
  } catch {
    invalid = true;
  }

  if (invalid) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Invite link not valid</h1>
        <p className="text-[14px] text-muted-foreground">
          This link is invalid or has been revoked. Ask your admin to share a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Join {orgName}</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Sign in with your own work email — this link doesn&apos;t give you access on its own.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <form action={joinAction} className="space-y-4">
        <input type="hidden" name="code" value={code} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="you@company.com" required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" minLength={8} required />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Join {orgName}
        </Button>
      </form>
    </div>
  );
}
