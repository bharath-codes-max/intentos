import Link from "next/link";
import { AuthShowcase } from "@/components/auth-showcase";

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-screen flex-col justify-center px-6 py-16 sm:px-12">
        <Link href="/" className="mb-10 flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <span className="inline-block size-6 rounded-md bg-primary" />
          Intentos
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <AuthShowcase />
    </div>
  );
}
