"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FastForward } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { audio } from "@/lib/game/audio";
import { useGame } from "@/lib/game/state";
import { useTypewriter } from "./useTypewriter";

const FADE_MS = 650;

export default function Intro({ onFinish }: { onFinish: () => void }) {
  const lang = useGame((s) => s.lang);
  const c = getContent(lang);
  const introLines = c.introLines;

  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const line = introLines[Math.min(idx, introLines.length - 1)];
  const { shown, done, skip } = useTypewriter(line.text, 34);

  const advance = useCallback(() => {
    clearTimers();
    setFading(true);
    const t = setTimeout(() => {
      setFading(false);
      if (idx + 1 >= introLines.length) {
        onFinish();
      } else {
        setIdx((i) => i + 1);
      }
    }, FADE_MS);
    timers.current.push(t);
  }, [clearTimers, idx, introLines.length, onFinish]);

  useEffect(() => {
    if (line.voice) audio.playVoice(line.voice);
  }, [line.voice]);

  useEffect(() => {
    if (!done || fading) return;
    const t = setTimeout(advance, line.hold ?? 1200);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [done, fading, advance, line.hold]);

  useEffect(() => {
    return () => {
      clearTimers();
      audio.stopVoice();
    };
  }, [clearTimers]);

  const onClick = () => {
    if (!done) {
      skip();
      return;
    }
    audio.stopVoice();
    advance();
  };

  const skipAll = () => {
    clearTimers();
    audio.stopVoice();
    onFinish();
  };

  return (
    <div
      className="fixed inset-0 z-40 cursor-pointer select-none bg-black"
      onClick={onClick}
    >
      {/* Pulsing dark red glow */}
      <div
        className="kypris-pulse pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(120,10,10,0.28) 0%, rgba(60,6,6,0.12) 45%, transparent 70%)",
        }}
      />
      <div className="kypris-vignette pointer-events-none absolute inset-0" />
      <div className="kypris-filmgrain pointer-events-none absolute inset-0" />

      {/* Current line */}
      <div className="relative z-10 flex h-full w-full items-center justify-center px-6">
        <p
          className={`max-w-3xl text-center font-title text-2xl leading-relaxed text-stone-200 transition-opacity duration-500 md:text-3xl ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {shown}
          {!done && (
            <span className="kypris-pulse mx-1 inline-block text-red-700">▍</span>
          )}
        </p>
      </div>

      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          skipAll();
        }}
        className="kypris-btn absolute left-5 top-5 z-20 flex items-center gap-2 px-4 py-2 font-ui text-sm text-stone-400 hover:text-stone-100"
      >
        <FastForward className="h-4 w-4" strokeWidth={1.5} />
        {c.ui.intro.skip}
      </button>

      {/* Line counter */}
      <div
        dir="ltr"
        className="absolute bottom-5 right-6 z-20 font-mono text-[11px] text-stone-700"
      >
        {idx + 1} / {introLines.length}
      </div>
    </div>
  );
}
