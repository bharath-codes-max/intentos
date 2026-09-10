import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthShowcase } from "@/components/auth-showcase";

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-[#101112] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="auth-light relative flex min-h-screen flex-col bg-background px-10 py-10 sm:px-20">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold text-foreground">
          <Logo size={24} />
          Intentos
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <AuthShowcase />
    </div>
  );
}
