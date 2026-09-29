"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Undo2 } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import { unlockEnding, getUnlockedEndings, loadCheckpoint } from "@/lib/game/save";
import { formatClock } from "./utils";
import type { EndingRunRecord } from "@/lib/game/types";

const TONE_GLOW: Record<string, string> = {
  dark: "rgba(69,10,10,0.55)",
  hope: "rgba(120,66,10,0.5)",
  truth: "rgba(180,160,110,0.28)",
  grim: "rgba(41,37,36,0.7)",
};

export default function EndScreen() {
  const lang = useGame((g) => g.lang);
  const endingId = useGame((g) => g.endingId);
  const hasSave = useGame((g) => g.hasSave);
  const stats = useGame((g) => g.stats);
  const docs = useGame((g) => g.docsRead.length);
  const survivors = useGame(
    (g) => (g.flags.saraSaved ? 1 : 0) + (g.flags.adelSaved ? 1 : 0) + (g.flags.soldierSaved ? 1 : 0),
  );
  const [totalRuns, setTotalRuns] = useState<number | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const reportedRef = useRef(false);

  const c = getContent(lang);
  const ui = c.ui.ending;

  useEffect(() => {
    if (!endingId || reportedRef.current) return;
    reportedRef.current = true;

    unlockEnding(endingId);
    const t = setTimeout(() => setUnlockedCount(getUnlockedEndings().length), 0);

    const g = useGame.getState();
    const survivorsAtMount =
      (g.flags.saraSaved ? 1 : 0) + (g.flags.adelSaved ? 1 : 0) + (g.flags.soldierSaved ? 1 : 0);
    const payload = {
      ending: endingId,
      playSeconds: g.stats.playSeconds,
      kills: g.stats.kills,
      docs: g.docsRead.length,
      survivors: survivorsAtMount,
    };
    fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => undefined);

    fetch("/api/records")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setTotalRuns(data.length);
        } else if (data && typeof data === "object" && "runs" in data) {
          const runs = (data as { runs: EndingRunRecord[] }).runs;
          if (Array.isArray(runs)) setTotalRuns(runs.length);
        }
      })
      .catch(() => undefined);

    return () => clearTimeout(t);
  }, [endingId]);

  if (!endingId) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black">
        <button
          onClick={() => {
            useGame.getState().resetRun();
            useGame.getState().setScreen("menu");
          }}
          className="kypris-btn px-8 py-3 font-ui text-stone-200"
        >
          {ui.mainMenu}
        </button>
      </div>
    );
  }

  const ending = c.endingById[endingId];

  const paragraphs = ending.body.split("\n\n");
  const titleColor = ending.tone === "truth" ? "text-amber-100" : "text-red-800";

  const statCells: { label: string; value: string }[] = [
    { label: ui.time, value: formatClock(stats.playSeconds) },
    { label: ui.kills, value: String(stats.kills) },
    { label: ui.headshots, value: String(stats.headshots) },
    { label: ui.documents, value: `${docs}/6` },
    { label: ui.survivors, value: `${survivors}/3` },
    { label: ui.damageTaken, value: String(Math.round(stats.damageTaken)) },
  ];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black">
      {/* Tone glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[70vh] w-[120vw] -translate-x-1/2 rounded-full"
        style={{ background: `radial-gradient(ellipse at center, ${TONE_GLOW[ending.tone] ?? TONE_GLOW.dark} 0%, transparent 65%)` }}
      />
      <div className="kypris-vignette pointer-events-none fixed inset-0" />
      <div className="kypris-filmgrain pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-14 text-center">
        <p className="kypris-creep font-ui text-xs tracking-[0.35em] text-stone-600">{ui.headerLabel}</p>
        <h1
          className={`kypris-bloodtext kypris-creep mt-3 font-title text-6xl font-bold leading-tight ${titleColor}`}
          style={{ animationDelay: "150ms" }}
        >
          {ending.title}
        </h1>
        <p className="kypris-creep mt-3 font-title text-xl text-stone-400" style={{ animationDelay: "350ms" }}>
          {ending.subtitle}
        </p>

        {/* Narrative Body */}
        <div className="mt-8 max-w-2xl space-y-4 text-start">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="kypris-creep whitespace-pre-line text-start font-title text-lg leading-8 text-stone-300"
              style={{ animationDelay: `${500 + i * 260}ms` }}
            >
              {p}
            </p>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 md:grid-cols-3">
          {statCells.map((s, i) => (
            <div
              key={s.label}
              className="kypris-creep border border-stone-800/80 bg-black/50 px-3 py-3"
              style={{ animationDelay: `${900 + i * 120}ms` }}
            >
              <p className="text-[11px] text-stone-500">{s.label}</p>
              <p dir="ltr" className="mt-1 font-mono text-lg font-bold text-amber-200/90">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              const eng = getEngine();
              if (eng) eng.quitToMenu();
              else {
                useGame.getState().resetRun();
                useGame.getState().setScreen("menu");
              }
            }}
            className="kypris-btn flex items-center gap-2 px-6 py-3 font-ui text-stone-200"
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.5} />
            {ui.mainMenu}
          </button>

          {(hasSave || Boolean(loadCheckpoint())) && (
            <button
              onClick={() => {
                getEngine()?.continueGame();
              }}
              className="kypris-btn flex items-center gap-2 border-amber-700/70 bg-amber-950/40 px-7 py-3 font-ui text-amber-200"
            >
              <Play className="h-4 w-4" strokeWidth={1.5} />
              {ui.loadLastCheckpoint}
            </button>
          )}

          <button
            onClick={() => {
              const eng = getEngine();
              if (eng) {
                eng.startNewGame();
                eng.startRun();
              } else {
                useGame.getState().resetRun();
                useGame.getState().setScreen("intro");
              }
            }}
            className="kypris-btn flex items-center gap-2 px-7 py-3 font-ui text-red-300"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            {ui.retryFromStart}
          </button>
        </div>

        <div className="mt-6 space-y-1 text-[11px] text-stone-600">
          <p>
            {ui.unlockedEndings}{" "}
            <span dir="ltr" className="font-mono text-amber-800">
              {unlockedCount}/6
            </span>
          </p>
          {totalRuns !== null && (
            <p>
              {ui.runNumberPrefix}
              <span dir="ltr" className="font-mono">
                {totalRuns}
              </span>
              {ui.runNumberSuffix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
