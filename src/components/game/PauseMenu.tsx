"use client";

import {
  Briefcase,
  Clock,
  Map as MapIcon,
  Play,
  ScrollText,
  Target,
  Undo2,
} from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import { formatClock } from "./utils";
import VolumeSliders from "./VolumeSliders";

export default function PauseMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const lang = useGame((s) => s.lang);
  const objective = useGame((g) => g.hud.objective);
  const playSeconds = useGame((g) => g.stats.playSeconds);

  const ui = getContent(lang).ui.pause;

  const resume = () => getEngine()?.resume();
  const toInventory = () => setScreen("inventory");
  const toMap = () => setScreen("map");
  const toMissions = () => setScreen("missions");
  const toHelp = () => setScreen("help");
  const quitToMenu = () => getEngine()?.quitToMenu();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="kypris-panel kypris-hud-corner w-[min(480px,94vw)] rounded-md p-7">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="font-title text-2xl font-bold tracking-wide text-stone-100">
              {ui.title}
            </h2>
          </div>
          <span className="flex items-center gap-1.5 rounded border border-stone-800 bg-black/50 px-2.5 py-1 font-mono text-xs text-stone-300">
            <Clock className="h-3.5 w-3.5 text-amber-600" strokeWidth={1.6} />
            <span dir="ltr">{formatClock(playSeconds)}</span>
          </span>
        </div>

        {/* Active Directive Banner */}
        {objective && (
          <div className="mt-4 flex items-start gap-2.5 rounded border border-amber-900/40 bg-amber-950/20 px-3.5 py-2.5">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
            <p className="font-ui text-xs leading-5 text-stone-200">{objective}</p>
          </div>
        )}

        {/* Primary Resume CTA */}
        <div className="mt-5">
          <button
            onClick={resume}
            className="kypris-btn flex w-full items-center justify-center gap-3 rounded py-3 font-ui text-base font-bold text-stone-100"
          >
            <Play className="h-4.5 w-4.5 text-emerald-500" strokeWidth={2} />
            {ui.resume}
          </button>
        </div>

        {/* 2x2 Tactical Sub-Screen Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            onClick={toInventory}
            className="kypris-btn flex items-center justify-center gap-2.5 rounded py-2.5 font-ui text-sm text-stone-200"
          >
            <Briefcase className="h-4 w-4 text-amber-500" strokeWidth={1.6} />
            {ui.inventory}
          </button>
          <button
            onClick={toMap}
            className="kypris-btn flex items-center justify-center gap-2.5 rounded py-2.5 font-ui text-sm text-stone-200"
          >
            <MapIcon className="h-4 w-4 text-amber-500" strokeWidth={1.6} />
            {ui.map}
          </button>
          <button
            onClick={toMissions}
            className="kypris-btn flex items-center justify-center gap-2.5 rounded py-2.5 font-ui text-sm text-stone-200"
          >
            <ScrollText className="h-4 w-4 text-amber-500" strokeWidth={1.6} />
            {ui.missions}
          </button>
          <button
            onClick={toHelp}
            className="kypris-btn flex items-center justify-center gap-2.5 rounded py-2.5 font-ui text-sm text-stone-300"
          >
            <Target className="h-4 w-4 text-stone-400" strokeWidth={1.6} />
            {ui.howToPlay}
          </button>
        </div>

        {/* Audio & Language Controls */}
        <div className="mt-5 border-t border-stone-800/80 pt-4">
          <VolumeSliders />
        </div>

        {/* Quit to Main Menu */}
        <div className="mt-4 border-t border-stone-800/80 pt-4">
          <button
            onClick={quitToMenu}
            className="kypris-btn flex w-full items-center justify-center gap-2.5 rounded border-red-900/50 py-2.5 font-ui text-sm text-red-400 hover:text-red-300"
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.6} />
            {ui.mainMenu}
          </button>
          <p className="mt-3 text-center font-ui text-[11px] text-stone-500">
            {ui.autoSaveNote}
          </p>
        </div>
      </div>
    </div>
  );
}
