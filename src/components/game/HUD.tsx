"use client";

import { useEffect, useState } from "react";
import { FastForward, Film, Flashlight, Heart } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { CUTSCENE_DEFS, type CutsceneId } from "@/lib/game/cutscenes";
import { getEngine } from "@/lib/game/engineRef";
import { useGame } from "@/lib/game/state";
import { formatClock } from "./utils";

/** واجهة لعب نظيفة وشفافة بدون أي إطارات — تعرض فقط الصحة، بطارية المصباح، ونوع السلاح المحمول، أو شاشة الترجمة أثناء المشاهد السينمائية */
export default function HUD() {
  const hp = useGame((g) => g.hud.hp);
  const maxHp = useGame((g) => g.hud.maxHp);
  const battery = useGame((g) => g.hud.battery);
  const flashlightOn = useGame((g) => g.hud.flashlightOn);
  const crouching = useGame((g) => g.hud.crouching);
  const hidden = useGame((g) => g.hud.hidden);
  const equipped = useGame((g) => g.hud.equipped);
  const stickHits = useGame((g) => g.hud.stickHits);
  const stickMaxHits = useGame((g) => g.hud.stickMaxHits);
  const pistolMag = useGame((g) => g.hud.pistolMag);
  const shotgunMag = useGame((g) => g.hud.shotgunMag);
  const pistolAmmo = useGame((g) => g.hud.pistolAmmo);
  const shotgunAmmo = useGame((g) => g.hud.shotgunAmmo);
  const reloading = useGame((g) => g.hud.reloading);
  const prompt = useGame((g) => g.hud.prompt);
  const hint = useGame((g) => g.hud.hint);
  const hintAt = useGame((g) => g.hud.hintAt);
  const damageAt = useGame((g) => g.hud.damageAt);
  const healAt = useGame((g) => g.hud.healAt);
  const heartbeat = useGame((g) => g.hud.heartbeat);
  const threat = useGame((g) => g.hud.threat);
  const zone = useGame((g) => g.hud.zone);
  const escapeTimer = useGame((g) => g.hud.escapeTimer);
  const waveTimer = useGame((g) => g.hud.waveTimer);
  const toast = useGame((g) => g.toast);
  const weapons = useGame((g) => g.weapons);
  const lang = useGame((g) => g.lang);
  const cutscene = useGame((g) => g.cutscene);

  // نبضة زمنية لإخفاء التنبيهات النصية المؤقتة
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // وميض الضرر والعلاج
  const damageOn = damageAt > 0 && now - damageAt < 800;
  const healOn = healAt > 0 && now - healAt < 650;

  // اسم المنطقة عند دخولها (نص نظيف بدون إطار يختفي تلقائياً)
  const [zoneView, setZoneView] = useState<{ name: string; fade: boolean } | null>(null);
  useEffect(() => {
    if (!zone) return;
    const t0 = setTimeout(() => setZoneView({ name: zone, fade: false }), 0);
    const t1 = setTimeout(() => setZoneView((v) => (v ? { ...v, fade: true } : v)), 2500);
    const t2 = setTimeout(() => setZoneView(null), 3200);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [zone]);

  const c = getContent(lang);
  const ui = c.ui.hud;

  const hintVisible = hint.length > 0 && now - hintAt < 4500;
  const toastVisible = toast !== null && now - toast.at < 3800;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const batPct = Math.max(0, Math.min(100, battery));
  const lowHp = hp < 30;

  const isFirearm = equipped === "pistol" || equipped === "shotgun";
  const isStick = equipped === "crowbar" && weapons.crowbar && stickHits > 0;
  const weaponName =
    equipped === "pistol"
      ? c.weapons.pistol.name
      : equipped === "shotgun"
        ? c.weapons.shotgun.name
        : isStick
          ? c.weapons.crowbar.name
          : ui.unarmedLabel;

  const mag = equipped === "shotgun" ? shotgunMag : equipped === "pistol" ? pistolMag : 0;
  const reserve = equipped === "shotgun" ? shotgunAmmo : equipped === "pistol" ? pistolAmmo : 0;
  const stickPct = stickMaxHits > 0 ? Math.max(0, Math.min(100, (stickHits / stickMaxHits) * 100)) : 0;

  if (cutscene) {
    const def = CUTSCENE_DEFS[cutscene.id as CutsceneId];
    const sceneTitle = def?.title[lang] ?? "";
    const skipLabel = lang === "ar" ? "تخطي المشهد [Space / Esc]" : "Skip Cutscene [Space / Esc]";
    const whiteout = Math.max(0, Math.min(1, cutscene.whiteout ?? 0));

    return (
      <div className="pointer-events-none fixed inset-0 z-30 select-none font-ui">
        {/* وميض الشاشة البيضاء السينمائي القوي لحظة الانفجار النووي */}
        {whiteout > 0.01 && (
          <div
            className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-75"
            style={{
              opacity: whiteout,
              boxShadow: "inset 0 0 120px rgba(255,245,220,1)",
            }}
          />
        )}

        {/* شريط سينمائي علوي مع عنوان المشهد وزر التخطي */}
        <div className="pointer-events-auto relative z-10 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/55 to-transparent px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Film className="h-4 w-4 text-amber-500/80" strokeWidth={1.6} />
            <span dir={lang === "ar" ? "rtl" : "ltr"}>{sceneTitle}</span>
          </div>
          <button
            type="button"
            onClick={() => getEngine()?.skipCutscene()}
            className="flex items-center gap-1.5 rounded border border-stone-700/80 bg-black/70 px-3 py-1.5 text-xs text-stone-300 transition hover:border-amber-600/80 hover:text-amber-200"
          >
            <FastForward className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.7} />
            <span>{skipLabel}</span>
          </button>
        </div>

        {/* شريط سينمائي سفلي يعرض الترجمة حسب اللغة (3.5 ثانية لكل جملة) */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end bg-gradient-to-t from-black/95 via-black/70 to-transparent px-6 pb-8 pt-14">
          {cutscene.subtitle && (
            <div
              dir={lang === "ar" ? "rtl" : "ltr"}
              className="w-[min(820px,92vw)] rounded-md border border-stone-800/80 bg-black/80 px-6 py-4 text-center shadow-[0_6px_30px_rgba(0,0,0,0.95)] backdrop-blur-xs"
            >
              <p className="font-title text-lg leading-8 text-amber-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.98)] md:text-xl">
                {cutscene.subtitle}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-800" dir="ltr">
                  <div
                    className="h-full rounded-full bg-amber-500/85 transition-[width] duration-150"
                    style={{ width: `${Math.round(cutscene.progress * 100)}%` }}
                  />
                </div>
                <span dir="ltr" className="font-mono text-[11px] text-stone-400">
                  {cutscene.index + 1} / {cutscene.total}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none font-ui">
      {/* ── نقطة التصويب المركزية النظيفة (تتحول للأخضر الهادئ عند الاختباء خلف غطاء) ── */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`rounded-full transition-all duration-200 ${
            hidden
              ? "h-1.5 w-1.5 bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
              : crouching
                ? "h-1 w-1 bg-amber-200/75 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
                : "h-1 w-1 bg-white/60 shadow-[0_0_4px_rgba(0,0,0,0.9)]"
          }`}
        />
      </div>

      {/* ── عداد الطوارئ النهائي عند الهروب أو الموجة (نص نظيف بدون إطار) ── */}
      {(escapeTimer >= 0 || waveTimer >= 0) && (
        <div className="absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center gap-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          {escapeTimer >= 0 && (
            <div className="flex flex-col items-center">
              <span dir="ltr" className="kypris-pulse font-mono text-2xl font-bold text-red-400">
                {formatClock(escapeTimer)}
              </span>
              <span className="text-[11px] text-red-200/80">{ui.beforeExplosion}</span>
            </div>
          )}
          {waveTimer >= 0 && (
            <div className="flex flex-col items-center">
              <span dir="ltr" className="font-mono text-xl font-bold text-amber-300">
                {formatClock(waveTimer)}
              </span>
              <span className="text-[11px] text-amber-200/80">{ui.teamArrival}</span>
            </div>
          )}
        </div>
      )}

      {/* ── اسم المنطقة عند اكتشافها (نص سينمائي بدون إطار) ── */}
      {zoneView && (
        <div
          className={`absolute left-1/2 top-16 -translate-x-1/2 transition-opacity duration-700 ${
            zoneView.fade ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="font-title text-2xl tracking-wide text-stone-200/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            {zoneView.name}
          </p>
        </div>
      )}

      {/* ── رسائل التنبيه السريعة (بدون إطار) ── */}
      {toastVisible && toast && (
        <div className="absolute left-1/2 top-[22%] w-full max-w-xl -translate-x-1/2 px-6 text-center">
          <p className="kypris-creep font-title text-xl text-amber-100/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {toast.text}
          </p>
        </div>
      )}

      {/* ── تفاعل [E] أسفل نقطة التصويب (نص نظيف بدون إطار) ── */}
      {prompt.length > 0 && (
        <div className="absolute left-1/2 top-[56%] -translate-x-1/2 text-center">
          <p className="text-sm font-medium text-stone-100/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            {prompt}
          </p>
        </div>
      )}

      {/* ── التلميحات والحوارات السفلية (ترجمة سينمائية بدون إطار) ── */}
      {hintVisible && (
        <div className="absolute bottom-20 left-1/2 w-[min(560px,90vw)] -translate-x-1/2 text-center">
          <p className="text-sm leading-6 text-amber-100/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {hint}
          </p>
        </div>
      )}

      {/* ── أسفل اليسار: الصحة + شريط بطارية المصباح فقط (بدون أي إطارات) ── */}
      <div
        className="absolute bottom-6 left-6 flex flex-col gap-2.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
        dir="ltr"
      >
        {/* 1. شريط الصحة */}
        <div className="flex items-center gap-2.5">
          <Heart
            className={`h-4 w-4 shrink-0 ${
              lowHp ? "kypris-pulse text-red-500" : "text-red-500/85"
            }`}
            strokeWidth={2}
          />
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                lowHp ? "bg-red-500" : "bg-red-500/90"
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span
            className={`font-mono text-xs font-semibold tabular-nums ${
              lowHp ? "text-red-400" : "text-stone-200/90"
            }`}
          >
            {Math.round(hp)}
          </span>
        </div>

        {/* 2. شريط بطارية المصباح */}
        <div
          className={`flex items-center gap-2.5 transition-opacity ${
            flashlightOn ? "opacity-95" : "opacity-50"
          }`}
        >
          <Flashlight
            className={`h-4 w-4 shrink-0 ${
              battery < 20 && flashlightOn
                ? "text-red-400"
                : flashlightOn
                  ? "text-amber-300"
                  : "text-stone-400"
            }`}
            strokeWidth={1.8}
          />
          <div className="h-1 w-28 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                battery < 20 ? "bg-red-500" : "bg-amber-300/90"
              }`}
              style={{ width: `${batPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── أسفل اليمين: نوع السلاح المحمول فقط (بدون أي إطارات) ── */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
        <span className="text-sm font-semibold tracking-wide text-stone-200/95">
          {weaponName}
        </span>

        {reloading ? (
          <span className="kypris-pulse text-xs text-amber-300/90">{ui.reloading}</span>
        ) : isFirearm ? (
          <div className="flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
            <span className="text-lg font-bold text-stone-100">{mag}</span>
            <span className="text-xs text-stone-400">/ {reserve}</span>
          </div>
        ) : isStick ? (
          <div className="flex items-center gap-2" dir="ltr">
            <div className="h-1 w-20 overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${
                  stickHits <= 2 ? "bg-red-500" : "bg-amber-400/85"
                }`}
                style={{ width: `${stickPct}%` }}
              />
            </div>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                stickHits <= 2 ? "text-red-400" : "text-stone-300/85"
              }`}
            >
              {stickHits}/{stickMaxHits}
            </span>
          </div>
        ) : null}
      </div>

      {/* ── وميض الضرر ── */}
      {damageOn && (
        <div
          key={damageAt}
          className="kypris-damage absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(140,10,10,0.55) 100%)",
          }}
        />
      )}

      {/* ── وميض العلاج ── */}
      {healOn && (
        <div
          key={healAt}
          className="kypris-damage absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(16,140,90,0.28) 100%)",
          }}
        />
      )}

      {/* ── الصحة الحرجة: نبض قلب ── */}
      {lowHp && (
        <div
          className={`kypris-heartbeat absolute inset-0 ${heartbeat ? "opacity-100" : "opacity-70"}`}
          style={{
            boxShadow: heartbeat
              ? "inset 0 0 160px rgba(127,0,0,0.9), inset 0 0 60px rgba(90,0,0,0.8)"
              : "inset 0 0 130px rgba(127,0,0,0.65)",
          }}
        />
      )}

      {/* ── حواف التهديد ── */}
      {threat > 0.45 && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 190px rgba(139,26,26,${(((threat - 0.45) / 0.55) * 0.75).toFixed(2)})`,
          }}
        />
      )}
    </div>
  );
}
