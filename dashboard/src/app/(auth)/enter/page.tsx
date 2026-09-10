import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enterAction } from "./actions";

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Private preview</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Intentos is in a private test right now. Enter the access password you were given.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          That password isn&apos;t right.
        </p>
      )}

      <form action={enterAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-1.5">
          <Label htmlFor="password">Access password</Label>
          <Input id="password" name="password" type="password" required autoFocus />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Continue
        </Button>
      </form>
    </div>
  );
}
