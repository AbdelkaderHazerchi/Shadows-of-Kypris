"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import type { MapSnapshot } from "@/lib/game/types";

const W = 800;
const H = 560;

// حدود ثابتة لخريطة شادو هافن (تشمل النهر جنوباً)
const MINX = -146;
const MAXX = 146;
const MINZ = -146;
const MAXZ = 168;

// المواقع الثمانية المرقّمة — كما في الخريطة الرسمية للمدينة
const NUMBERED: { n: number; x: number; z: number; name: string }[] = [
  { n: 1, x: -69, z: -69, name: "مجمع كيبريس (المختبر)" },
  { n: 2, x: -23, z: -69, name: "حي شادو هافن السكني" },
  { n: 3, x: -23, z: -23, name: "الساحة الرئيسية" },
  { n: 4, x: -69, z: 23, name: "المستودع" },
  { n: 5, x: -23, z: 23, name: "متجر الأسلحة" },
  { n: 6, x: 69, z: -69, name: "برج الإذاعة" },
  { n: 7, x: 0, z: 104, name: "ميناء بلاك ووتر" },
  { n: 8, x: 69, z: 23, name: "المستشفى" },
];

// مواقع إضافية غير مرقّمة
const EXTRA: { x: number; z: number; name: string }[] = [
  { x: 23, z: -23, name: "مركز الشرطة" },
  { x: -69, z: 69, name: "مصنع القطع" },
  { x: 69, z: 69, name: "محطة الوقود" },
  { x: -106, z: 18, name: "المقبرة" },
];

// أسماء الشوارع (نص، س، ص، أفقي؟)
const STREETS: { t: string; x: number; z: number; horiz: boolean }[] = [
  { t: "شارع جريف — Grave St", x: 30, z: -46, horiz: true },
  { t: "Grave St", x: 40, z: -92, horiz: true },
  { t: "الشارع الرئيسي — Main St", x: 0, z: -20, horiz: false },
  { t: "طريق المختبر — Lab Rd", x: -92, z: -30, horiz: false },
  { t: "طريق الرصيف — Dock Road", x: -40, z: 46, horiz: true },
  { t: "شارع النهر — River St", x: 30, z: 92, horiz: true },
  { t: "Berseast St", x: 92, z: 16, horiz: false },
  { t: "جادة كرافن", x: 46, z: -60, horiz: false },
  { t: "Hospital Dr", x: 30, z: 0, horiz: true },
];

const LEGEND: { label: string; color: string }[] = [
  { label: "أنت", color: "#d6c9a8" },
  { label: "هدف", color: "#f59e0b" },
  { label: "إنقاذ", color: "#10b981" },
  { label: "مختبر", color: "#dc2626" },
];

