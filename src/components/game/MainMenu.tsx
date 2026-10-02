"use client";

import { useEffect, useState } from "react";
import { BookOpen, Gamepad2, Globe, Play, RotateCcw, Trophy } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { audio } from "@/lib/game/audio";
import { useGame } from "@/lib/game/state";
import { getUnlockedEndings, hasCheckpoint, loadSettings, saveSettings } from "@/lib/game/save";
import { getEngine } from "@/lib/game/engineRef";
import VolumeSliders from "./VolumeSliders";

export default function MainMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  const [hasSave, setHasSave] = useState(false);
  const [unlocked, setUnlocked] = useState(0);
  const [engineError, setEngineError] = useState(false);

  const c = getContent(lang);
  const ui = c.ui.menu;

  useEffect(() => {
    const t = setTimeout(() => {
      setHasSave(hasCheckpoint());
      setUnlocked(getUnlockedEndings().length);
      const saved = loadSettings();
      if (saved?.lang && (saved.lang === "en" || saved.lang === "ar")) {
        useGame.getState().setLang(saved.lang);
      }
    }, 0);
    try {
      audio.init();
      const s = useGame.getState().settings;
      audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
      audio.startAmbient("menu");
    } catch {
      /* Audio optional */
    }
    return () => clearTimeout(t);
  }, []);

  const switchLang = (nextLang: "en" | "ar") => {
    audio.init();
    audio.play("ui_click");
    setLang(nextLang);
    const s = useGame.getState().settings;
    saveSettings({ ...s, lang: nextLang });
  };

  const startNew = () => {
    audio.init();
    audio.play("ui_click");
    const e = getEngine();
    if (!e) {
      setEngineError(true);
      useGame.getState().showHint(ui.engineNotReady);
      return;
    }
    setEngineError(false);
    e.startNewGame();
  };

  const continueGame = () => {
    audio.init();
    audio.play("ui_click");
    const e = getEngine();
    if (!e) {
      setEngineError(true);
      useGame.getState().showHint(ui.engineNotReady);
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
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/menu-bg.jpg')" }}
      />
      {/* Cinematic overlays */}
      <div className="kypris-vignette pointer-events-none absolute inset-0" />
      <div className="kypris-filmgrain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />

      {/* Top Language Bar */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded border border-stone-800/80 bg-black/70 px-3 py-1.5 backdrop-blur-sm" dir="ltr">
        <Globe className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
        <button
          type="button"
          onClick={() => switchLang("en")}
          className={`rounded px-2.5 py-0.5 font-ui text-xs transition ${
            lang === "en"
              ? "bg-amber-900/60 font-semibold text-amber-200"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          English
        </button>
        <span className="text-stone-700">/</span>
        <button
          type="button"
          onClick={() => switchLang("ar")}
          className={`rounded px-2.5 py-0.5 font-ui text-xs transition ${
            lang === "ar"
              ? "bg-amber-900/60 font-semibold text-amber-200"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          العربية
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center text-center">
          {/* Title */}
          <h1
            className="kypris-bloodtext font-title text-5xl font-bold leading-tight text-red-800 md:text-7xl"
            dir={lang === "ar" ? "rtl" : "ltr"}
          >
            {ui.titlePrefix}
            <span className="kypris-flicker">{ui.titleFlicker}</span>
            {ui.titleSuffix}
          </h1>
          <p className="mt-2 font-title text-lg text-[#d6c9a8]/75">{c.tagline}</p>
          <p className="mt-1 text-xs text-stone-500">{ui.subtitle}</p>

          {/* Menu Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 max-w-xl">
            <button
              onClick={startNew}
              className="kypris-btn flex w-60 items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-100"
            >
              <Play className="h-5 w-5 text-red-700" strokeWidth={1.75} />
              {ui.newGame}
            </button>

            {hasSave && (
              <button
                onClick={continueGame}
                className="kypris-btn flex w-60 items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-100"
              >
                <RotateCcw className="h-5 w-5 text-amber-700" strokeWidth={1.75} />
                {ui.continueGame}
              </button>
            )}

            <button
              onClick={toGallery}
              className="kypris-btn flex w-60 items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-300"
            >
              <Trophy className="h-5 w-5 text-amber-700" strokeWidth={1.75} />
              {ui.endingsGallery}
            </button>

            <button
              onClick={toHelp}
              className="kypris-btn flex w-60 items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-300"
            >
              <BookOpen className="h-5 w-5 text-stone-500" strokeWidth={1.75} />
              {ui.howToPlay}
            </button>
          </div>

          {engineError && (
            <p className="mt-4 border border-red-900/50 bg-red-950/30 px-4 py-1.5 font-ui text-sm text-red-400">
              {ui.engineNotReady}
            </p>
          )}

          {/* Volume, Language & Cutscene Tester Controls */}
          <div className="mt-6 w-[min(560px,92vw)] rounded-md border border-stone-800/80 bg-black/65 p-4 backdrop-blur-xs">
            <VolumeSliders />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 pb-4">
        <p className="flex items-center gap-2 text-xs text-stone-600">
          <Gamepad2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          {ui.pcHint}
        </p>
        <p className="font-ui text-[11px] text-stone-600">
          {ui.unlockedEndings}{" "}
          <span dir="ltr" className="font-mono text-amber-800">
            {unlocked}/6
          </span>
        </p>
      </div>
    </div>
  );
}
