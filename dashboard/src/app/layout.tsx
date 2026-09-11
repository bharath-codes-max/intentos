import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
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

/** Runs before hydration so the correct theme class is on <html> before first paint — without
 *  this, the page would flash the wrong theme for a frame while React boots up and reads
 *  localStorage itself. Defaults to dark (this product's original, still-primary theme) for a
 *  first-time visitor with nothing stored yet. */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored !== "light") document.documentElement.classList.add("dark");
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full min-h-full">
        <ToastProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
