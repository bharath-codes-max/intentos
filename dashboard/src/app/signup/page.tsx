import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "./actions";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 pt-16">
      <div className="text-center">
        <h1 className="text-[32px] font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Every agent, policy, and decision your company logs stays scoped to this company alone.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form action={signupAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Company name</Label>
              <Input id="company_name" name="company_name" placeholder="Acme Inc." required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" placeholder="you@acme.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="At least 8 characters" minLength={8} required />
            </div>
            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-[13px] text-muted-foreground">
        Already have an account? <Link href="/login" className="text-foreground underline">Sign in</Link>
      </p>
    </div>
  );
}
