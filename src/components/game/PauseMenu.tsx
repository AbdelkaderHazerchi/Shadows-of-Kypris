"use client";

import { Briefcase, Clock, Map as MapIcon, Play, ScrollText, Target, Undo2 } from "lucide-react";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import { formatClock } from "./utils";
import VolumeSliders from "./VolumeSliders";

/** قائمة الإيقاف المؤقت أثناء اللعب */
export default function PauseMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const objective = useGame((g) => g.hud.objective);
  const playSeconds = useGame((g) => g.stats.playSeconds);

  const resume = () => getEngine()?.resume();
  const toInventory = () => setScreen("inventory");
  const toMap = () => setScreen("map");
  const toMissions = () => setScreen("missions");
  const toHelp = () => setScreen("help");
  const quitToMenu = () => getEngine()?.quitToMenu();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="kypris-panel w-[min(460px,92vw)] rounded p-8">
        <h2 className="text-center font-title text-3xl font-bold text-stone-100">إيقاف مؤقت</h2>

        {/* تذكير بالهدف وزمن اللعب */}
        <div className="mt-4 space-y-2 border-y border-stone-800/80 py-3 text-center">
          {objective && (
            <p className="flex items-start justify-center gap-2 text-xs leading-5 text-stone-400">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" strokeWidth={1.5} />
              {objective}
            </p>
          )}
          <p className="flex items-center justify-center gap-2 text-xs text-stone-500">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
            زمن اللعب:{" "}
            <span dir="ltr" className="font-mono text-stone-300">
              {formatClock(playSeconds)}
            </span>
          </p>
        </div>

        {/* الأزرار */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={resume}
            className="kypris-btn flex items-center justify-center gap-3 py-3 font-ui text-lg text-stone-100"
          >
            <Play className="h-4.5 w-4.5 text-emerald-600" strokeWidth={1.75} />
            متابعة
          </button>
          <button
            onClick={toInventory}
            className="kypris-btn flex items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-300"
          >
            <Briefcase className="h-4 w-4 text-amber-700" strokeWidth={1.5} />
            الحقيبة
          </button>
          <button
            onClick={toMap}
            className="kypris-btn flex items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-300"
          >
            <MapIcon className="h-4 w-4 text-amber-700" strokeWidth={1.5} />
            الخريطة
          </button>
          <button
            onClick={toMissions}
            className="kypris-btn flex items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-300"
          >
            <ScrollText className="h-4 w-4 text-amber-700" strokeWidth={1.5} />
            سجل المهام
          </button>
          <button
            onClick={toHelp}
            className="kypris-btn flex items-center justify-center gap-3 py-2.5 font-ui text-base text-stone-300"
          >
            <Target className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
            كيف تلعب
          </button>
          <button
            onClick={quitToMenu}
            className="kypris-btn flex items-center justify-center gap-3 py-2.5 font-ui text-base text-red-400"
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.5} />
            القائمة الرئيسية
          </button>
        </div>

        {/* الصوت */}
        <div className="mt-6 border-t border-stone-800/80 pt-4">
          <VolumeSliders />
        </div>

        <p className="mt-4 text-center text-[11px] text-stone-600">
          يُحفظ التقدم تلقائياً عند نقاط التفتيش
        </p>
      </div>
    </div>
  );
}
