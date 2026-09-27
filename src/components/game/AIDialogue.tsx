"use client";

import { useCallback, useEffect, useState } from "react";
import { Terminal } from "lucide-react";
import { AI_DIALOGUE } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { audio } from "@/lib/game/audio";
import { getEngine, type AIChoice } from "@/lib/game/engineRef";
import { useTypewriter } from "./useTypewriter";

/** حوار كيميرا — النواة تتحدث… ثم تطلب قرارك */
export default function AIDialogue() {
  const aiChoiceOpen = useGame((g) => g.aiChoiceOpen);
  const screen = useGame((g) => g.screen);
  const [idx, setIdx] = useState(0);

  const line = AI_DIALOGUE[Math.min(idx, AI_DIALOGUE.length - 1)];
  const { shown, done, skip } = useTypewriter(line.text, 26);

  // إعادة الحوار إلى سطره الأول عند كل فتح (ضبط مشتق أثناء الرسم)
  const open = aiChoiceOpen && screen === "playing";
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setIdx(0);
  }

  // صوت السطر عند بدئه
  useEffect(() => {
    if (line.voice) audio.playVoice(line.voice);
  }, [line.voice]);

  // صوت تشويش خافت عند فتح الحوار
  useEffect(() => {
    if (aiChoiceOpen && screen === "playing") {
      audio.play("radio_static", { volume: 0.4 });
    }
  }, [aiChoiceOpen, screen]);

  const advance = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (line.choices) return; // آخر سطر: القرار عبر الأزرار فقط
    setIdx((i) => Math.min(i + 1, AI_DIALOGUE.length - 1));
  }, [done, skip, line.choices]);

  const choose = (id: string) => {
    audio.play("ui_click");
    getEngine()?.chooseAI(id as AIChoice);
    // المحرك مسؤول عن إغلاق الحوار (setAiChoiceOpen(false))
  };

  if (!(aiChoiceOpen && screen === "playing")) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-4 pb-6">
      <div
        onClick={advance}
        className="kypris-panel pointer-events-auto w-[min(760px,94vw)] cursor-pointer rounded border border-red-900/40 p-6"
        style={{ boxShadow: "inset 0 0 60px rgba(60,0,0,0.5), 0 10px 40px rgba(0,0,0,0.8)" }}
      >
        {/* تسمية معطوبة */}
        <p className="kypris-flicker flex items-center gap-2 font-mono text-xs tracking-widest text-red-400">
          <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} />
          كيميرا — النواة المركزية
        </p>

        {/* السطر الحالي */}
        <div className="mt-3 min-h-[64px]">
          <span className="rounded-sm border border-red-900/50 bg-red-950/30 px-1.5 py-0.5 text-[10px] text-red-300">
            {line.speaker}
          </span>
          <p className="mt-2 text-lg leading-8 text-stone-100">
            {shown}
            {!done && <span className="kypris-pulse mr-1 inline-block text-red-500">▍</span>}
          </p>
        </div>

        {/* الخيارات الثلاثة */}
        {line.choices && done && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {line.choices.map((c) => (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  choose(c.id);
                }}
                className="kypris-btn p-3 text-right"
              >
                <span className="block font-ui text-sm font-bold text-stone-100">{c.label}</span>
                <span className="mt-1 block text-[11px] leading-5 text-stone-400">{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        {!line.choices && (
          <p className="mt-3 text-left text-[10px] text-stone-600">انقر للمتابعة…</p>
        )}
      </div>
    </div>
  );
}
