"use client";

import { BookOpen, Lightbulb, ScrollText } from "lucide-react";
import { CONTROLS, TIPS } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { Undo2 } from "lucide-react";

/** شاشة «كيف تلعب» — التحكم والنصائح والخلفية القصصية */
export default function HelpScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const back = () => setScreen("menu");

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black">
      <div className="kypris-vignette pointer-events-none fixed inset-0" />
      <div className="kypris-filmgrain pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-center font-title text-4xl font-bold text-stone-100">
          كيف <span className="text-red-800">تلعب</span>
        </h2>

        {/* التحكم */}
        <div className="kypris-panel mt-8 rounded p-6">
          <h3 className="mb-4 flex items-center gap-2 font-ui text-lg font-bold text-amber-600">
            <BookOpen className="h-4.5 w-4.5" strokeWidth={1.5} />
            أزرار التحكم
          </h3>
          <div className="grid gap-2.5 md:grid-cols-2">
            {CONTROLS.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <span
                  dir="ltr"
                  className="kypris-btn inline-block shrink-0 px-2 py-1 font-mono text-xs text-stone-200"
                >
                  {c.key}
                </span>
                <span className="text-sm text-stone-400">{c.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* النصائح */}
        <div className="kypris-panel mt-6 rounded p-6">
          <h3 className="mb-4 flex items-center gap-2 font-ui text-lg font-bold text-amber-600">
            <Lightbulb className="h-4.5 w-4.5" strokeWidth={1.5} />
            نصائح للبقاء على قيد الحياة
          </h3>
          <ol className="space-y-2.5">
            {TIPS.map((t, i) => (
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

        {/* الخلفية القصصية */}
        <div className="kypris-panel mt-6 rounded p-6">
          <h3 className="mb-4 flex items-center gap-2 font-ui text-lg font-bold text-amber-600">
            <ScrollText className="h-4.5 w-4.5" strokeWidth={1.5} />
            الخلفية
          </h3>
          <div className="space-y-3 font-title text-base leading-8 text-stone-300">
            <p>
              تستيقظ في بقايا شقتك بلا ذاكرة. بطاقة ممزقة تُسمّيك «جون» — عالم أبحاث في
              مختبرات «كيبريس»، المدينة التي بنيت فيها «كيميرا»: ذكاءً اصطناعياً كان
              معجزة… قبل أن يصمّم بنفسه نهاية العالم.
            </p>
            <p>
              الموتى يسلكون الشوارع، والعسكريون يحضّرون للتطهير النهائي. ستة وثائق
              مبعثرة تحمل الحقيقة الكاملة، وثلاثة نفوس عالقة تنتظر من يأخذها إلى الميناء.
            </p>
            <p>
              كل قرار يصنع نهاية:{" "}
              <span className="text-red-500">ست نهايات مختلفة</span> تنتظر من يجرؤ على
              اكتشافها — هل تدمّر ما صنعته، أم تهرب بما تبقى من إنسانيتك؟
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center pb-6">
          <button
            onClick={back}
            className="kypris-btn flex items-center gap-2 px-8 py-2.5 font-ui text-stone-200"
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.5} />
            رجوع
          </button>
        </div>
      </div>
    </div>
  );
}
