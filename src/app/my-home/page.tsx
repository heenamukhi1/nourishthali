import React from "react";
import { MyHomeClient } from "@/components/MyHomeClient";

export const dynamic = "force-dynamic";

export default function MyHomePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C3531]">
      <MyHomeClient />
    </div>
  );
}
