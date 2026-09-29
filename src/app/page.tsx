"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import ScreenRouter from "@/components/game/ScreenRouter";
import { useGame } from "@/lib/game/state";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
});

export default function Home() {
  const lang = useGame((s) => s.lang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title =
      lang === "ar"
        ? "ظلال كيبريس — لعبة رعب نفسي"
        : "Shadows of Kypris — Psychological Survival Horror";
  }, [lang, dir]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-foreground" dir={dir}>
      <GameCanvas />
      {/* Cinematic overlays */}
      <div className="kypris-vignette pointer-events-none fixed inset-0 z-10" />
      <div className="kypris-filmgrain pointer-events-none fixed inset-0 z-10" />
      <ScreenRouter />
    </main>
  );
}
