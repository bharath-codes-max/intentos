import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "./actions";

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Every agent, policy, and decision your company logs stays scoped to your company alone.
        </p>
      </div>

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
        <Button type="submit" className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="text-[13px] text-muted-foreground">
        Already have an account? <Link href="/login" className="text-foreground underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}
