import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/ui/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { listOrgs } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intentos",
  description: "Permission and audit layer for AI agents.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [orgs, currentOrgId] = await Promise.all([listOrgs(), getCurrentOrgId()]);

  return (
    <html lang="en" className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full min-h-full">
        <ToastProvider>
          <TooltipProvider>
            <AppShell orgs={orgs} currentOrgId={currentOrgId}>
              {children}
            </AppShell>
          </TooltipProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
