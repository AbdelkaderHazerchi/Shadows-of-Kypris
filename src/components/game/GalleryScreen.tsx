"use client";

import { useEffect, useState } from "react";
import { Lock, Undo2, Unlock } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { getUnlockedEndings } from "@/lib/game/save";
import { formatClock } from "./utils";
import type { EndingRunRecord } from "@/lib/game/types";

const TONE_TEXT: Record<string, string> = {
  dark: "text-red-700",
  hope: "text-amber-500",
  truth: "text-amber-200",
  grim: "text-stone-300",
};

const TONE_BORDER: Record<string, string> = {
  dark: "border-red-900/60",
  hope: "border-amber-800/60",
  truth: "border-amber-200/40",
  grim: "border-stone-600/50",
};

function parseRuns(data: unknown): EndingRunRecord[] {
  if (Array.isArray(data)) return data as EndingRunRecord[];
  if (data && typeof data === "object" && "runs" in data) {
    const runs = (data as { runs: unknown }).runs;
    if (Array.isArray(runs)) return runs as EndingRunRecord[];
  }
  return [];
}

export default function GalleryScreen() {
  const lang = useGame((s) => s.lang);
  const setScreen = useGame((s) => s.setScreen);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [runs, setRuns] = useState<EndingRunRecord[] | null>(null);

  const c = getContent(lang);
  const ui = c.ui.gallery;

  useEffect(() => {
    const t = setTimeout(() => setUnlocked(getUnlockedEndings()), 0);
    fetch("/api/records")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => setRuns(parseRuns(data)))
      .catch(() => setRuns(null));
    return () => clearTimeout(t);
  }, []);

  const back = () => setScreen("menu");
  const recent = runs ? [...runs].reverse().slice(0, 8) : [];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black">
      <div className="kypris-vignette pointer-events-none fixed inset-0" />
      <div className="kypris-filmgrain pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-center font-title text-4xl font-bold text-stone-100">
          {ui.titlePrefix}
          <span className="text-red-800">{ui.titleHighlight}</span>
        </h2>
        <p className="mt-2 text-center text-xs text-stone-500">
          {ui.subtitle}
        </p>

        {/* Endings Grid */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {c.endings.map((e) => {
            const isOpen = unlocked.includes(e.id);
            return (
              <div
                key={e.id}
                className={`kypris-panel rounded p-4 ${isOpen ? TONE_BORDER[e.tone] : "border-stone-800/70 opacity-80"}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-title text-lg font-bold ${isOpen ? TONE_TEXT[e.tone] : "text-stone-600"}`}
                  >
                    {isOpen ? (
                      e.title
                    ) : (
                      <span className="blur-sm select-none" aria-hidden>
                        ???
                      </span>
                    )}
                  </span>
                  {isOpen ? (
                    <Unlock className="h-4 w-4 shrink-0 text-amber-700" strokeWidth={1.5} />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-stone-700" strokeWidth={1.5} />
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  {isOpen ? e.subtitle : ui.discoverByPlaying}
                </p>
              </div>
            );
          })}
        </div>

        {/* Run History */}
        {runs && runs.length > 0 && (
          <div className="kypris-panel mt-8 rounded p-5">
            <h3 className="mb-3 font-ui text-sm font-bold text-amber-600">
              {ui.serverRuns}{" "}
              <span dir="ltr" className="font-mono text-stone-300">
                {runs.length}
              </span>
            </h3>
            <div className="kypris-scroll overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-500">
                    <th className="px-2 py-2 font-medium">{ui.colEnding}</th>
                    <th className="px-2 py-2 font-medium">{ui.colTime}</th>
                    <th className="px-2 py-2 font-medium">{ui.colKills}</th>
                    <th className="px-2 py-2 font-medium">{ui.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => {
                    const def = c.endingById[r.ending];
                    const known = Boolean(def) && unlocked.includes(r.ending);
                    return (
                      <tr key={i} className="border-b border-stone-900 text-stone-400">
                        <td className={`px-2 py-2 ${known ? TONE_TEXT[def.tone] : "text-stone-600"}`}>
                          {known ? def.title : ui.unknownEnding}
                        </td>
                        <td dir="ltr" className="px-2 py-2 text-left font-mono">
                          {formatClock(r.playSeconds)}
                        </td>
                        <td dir="ltr" className="px-2 py-2 text-left font-mono">
                          {r.kills}
                        </td>
                        <td dir="ltr" className="px-2 py-2 text-left font-mono text-stone-600">
                          {new Date(r.createdAt).toLocaleString(lang === "ar" ? "ar" : "en-US")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