/** رسم خريطة شادو هافن — إحداثيات العالم (متر) → بكسل، X→X و Z→Y (الشمال أعلى) */
function drawMap(canvas: HTMLCanvasElement | null, snap: MapSnapshot | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scale = Math.min(W / (MAXX - MINX), H / (MAXZ - MINZ));
  const midX = (MINX + MAXX) / 2;
  const midZ = (MINZ + MAXZ) / 2;
  const px = (wx: number) => W / 2 + (wx - midX) * scale;
  const py = (wz: number) => H / 2 + (wz - midZ) * scale;
  const s = (v: number) => v * scale;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  // الخلفية
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, W, H);

  // حدود المدينة
  ctx.fillStyle = "#111114";
  ctx.fillRect(px(-118), py(-118), s(236), s(236));
  ctx.strokeStyle = "#2a2723";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px(-118), py(-118), s(236), s(236));

  if (snap) {
    // ── نهر بلاك ووتر (جنوب) ──
    ctx.fillStyle = "#0c1a21";
    ctx.fillRect(px(-146), py(118), s(292), s(50));
    ctx.strokeStyle = "#1d3a47";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const wy = 126 + i * 9;
      for (let wx = -140; wx <= 140; wx += 8) {
        const yy = py(wy + Math.sin(wx / 9 + i * 2) * 1.4);
        if (wx === -140) ctx.moveTo(px(wx), yy);
        else ctx.lineTo(px(wx), yy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "#2c586e";
    ctx.font = "bold 15px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("نهر بلاك ووتر — BLACKWATER RIVER", px(0), py(145));

    // ── المقبرة الغربية ──
    ctx.fillStyle = "#131410";
    ctx.fillRect(px(-114), py(-7), s(16), s(50));
    ctx.strokeStyle = "#3a382c";
    ctx.strokeRect(px(-114), py(-7), s(16), s(50));
    ctx.fillStyle = "#4a4738";
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 5; c++)
        ctx.fillRect(px(-112 + c * 2.6), py(-3 + r * 2.9), 2.5, 3.5);

    // ── سور مجمع كيبريس ──
    ctx.fillStyle = "rgba(90,20,16,0.16)";
    ctx.fillRect(px(-92), py(-92), s(46), s(46));
    ctx.strokeStyle = "#6b2020";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px(-92), py(-92), s(46), s(46));

    // ── الطرق ──
    ctx.fillStyle = "#1d1d20";
    for (const r of snap.roads) {
      ctx.fillRect(px(r.x - r.w / 2), py(r.z - r.d / 2), s(r.w), s(r.d));
    }
    // الطرق المسدودة
    for (const r of snap.roads) {
      if (!r.blocked) continue;
      const x0 = px(r.x - r.w / 2);
      const y0 = py(r.z - r.d / 2);
      const rw = s(r.w);
      const rh = s(r.d);
      ctx.fillStyle = "#3a0d0d";
      ctx.fillRect(x0, y0, rw, rh);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, rw, rh);
      ctx.clip();
      ctx.strokeStyle = "rgba(139,26,26,0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let o = -rh; o < rw + rh; o += 20) {
        ctx.moveTo(x0 + o, y0);
        ctx.lineTo(x0 + o - rh, y0 + rh);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── المباني ──
    for (const b of snap.buildings) {
      if (b.x > 250) continue; // المختبر تحت الأرض يُستثنى
      const bx = px(b.x - b.w / 2);
      const by = py(b.z - b.d / 2);
      ctx.fillStyle = b.poi ? "#2b261d" : "#232019";
      ctx.fillRect(bx, by, s(b.w), s(b.d));
      ctx.strokeStyle = b.poi ? "#7a5a2e" : "#3d3524";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, s(b.w), s(b.d));
    }

    // ── أسماء الشوارع ──
    ctx.fillStyle = "#57534e";
    ctx.font = "10px Cairo, sans-serif";
    ctx.textAlign = "center";
    for (const st of STREETS) {
      if (st.horiz) {
        ctx.fillText(st.t, px(st.x), py(st.z) + 3);
      } else {
        ctx.save();
        ctx.translate(px(st.x), py(st.z));
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(st.t, 0, 3);
        ctx.restore();
      }
    }

    // ── المواقع الثمانية المرقّمة ──
    for (const p of NUMBERED) {
      const found = snap.buildings.some(
        (b) => b.poi && b.discovered && Math.hypot(b.x - p.x, b.z - p.z) < 30,
      );
      const bx = clamp(px(p.x), 14, W - 14);
      const by = clamp(py(p.z), 14, H - 14);
      ctx.beginPath();
      ctx.arc(bx, by, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = found ? "#7c2d12" : "#1c1917";
      ctx.fill();
      ctx.strokeStyle = found ? "#f59e0b" : "#57534e";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = found ? "#fcd34d" : "#78716c";
      ctx.font = "bold 11px Cairo, sans-serif";
      ctx.fillText(String(p.n), bx, by + 4);
    }

    // ── مواقع إضافية (تظهر عند الاكتشاف) ──
    ctx.font = "10.5px Cairo, sans-serif";
    for (const p of EXTRA) {
      const key = p.name;
      const found = snap.buildings.some((b) => b.poi && b.discovered && b.name === key);
      if (!found) continue;
      const bx = clamp(px(p.x), 20, W - 20);
      const by = clamp(py(p.z), 20, H - 20);
      ctx.beginPath();
      ctx.arc(bx, by, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = "#a8a29e";
      ctx.fill();
      ctx.fillStyle = "#d6c9a8";
      ctx.fillText(p.name, bx, by - 7);
    }

    // أسماء المكتشفة من اللقطة (تحت العلامة)
    ctx.font = "11px Cairo, sans-serif";
    for (const b of snap.buildings) {
      if (!b.poi || !b.discovered || !b.name || b.x > 250) continue;
      const numbered = NUMBERED.find((p) => b.name.includes(p.name.split(" (")[0]) || p.name.includes(b.name));
      if (numbered) continue;
      ctx.fillStyle = "#d6c9a8";
      ctx.fillText(b.name, clamp(px(b.x), 30, W - 30), clamp(py(b.z) - 12, 12, H - 6));
    }

    // ── العلامات الحية ──
    const t = Date.now();
    for (const m of snap.markers) {
      const mx = clamp(px(m.x), 10, W - 10);
      const my = clamp(py(m.z), 10, H - 10);
      if (m.kind === "objective") {
        const r = 8 + Math.sin(t / 280) * 2.4;
        ctx.beginPath();
        ctx.arc(mx, my, r + 7, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(245,158,11,0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (m.kind === "extraction") {
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();
        ctx.strokeStyle = "rgba(209,250,229,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (m.kind === "survivor") {
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (m.kind === "lab") {
        ctx.beginPath();
        ctx.arc(mx, my, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#dc2626";
        ctx.fill();
        ctx.strokeStyle = "rgba(254,202,202,0.75)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#a8a29e";
        ctx.fill();
      }
      if (m.label) {
        ctx.font = "11px Cairo, sans-serif";
        ctx.fillStyle = "rgba(214,201,168,0.9)";
        ctx.fillText(m.label, mx, my + 22);
      }
    }

    // ── اللاعب: سهم يتجه بزاوية النظر ──
    const ppx = clamp(px(snap.player.x), 10, W - 10);
    const ppy = clamp(py(snap.player.z), 10, H - 10);
    ctx.save();
    ctx.translate(ppx, ppy);
    ctx.rotate(Math.PI - snap.player.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fillStyle = "#f5f5f4";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = "#3f3f46";
    ctx.font = "16px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("لا توجد بيانات خريطة — المحرك غير متصل", W / 2, H / 2);
  }

  // ── وردة الرياح (الشمال أعلى) ──
  ctx.save();
  ctx.translate(W - 44, 40);
  ctx.strokeStyle = "#78716c";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(0, -14);
  ctx.moveTo(-9, -5);
  ctx.lineTo(0, -14);
  ctx.lineTo(9, -5);
  ctx.stroke();
  ctx.fillStyle = "#d6c9a8";
  ctx.font = "bold 12px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", 0, -20);
  ctx.restore();
}

/** خريطة شادو هافن — لقطة حية من المحرك */
export default function MapScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<MapSnapshot | null>(null);
  const [hasSnap, setHasSnap] = useState(false);

  const close = () => useGame.getState().setScreen("playing");

  // Tab / Escape / M للإغلاق
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape" || e.key.toLowerCase() === "m") {
        e.preventDefault();
        useGame.getState().setScreen("playing");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // جلب اللقطة كل 600ms + رسم متواصل (لنبض العلامات)
  useEffect(() => {
    const fetchSnap = () => {
      const s = getEngine()?.getMapSnapshot() ?? null;
      snapRef.current = s;
      setHasSnap(s !== null);
    };
    fetchSnap();
    const fid = setInterval(fetchSnap, 600);

    let raf = 0;
    const loop = () => {
      drawMap(canvasRef.current, snapRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      clearInterval(fid);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm">
      <div className="kypris-panel w-[min(880px,94vw)] rounded p-6">
        {/* الترويسة */}
        <div className="mb-4 flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 className="font-title text-2xl font-bold text-stone-100">
            خريطة شادو هافن <span className="text-stone-500">— Shadowhaven City</span>
          </h2>
          <button
            onClick={close}
            className="kypris-btn rounded p-1.5 text-stone-400 hover:text-stone-100"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="h-auto w-full rounded border border-stone-800 bg-black/60 lg:flex-1"
          />

          {/* دفتر المواقع المرقّمة */}
          <div className="w-full shrink-0 lg:w-56">
            <p className="mb-2 border-b border-stone-800 pb-1.5 font-title text-sm font-bold text-stone-300">
              دفتر المدينة
            </p>
            <ol className="space-y-1.5 text-[12px] leading-5 text-stone-400">
              {NUMBERED.map((p) => (
                <li key={p.n} className="flex items-baseline gap-2">
                  <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-amber-700/60 bg-amber-950/40 text-[10px] font-bold text-amber-400">
                    {p.n}
                  </span>
                  <span>{p.name}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 border-t border-stone-800 pt-2">
              {LEGEND.map((l) => (
                <span key={l.label} className="mr-3 inline-flex items-center gap-1.5 text-[11px] text-stone-400">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-stone-600">
          <span dir="ltr" className="font-mono">
            M
          </span>{" "}
          للإغلاق — النقطة الكهرمانية هدفك الحالي، والشمال في الأعلى
        </p>
      </div>
    </div>
  );
}
