import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TopBarScaler } from "@/components/TopBarScaler";
import { PwaRegister } from "@/components/PwaRegister";

export const viewport: Viewport = {
  themeColor: "#2D4A3E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "NourishThali - Integrative Oncology Meal Planner",
  description:
    "Vibrant, healing Indian Keto meal planner and collaborative family kitchen workspace.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NourishThali",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#FAF7F2] text-[#14241B] text-base antialiased">
        <PwaRegister />
        <TopBarScaler />
        {children}
        <footer className="mt-16 border-t border-[#2D4A3E]/15 bg-[#F2ECE1]/70 py-6 text-[#2D4A3E]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#14241B]">
              NourishThali — Integrative Family Meal &amp; Thali Workspace
            </p>
            <p className="text-xs text-[#2D4A3E]/80">
              16:8 Circadian Nutrition • 4-Part Wholesome Plate • Supabase SSR
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
