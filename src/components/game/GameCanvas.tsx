"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/game/engine";
import { audio } from "@/lib/game/audio";
import { loadSettings } from "@/lib/game/save";
import { useGame } from "@/lib/game/state";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    // خطاف تشخيصي (مفيد للفحص ولا يؤثر على اللعب)
    (window as unknown as { __kypris?: unknown }).__kypris = { engine, store: useGame };

    // استرجاع الإعدادات المحفوظة
    const s = loadSettings();
    if (s) {
      useGame.getState().setSetting("master", s.master);
      useGame.getState().setSetting("music", s.music);
      useGame.getState().setSetting("sfx", s.sfx);
      useGame.getState().setSetting("hints", s.hints);
      audio.setVolumes(s);
    }

    const onVis = () => {
      if (document.hidden) {
        const st = useGame.getState();
        if (st.screen === "playing") {
          st.setScreen("paused");
          document.exitPointerLock();
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full"
      aria-label="لوحة اللعبة ثلاثية الأبعاد"
    />
  );
}
