import type { Metadata } from "next";
import "./globals.css";
import { TopBarScaler } from "@/components/TopBarScaler";

export const metadata: Metadata = {
  title: "NourishThali | Integrative Family Meal & Thali Planner",
  description:
    "Collaborative Indian Keto & Sattvic Thali planner with 4-part wholesome plate formulas, recipes, and weekly market shopping checklists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#FAF7F2] text-[#14241B] text-base antialiased">
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
