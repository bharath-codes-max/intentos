import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">Sign in to your Intentos account.</p>
      </div>

      {error === "invalid" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          Invalid email or password.
        </p>
      )}

      <form action={loginAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <p className="text-[13px] text-muted-foreground">
        New to Intentos? <Link href="/signup" className="text-foreground underline underline-offset-2">Create an account</Link>
      </p>
    </div>
  );
}
