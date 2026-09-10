import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthShowcase } from "@/components/auth-showcase";

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-light grid min-h-screen w-full grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-screen flex-col items-center justify-center px-10 py-16 sm:px-20">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-14 flex items-center gap-2 text-[17px] font-semibold text-foreground">
            <Logo size={24} />
            Intentos
          </Link>
          {children}
        </div>
      </div>
      <AuthShowcase />
    </div>
  );
}
