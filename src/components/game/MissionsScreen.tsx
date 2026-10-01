"use client";

import { useEffect } from "react";
import {
  BadgeCheck,
  CircleDashed,
  FileText,
  KeyRound,
  ListChecks,
  ScrollText,
  UserRound,
  X,
} from "lucide-react";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import { getContent } from "@/lib/game/content";
import type { ItemId, Lang } from "@/lib/game/types";

export default function MissionsScreen() {
  const lang = useGame((g) => g.lang);
  const objectiveId = useGame((g) => g.objectiveId);
  const flags = useGame((g) => g.flags);
  const docsRead = useGame((g) => g.docsRead);
  const countItem = useGame((g) => g.countItem);
  const hasLockerKey = useGame((g) => g.hasItem("key_locker"));
  const setScreen = useGame((s) => s.setScreen);

  const c = getContent(lang);
  const ui = c.ui.missions;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyJ" || e.code === "Escape") {
        e.preventDefault();
        setScreen("playing");
        getEngine()?.resume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  const currentIdx = c.objectives.findIndex((o) => o.id === objectiveId);

  const survivors = c.survivors.map((s) => {
    const met =
      (s.id === "sara" && flags.metSara) ||
      (s.id === "adel" && flags.metAdel) ||
      (s.id === "soldier" && flags.metSoldier);
    const saved =
      (s.id === "sara" && flags.saraSaved) ||
      (s.id === "adel" && flags.adelSaved) ||
      (s.id === "soldier" && flags.soldierSaved);
    const have = s.quest ? countItem(s.quest.item as ItemId) : 0;
    return { def: s, met, saved, have };
  });

  const close = () => {
    setScreen("playing");
    getEngine()?.resume();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
      <div className="kypris-panel kypris-hud-corner flex max-h-[88vh] w-[min(680px,95vw)] flex-col rounded-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <ScrollText className="h-5 w-5 text-amber-500" strokeWidth={1.75} />
            <h2 className="font-title text-2xl font-bold tracking-wide text-stone-100">
              {ui.title}
            </h2>
          </div>
          <button
            onClick={close}
            className="kypris-btn flex items-center gap-1.5 rounded px-3 py-1.5 font-ui text-xs text-stone-300 hover:text-stone-100"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            {ui.backBtn}
          </button>
        </div>

        <div
          className="kypris-scroll mt-4 flex-1 space-y-6 overflow-y-auto px-1"
          style={{ maxHeight: "66vh" }}
        >
          {/* Main Storyline */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-xs font-bold tracking-wider text-amber-500 uppercase">
              <ListChecks className="h-4 w-4" strokeWidth={1.75} />
              {ui.mainStoryline}
            </h3>
            <ol className="space-y-2">
              {c.objectives.map((o, i) => {
                const done = currentIdx > i;
                const current = currentIdx === i;
                const future = currentIdx < 0 || i > currentIdx;
                return (
                  <li
                    key={o.id}
                    className={`flex items-start gap-3 rounded border px-3.5 py-2.5 transition-colors ${
                      current
                        ? "border-amber-600/60 bg-amber-950/30 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]"
                        : done
                          ? "border-stone-800/70 bg-black/30 opacity-60"
                          : "border-stone-900/60 bg-black/15 opacity-40"
                    }`}
                  >
                    {done ? (
                      <BadgeCheck
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <CircleDashed
                        className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${
                          current ? "text-amber-400" : "text-stone-600"
                        }`}
                        strokeWidth={1.75}
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`font-ui text-sm leading-6 ${
                          current ? "font-bold text-amber-100" : "text-stone-300"
                        }`}
                      >
                        {future && !current ? ui.futureObjective : o.text}
                      </p>
                      {current && o.optional && (
                        <p className="mt-0.5 font-ui text-[11px] text-amber-400/75">
                          {o.optional}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Survivor Missions */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-xs font-bold tracking-wider text-amber-500 uppercase">
              <UserRound className="h-4 w-4" strokeWidth={1.75} />
              {ui.survivorMissions}
            </h3>
            <div className="space-y-2">
              {survivors.map(({ def: s, met, saved, have }) => (
                <div
                  key={s.id}
                  className={`rounded border px-3.5 py-2.5 ${
                    saved
                      ? "border-emerald-800/50 bg-emerald-950/20"
                      : met
                        ? "border-amber-800/50 bg-amber-950/20"
                        : "border-stone-800/60 bg-black/25 opacity-65"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-ui text-sm font-bold text-stone-100">
                      {met || saved ? s.name : ui.unknownSurvivor}
                    </p>
                    {saved ? (
                      <span className="flex items-center gap-1 rounded border border-emerald-700/40 bg-emerald-950/60 px-2 py-0.5 font-ui text-[10px] font-semibold text-emerald-400">
                        <BadgeCheck className="h-3 w-3" strokeWidth={2} />
                        {ui.completed}
                      </span>
                    ) : met ? (
                      <span className="rounded border border-amber-800/40 bg-amber-950/40 px-2 py-0.5 font-ui text-[10px] text-amber-400">
                        {s.place}
                      </span>
                    ) : (
                      <span className="font-ui text-[11px] text-stone-600">
                        {ui.unknownLocation}
                      </span>
                    )}
                  </div>
                  {met && !saved && s.quest && (
                    <p className="mt-1.5 font-ui text-xs leading-5 text-stone-300">
                      {ui.requestsLabel}{" "}
                      <span className="font-semibold text-amber-200">
                        {c.items[s.quest.item].name} ×{s.quest.qty}
                      </span>{" "}
                      — {ui.youHaveLabel}{" "}
                      <span
                        dir="ltr"
                        className={`font-mono font-bold ${
                          have >= s.quest.qty ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {have}/{s.quest.qty}
                      </span>
                      <span className="text-stone-500"> {ui.deliverHint}</span>
                    </p>
                  )}
                  {!met && !saved && (
                    <p className="mt-1 font-ui text-xs text-stone-500">
                      {ui.exploreSurvivorsHint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* City Missions */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-xs font-bold tracking-wider text-amber-500 uppercase">
              <KeyRound className="h-4 w-4" strokeWidth={1.75} />
              {ui.cityMissions}
            </h3>
            <div className="space-y-2">
              <LockerMission hasKey={hasLockerKey} opened={flags.lockerOpened} lang={lang} />
            </div>
          </section>

          {/* Truth Evidence */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-xs font-bold tracking-wider text-amber-500 uppercase">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              {ui.truthEvidence}
            </h3>
            <div className="flex items-center justify-between rounded border border-stone-800/70 bg-black/30 px-3.5 py-2.5">
              <p className="font-ui text-xs leading-6 text-stone-300">
                {ui.docsCollectedPrefix}{" "}
                <span dir="ltr" className="font-mono font-bold text-amber-400">
                  {docsRead.length}/6
                </span>{" "}
                {ui.docsCollectedSuffix}
              </p>
              <div className="flex gap-1" dir="ltr">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 w-3 rounded-[1px] ${
                      idx < docsRead.length ? "bg-amber-500" : "bg-stone-800"
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LockerMission({
  hasKey,
  opened,
  lang,
}: {
  hasKey: boolean;
  opened: boolean;
  lang: Lang;
}) {
  const ui = getContent(lang).ui.missions;
  return (
    <div
      className={`rounded border px-3.5 py-2.5 ${
        opened
          ? "border-emerald-800/50 bg-emerald-950/20"
          : "border-amber-800/50 bg-amber-950/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-ui text-sm font-bold text-stone-100">{ui.lockerTitle}</p>
        {opened ? (
          <span className="flex items-center gap-1 rounded border border-emerald-700/40 bg-emerald-950/60 px-2 py-0.5 font-ui text-[10px] font-semibold text-emerald-400">
            <BadgeCheck className="h-3 w-3" strokeWidth={2} />
            {ui.completed}
          </span>
        ) : (
          <span className="rounded border border-amber-800/40 bg-amber-950/40 px-2 py-0.5 font-ui text-[10px] text-amber-400">
            {ui.inProgress}
          </span>
        )}
      </div>
      <p className="mt-1 font-ui text-xs leading-5 text-stone-300">
        {opened ? ui.lockerDoneDesc : hasKey ? ui.lockerStep2 : ui.lockerStep1}
      </p>
    </div>
  );
}
