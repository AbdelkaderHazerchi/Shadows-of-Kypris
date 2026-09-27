"use client";

import dynamic from "next/dynamic";
import ScreenRouter from "@/components/game/ScreenRouter";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-foreground" dir="rtl">
      <GameCanvas />
      {/* طبقات سينمائية عامة */}
      <div className="kypris-vignette pointer-events-none fixed inset-0 z-10" />
      <div className="kypris-filmgrain pointer-events-none fixed inset-0 z-10" />
      <ScreenRouter />
    </main>
  );
}
