import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
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
      <body className="flex h-full min-h-full">
        <Sidebar orgs={orgs} currentOrgId={currentOrgId} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-8 py-7">{children}</div>
        </main>
      </body>
    </html>
  );
}
