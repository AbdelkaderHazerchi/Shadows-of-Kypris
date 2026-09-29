"use client";

import { useEffect, useState } from "react";
import { Battery, Crosshair, Flashlight, Package, Radio } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { formatClock } from "./utils";

function Bar({
  w,
  h,
  pct,
  className,
  trackClass = "bg-black/70",
}: {
  w: string;
  h: string;
  pct: number;
  className: string;
  trackClass?: string;
}) {
  return (
    <div className={`${w} ${h} ${trackClass} overflow-hidden rounded-sm border border-stone-700/50`}>
      <div
        className={`h-full rounded-sm transition-[width] duration-200 ${className}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/** شاشة HUD — طبقة عرض فقط، بلا تفاعل، فوق مشهد المحرك */
export default function HUD() {
  // ──Selectors──
  const hp = useGame((g) => g.hud.hp);
  const maxHp = useGame((g) => g.hud.maxHp);
  const stamina = useGame((g) => g.hud.stamina);
  const battery = useGame((g) => g.hud.battery);
  const flashlightOn = useGame((g) => g.hud.flashlightOn);
  const equipped = useGame((g) => g.hud.equipped);
  const pistolMag = useGame((g) => g.hud.pistolMag);
  const shotgunMag = useGame((g) => g.hud.shotgunMag);
  const pistolAmmo = useGame((g) => g.hud.pistolAmmo);
  const shotgunAmmo = useGame((g) => g.hud.shotgunAmmo);
  const reloading = useGame((g) => g.hud.reloading);
  const objective = useGame((g) => g.hud.objective);
  const optionalObjective = useGame((g) => g.hud.optionalObjective);
  const prompt = useGame((g) => g.hud.prompt);
  const hint = useGame((g) => g.hud.hint);
  const hintAt = useGame((g) => g.hud.hintAt);
  const damageAt = useGame((g) => g.hud.damageAt);
  const heartbeat = useGame((g) => g.hud.heartbeat);
  const threat = useGame((g) => g.hud.threat);
  const zone = useGame((g) => g.hud.zone);
  const escapeTimer = useGame((g) => g.hud.escapeTimer);
  const waveTimer = useGame((g) => g.hud.waveTimer);
  const toast = useGame((g) => g.toast);
  const docsCount = useGame((g) => g.docsRead.length);

  // نبضة زمنية كل 250ms لإخفاء العناصر المعتمدة على الوقت
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  // وميض الضرر — يُزال بعد ثانية
  const [damageOn, setDamageOn] = useState(false);
  useEffect(() => {
    if (!damageAt) return;
    setDamageOn(true);
    const t = setTimeout(() => setDamageOn(false), 900);
    return () => clearTimeout(t);
  }, [damageAt]);

  // لافتة المنطقة — تظهر 3.5 ثانية ثم تتلاشى
  const [zoneView, setZoneView] = useState<{ name: string; fade: boolean } | null>(null);
  useEffect(() => {
    if (!zone) return;
    setZoneView({ name: zone, fade: false });
    const t1 = setTimeout(() => setZoneView((v) => (v ? { ...v, fade: true } : v)), 2800);
    const t2 = setTimeout(() => setZoneView(null), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [zone]);

  const lang = useGame((g) => g.lang);
  const c = getContent(lang);
  const ui = c.ui.hud;

  const now = Date.now();
  const hintVisible = hint.length > 0 && now - hintAt < 4500;
  const toastVisible = toast !== null && now - toast.at < 4000;
  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const lowHp = hp < 30;

  const weaponName =
    equipped === "pistol"
      ? c.weapons.pistol.name
      : equipped === "shotgun"
        ? c.weapons.shotgun.name
        : null;
  const mag = equipped === "shotgun" ? shotgunMag : equipped === "pistol" ? pistolMag : 0;
  const reserve = equipped === "shotgun" ? shotgunAmmo : equipped === "pistol" ? pistolAmmo : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none font-ui">
      {/* ── Crosshair ── */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex h-[18px] w-[18px] items-center justify-center rounded-full border border-stone-300/60">
          <div className="absolute h-[2px] w-[2px] rounded-full bg-stone-300/90" />
        </div>
      </div>

      {/* ── Objective (top right) ── */}
      {(objective || optionalObjective) && (
        <div className="kypris-panel absolute right-4 top-4 max-w-xs px-4 py-3">
          <p className="text-xs tracking-wider text-amber-500">{ui.objective}</p>
          <p className="mt-1 text-sm leading-6 text-stone-200">{objective}</p>
          {optionalObjective && (
            <p className="mt-1 text-xs leading-5 text-stone-400">{optionalObjective}</p>
          )}
        </div>
      )}

      {/* ── Document counter (top left) ── */}
      <div className="absolute left-4 top-4 flex items-center gap-1.5 text-stone-500">
        <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span dir="ltr" className="font-mono text-xs">
          {docsCount}/6
        </span>
      </div>

      {/* ── Timers (top center) ── */}
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 flex-col items-center gap-1">
        {escapeTimer >= 0 && (
          <div className="flex flex-col items-center">
            <span dir="ltr" className="kypris-pulse font-mono text-3xl font-bold text-red-400">
              {formatClock(escapeTimer)}
            </span>
            <span className="text-xs text-red-300/80">{ui.beforeExplosion}</span>
          </div>
        )}
        {waveTimer >= 0 && (
          <div className="flex flex-col items-center">
            <span dir="ltr" className="font-mono text-xl font-bold text-amber-400">
              {formatClock(waveTimer)}
            </span>
            <span className="text-xs text-amber-200/70">{ui.teamArrival}</span>
          </div>
        )}
      </div>

      {/* ── Zone banner ── */}
      {zoneView && (
        <div
          className={`absolute left-1/2 top-20 -translate-x-1/2 transition-opacity duration-700 ${
            zoneView.fade ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="kypris-creep font-title text-xl text-stone-300">{zoneView.name}</p>
        </div>
      )}

      {/* ── Toast (upper center) ── */}
      {toastVisible && toast && (
        <div className="absolute left-1/2 top-[22%] w-full -translate-x-1/2 px-6 text-center">
          <p className="kypris-creep inline-block bg-black/45 px-4 py-1 font-title text-2xl text-amber-200">
            {toast.text}
          </p>
        </div>
      )}

      {/* ── Interaction prompt (below crosshair) ── */}
      {prompt.length > 0 && (
        <div className="absolute left-1/2 top-[56%] -translate-x-1/2">
          <p className="rounded border border-amber-900/40 bg-black/60 px-3 py-1 text-sm text-stone-100">
            {prompt}
          </p>
        </div>
      )}

      {/* ── Hint (bottom center) ── */}
      {hintVisible && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <div className="kypris-panel px-4 py-2 text-sm text-amber-200">{hint}</div>
        </div>
      )}

      {/* ── Vitals (bottom left) ── */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-2">
        {/* Health */}
        <div className="flex items-center gap-2">
          <Bar
            w="w-56"
            h="h-3"
            pct={hpPct}
            className="bg-gradient-to-r from-[#7f1d1d] to-[#dc2626]"
          />
          <span dir="ltr" className="font-mono text-[11px] text-stone-400">
            {Math.round(hp)}/{maxHp}
          </span>
        </div>
        {/* Stamina */}
        <div className={`transition-opacity duration-300 ${stamina >= 99 ? "opacity-0" : "opacity-100"}`}>
          <Bar w="w-40" h="h-1.5" pct={stamina} className="bg-amber-600" />
        </div>
        {/* Flashlight & Battery */}
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${flashlightOn ? "opacity-100" : "opacity-40"}`}>
          <Flashlight
            className={`h-3.5 w-3.5 ${battery < 20 && flashlightOn ? "text-red-500" : "text-stone-400"}`}
            strokeWidth={1.5}
          />
          <Bar
            w="w-24"
            h="h-1.5"
            pct={battery}
            className={battery < 20 ? "bg-red-600" : "bg-yellow-600"}
          />
          <Battery
            className={`h-3 w-3 ${flashlightOn ? "text-yellow-600" : "text-stone-700"}`}
            strokeWidth={1.5}
          />
        </div>
        {/* Silent Hill style proximity radio */}
        {threat > 0.08 && (
          <div className="mt-0.5 flex items-center gap-2 text-xs text-red-400/90">
            <Radio className="kypris-pulse h-3.5 w-3.5 text-red-500" strokeWidth={1.6} />
            <div className="flex items-end gap-0.5 h-3">
              {[0.2, 0.38, 0.55, 0.72, 0.88].map((lvl, idx) => (
                <span
                  key={idx}
                  className={`w-1 rounded-xs transition-all duration-150 ${
                    threat >= lvl ? "bg-red-500" : "bg-stone-800"
                  }`}
                  style={{
                    height: `${Math.max(25, Math.min(100, (idx + 1) * 20 * (threat >= lvl ? 0.75 + (now % 200) / 800 : 0.4)))}%`,
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] tracking-wider text-red-300/80">
              {ui.radioStaticNear}
            </span>
          </div>
        )}
      </div>

      {/* ── Weapon (bottom right) ── */}
      <div className="absolute bottom-5 right-5 text-left">
        {reloading ? (
          <p className="kypris-pulse font-ui text-lg text-amber-400">{ui.reloading}</p>
        ) : weaponName ? (
          <div className="flex flex-col items-end">
            <span className="text-xs text-stone-400">{weaponName}</span>
            <span dir="ltr" className="font-mono text-4xl font-bold leading-none text-stone-100">
              {mag}
              <span className="ms-2 align-middle font-mono text-sm font-normal text-stone-500">
                / {reserve}
              </span>
            </span>
            {mag === 0 && reserve > 0 && (
              <span className="kypris-pulse mt-1 flex items-center gap-1.5 text-xs text-amber-400">
                <span dir="ltr" className="rounded border border-amber-700/60 px-1.5 font-mono font-bold">
                  R
                </span>
                {ui.reloadPrompt}
              </span>
            )}
          </div>
        ) : equipped === "crowbar" ? (
          <span className="font-ui text-lg text-stone-300">{ui.crowbarShort}</span>
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

      {/* زخرفة: أيقونة صغيرة خافتة بجانب المؤشر عند تسليح ناري */}
      {equipped === "pistol" || equipped === "shotgun" ? (
        <div className="absolute left-1/2 top-[52.5%] -translate-x-1/2 text-stone-600/70">
          <Crosshair className="h-3 w-3" strokeWidth={1.5} />
        </div>
      ) : null}
    </div>
  );
}
