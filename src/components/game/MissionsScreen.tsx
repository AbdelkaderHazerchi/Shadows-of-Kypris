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
} from "lucide-react";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import { ITEMS, OBJECTIVES, SURVIVORS } from "@/lib/game/content";
import type { ItemId } from "@/lib/game/types";

/** سجل المهام — الهدف الرئيسي + المهام الجانبية + الوثائق */
export default function MissionsScreen() {
  const objectiveId = useGame((g) => g.objectiveId);
  const flags = useGame((g) => g.flags);
  const docsRead = useGame((g) => g.docsRead);
  const countItem = useGame((g) => g.countItem);
  const hasLockerKey = useGame((g) => g.hasItem("key_locker"));
  const setScreen = useGame((s) => s.setScreen);

  // إغلاق بلوحة المفاتيح (J / Esc)
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

  const currentIdx = OBJECTIVES.findIndex((o) => o.id === objectiveId);

  const survivors = SURVIVORS.map((s) => {
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="kypris-panel flex max-h-[88vh] w-[min(640px,94vw)] flex-col rounded p-6">
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
          <h2 className="flex items-center gap-3 font-title text-2xl font-bold text-stone-100">
            <ScrollText className="h-6 w-6 text-amber-700" strokeWidth={1.5} />
            سجل المهام
          </h2>
          <button
            onClick={() => {
              setScreen("playing");
              getEngine()?.resume();
            }}
            className="kypris-btn px-4 py-1.5 font-ui text-sm text-stone-300"
          >
            رجوع (J)
          </button>
        </div>

        <div className="kypris-scroll mt-4 flex-1 space-y-6 overflow-y-auto pl-1" style={{ maxHeight: "62vh" }}>
          {/* الهدف الرئيسي */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-sm font-bold tracking-wide text-amber-600">
              <ListChecks className="h-4 w-4" strokeWidth={1.75} />
              الخط الرئيسي
            </h3>
            <ol className="space-y-2">
              {OBJECTIVES.map((o, i) => {
                const done = currentIdx > i;
                const current = currentIdx === i;
                const future = currentIdx < 0 || i > currentIdx;
                return (
                  <li
                    key={o.id}
                    className={`flex items-start gap-3 rounded border px-3 py-2.5 ${
                      current
                        ? "border-amber-800/60 bg-amber-950/25"
                        : done
                          ? "border-stone-800/60 bg-black/20 opacity-55"
                          : "border-stone-800/40 bg-black/10 opacity-40"
                    }`}
                  >
                    {done ? (
                      <BadgeCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" strokeWidth={1.75} />
                    ) : (
                      <CircleDashed
                        className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${current ? "text-amber-500" : "text-stone-600"}`}
                        strokeWidth={1.75}
                      />
                    )}
                    <div className="min-w-0">
                      <p className={`font-ui text-sm leading-6 ${current ? "font-bold text-amber-100" : "text-stone-300"}`}>
                        {future && !current ? "هدف لاحق… اكشفه باللعب" : o.text}
                      </p>
                      {current && o.optional && (
                        <p className="mt-0.5 font-ui text-[11px] text-stone-500">{o.optional}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* مهام الناجين */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-sm font-bold tracking-wide text-amber-600">
              <UserRound className="h-4 w-4" strokeWidth={1.75} />
              مهام الناجين
            </h3>
            <div className="space-y-2">
              {survivors.map(({ def: s, met, saved, have }) => (
                <div
                  key={s.id}
                  className={`rounded border px-3 py-2.5 ${
                    saved
                      ? "border-emerald-900/50 bg-emerald-950/15"
                      : met
                        ? "border-amber-800/50 bg-amber-950/20"
                        : "border-stone-800/50 bg-black/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-ui text-sm font-bold text-stone-200">{s.name}</p>
                    {saved ? (
                      <span className="flex items-center gap-1 font-ui text-[11px] text-emerald-500">
                        <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} />
                        اكتملت
                      </span>
                    ) : met ? (
                      <span className="font-ui text-[11px] text-amber-500">جارية</span>
                    ) : (
                      <span className="font-ui text-[11px] text-stone-500">{s.place}</span>
                    )}
                  </div>
                  {met && !saved && s.quest && (
                    <p className="mt-1 font-ui text-xs leading-5 text-stone-400">
                      يطلب:{" "}
                      <span className="text-stone-200">
                        {ITEMS[s.quest.item].name} ×{s.quest.qty}
                      </span>{" "}
                      — لديك{" "}
                      <span dir="ltr" className={`font-mono ${have >= s.quest.qty ? "text-emerald-500" : "text-amber-500"}`}>
                        {have}/{s.quest.qty}
                      </span>
                      <span className="text-stone-600"> — عد إليه وسلّم ما طلب</span>
                    </p>
                  )}
                  {!met && (
                    <p className="mt-1 font-ui text-xs text-stone-500">زر مكان احتمائه وتحدث معه…</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* مهام ثابتة */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-sm font-bold tracking-wide text-amber-600">
              <KeyRound className="h-4 w-4" strokeWidth={1.75} />
              مهام المدينة
            </h3>
            <div className="space-y-2">
              <LockerMission hasKey={hasLockerKey} opened={flags.lockerOpened} />
            </div>
          </section>

          {/* الوثائق */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-ui text-sm font-bold tracking-wide text-amber-600">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              أدلة الحقيقة
            </h3>
            <p className="rounded border border-stone-800/50 bg-black/15 px-3 py-2.5 font-ui text-xs leading-6 text-stone-400">
              جمعتَ{" "}
              <span dir="ltr" className="font-mono text-amber-500">
                {docsRead.length}/6
              </span>{" "}
              من وثائق كيبريس — الوثائق الست كاملة تفتح النهاية الحقيقية.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

/** مهمة خزانة الأسلحة — مكوّن داخلي */
function LockerMission({ hasKey, opened }: { hasKey: boolean; opened: boolean }) {
  return (
    <div
      className={`rounded border px-3 py-2.5 ${
        opened ? "border-emerald-900/50 bg-emerald-950/15" : "border-amber-800/50 bg-amber-950/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-ui text-sm font-bold text-stone-200">الترسانة المفقودة — مركز الشرطة</p>
        {opened ? (
          <span className="flex items-center gap-1 font-ui text-[11px] text-emerald-500">
            <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} />
            اكتملت
          </span>
        ) : (
          <span className="font-ui text-[11px] text-amber-500">جارية</span>
        )}
      </div>
      <p className="mt-1 font-ui text-xs leading-5 text-stone-400">
        {opened ? (
          "فتحتَ الخزانة وخذ ما فيها. كانت ذخيرة وحدةٍ لم تصل قط."
        ) : (
          <>
            الخطوة {hasKey ? "2" : "1"}:{" "}
            {hasKey ? "عد إلى خزانة الأسلحة في غرفة الأدلة وافتحها" : "ابحث عن مفتاح خزانة الأسلحة في مكاتب التحقيقات"}
          </>
        )}
      </p>
    </div>
  );
}
