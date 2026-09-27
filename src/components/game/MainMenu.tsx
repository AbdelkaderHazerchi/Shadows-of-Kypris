"use client";

import { useEffect, useState } from "react";
import { BookOpen, Gamepad2, Play, RotateCcw, Trophy } from "lucide-react";
import { GAME_TAGLINE, GAME_TITLE } from "@/lib/game/content";
import { audio } from "@/lib/game/audio";
import { useGame } from "@/lib/game/state";
import { getUnlockedEndings, hasCheckpoint } from "@/lib/game/save";
import { getEngine } from "@/lib/game/engineRef";
import VolumeSliders from "./VolumeSliders";

const ENGINE_NOT_READY = "المحرك لم يجهز بعد… أعد المحاولة";

export default function MainMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const [hasSave, setHasSave] = useState(false);
  const [unlocked, setUnlocked] = useState(0);
  const [engineError, setEngineError] = useState(false);

  useEffect(() => {
    // قراءة التخزين المحلي بعد الإسقاط الأول (تفادياً لعدم تطابق الترطيب)
    const t = setTimeout(() => {
      setHasSave(hasCheckpoint());
      setUnlocked(getUnlockedEndings().length);
    }, 0);
    // تهيئة الصوت مبكراً (سينشط فعلياً مع أول لمسة) + أجواء القائمة
    try {
      audio.init();
      const s = useGame.getState().settings;
      audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
      audio.startAmbient("menu");
    } catch {
      /* الصوت اختياري */
    }
    return () => clearTimeout(t);
  }, []);

  const startNew = () => {
    audio.init();
    audio.play("ui_click");
    useGame.getState().resetRun();
    setScreen("intro");
  };

  const continueGame = () => {
    audio.init();
    audio.play("ui_click");
    const e = getEngine();
    if (!e) {
      setEngineError(true);
      useGame.getState().showHint(ENGINE_NOT_READY);
      return;
    }
    setEngineError(false);
    e.continueGame();
  };

  const toGallery = () => {
    audio.init();
    audio.play("ui_click");
    setScreen("gallery");
  };

  const toHelp = () => {
    audio.init();
    audio.play("ui_click");
    setScreen("help");
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-black">
      {/* خلفية الصورة */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/menu-bg.jpg')" }}
      />
      {/* طبقات سينمائية */}
      <div className="kypris-vignette pointer-events-none absolute inset-0" />
      <div className="kypris-filmgrain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />

      {/* المحتوى */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          {/* العنوان */}
          <h1
            className="kypris-bloodtext font-title text-7xl font-bold leading-tight text-red-800 md:text-8xl"
            dir="rtl"
          >
            ظلال ك<span className="kypris-flicker">ي</span>بريس
          </h1>
          <p className="mt-3 font-title text-xl text-[#d6c9a8]/75">{GAME_TAGLINE}</p>
          <p className="mt-1 text-sm text-stone-500">عالمٌ فاقد الذاكرة… ومدينةٌ تحشد موتاها</p>

          {/* الأزرار */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              onClick={startNew}
              className="kypris-btn flex w-72 items-center justify-center gap-3 py-3 font-ui text-lg text-stone-100"
            >
              <Play className="h-5 w-5 text-red-700" strokeWidth={1.75} />
              لعبة جديدة
            </button>

            {hasSave && (
              <button
                onClick={continueGame}
                className="kypris-btn flex w-72 items-center justify-center gap-3 py-3 font-ui text-lg text-stone-100"
              >
                <RotateCcw className="h-5 w-5 text-amber-700" strokeWidth={1.75} />
                متابعة
              </button>
            )}

            <button
              onClick={toGallery}
              className="kypris-btn flex w-72 items-center justify-center gap-3 py-3 font-ui text-lg text-stone-300"
            >
              <Trophy className="h-5 w-5 text-amber-700" strokeWidth={1.75} />
              سجل النهايات
            </button>

            <button
              onClick={toHelp}
              className="kypris-btn flex w-72 items-center justify-center gap-3 py-3 font-ui text-lg text-stone-300"
            >
              <BookOpen className="h-5 w-5 text-stone-500" strokeWidth={1.75} />
              كيف تلعب
            </button>
          </div>

          {engineError && (
            <p className="mt-4 border border-red-900/50 bg-red-950/30 px-4 py-1.5 font-ui text-sm text-red-400">
              {ENGINE_NOT_READY}
            </p>
          )}

          {/* منزلقات الصوت */}
          <div className="mt-8">
            <VolumeSliders />
          </div>
        </div>
      </div>

      {/* التذييل */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 pb-4">
        <p className="flex items-center gap-2 text-xs text-stone-600">
          <Gamepad2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          اللعبة للحاسوب — فأرة ولوحة مفاتيح + سماعات رأس مقترحة بشدة
        </p>
        <p className="font-ui text-[11px] text-stone-600">
          النهايات المفتوحة:{" "}
          <span dir="ltr" className="font-mono text-amber-800">
            {unlocked}/6
          </span>
        </p>
      </div>
    </div>
  );
}
