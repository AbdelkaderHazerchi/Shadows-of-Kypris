"use client";

import { BookOpen, Lightbulb, ScrollText, Undo2 } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";

export default function HelpScreen() {
  const lang = useGame((s) => s.lang);
  const setScreen = useGame((s) => s.setScreen);
  const back = () => setScreen("menu");

  const c = getContent(lang);
  const ui = c.ui.help;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black">
      <div className="kypris-vignette pointer-events-none fixed inset-0" />
      <div className="kypris-filmgrain pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-center font-title text-4xl font-bold text-stone-100">
          {ui.titlePrefix}
          <span className="text-red-800">{ui.titleHighlight}</span>
        </h2>

        {/* Controls */}
        <div className="kypris-panel mt-8 rounded p-6">
          <h3 className="mb-4 flex items-center gap-2 font-ui text-lg font-bold text-amber-600">
            <BookOpen className="h-4.5 w-4.5" strokeWidth={1.5} />
            {ui.controlsTitle}
          </h3>
          <div className="grid gap-2.5 md:grid-cols-2">
            {c.controls.map((ctrl) => (
              <div key={ctrl.key} className="flex items-center gap-3">
                <span
                  dir="ltr"
                  className="kypris-btn inline-block shrink-0 px-2 py-1 font-mono text-xs text-stone-200"
                >
                  {ctrl.key}
                </span>
                <span className="text-sm text-stone-400">{ctrl.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Survival Tips */}
        <div className="kypris-panel mt-6 rounded p-6">
          <h3 className="mb-4 flex items-center gap-2 font-ui text-lg font-bold text-amber-600">
            <Lightbulb className="h-4.5 w-4.5" strokeWidth={1.5} />
            {ui.tipsTitle}
          </h3>
          <ol className="space-y-2.5">
            {c.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-stone-300">
                <span
                  dir="ltr"
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-900/50 font-mono text-[11px] text-red-500"
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-6">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Background Story */}
        <div className="kypris-panel mt-6 rounded p-6">
          <h3 className="mb-4 flex items-center gap-2 font-ui text-lg font-bold text-amber-600">
            <ScrollText className="h-4.5 w-4.5" strokeWidth={1.5} />
            {ui.storyTitle}
          </h3>
          <div className="space-y-3 font-title text-base leading-8 text-stone-300">
            <p>{ui.storyP1}</p>
            <p>{ui.storyP2}</p>
            <p>
              {ui.storyP3Prefix}
              <span className="text-red-500">{ui.storyP3Highlight}</span>
              {ui.storyP3Suffix}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center pb-6">
          <button
            onClick={back}
            className="kypris-btn flex items-center gap-2 px-8 py-2.5 font-ui text-stone-200"
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.5} />
            {ui.backBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
