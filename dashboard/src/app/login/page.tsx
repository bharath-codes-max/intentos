import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto max-w-md space-y-6 pt-16">
      <div className="text-center">
        <h1 className="text-[32px] font-bold tracking-tight text-foreground">Sign in</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Welcome back to Intentos.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {error === "invalid" && (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
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
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-[13px] text-muted-foreground">
        New to Intentos? <Link href="/signup" className="text-foreground underline">Create an account</Link>
      </p>
    </div>
  );
}
