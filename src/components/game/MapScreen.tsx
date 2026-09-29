"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getContent, translatePoiName } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import type { Lang, MapSnapshot } from "@/lib/game/types";

const W = 800;
const H = 560;

const MINX = -146;
const MAXX = 146;
const MINZ = -146;
const MAXZ = 168;

function drawMap(canvas: HTMLCanvasElement | null, snap: MapSnapshot | null, lang: Lang) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ui = getContent(lang).ui.map;
  const scale = Math.min(W / (MAXX - MINX), H / (MAXZ - MINZ));
  const midX = (MINX + MAXX) / 2;
  const midZ = (MINZ + MAXZ) / 2;
  const px = (wx: number) => W / 2 + (wx - midX) * scale;
  const py = (wz: number) => H / 2 + (wz - midZ) * scale;
  const s = (v: number) => v * scale;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  // Background
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, W, H);

  // City Bounds
  ctx.fillStyle = "#111114";
  ctx.fillRect(px(-118), py(-118), s(236), s(236));
  ctx.strokeStyle = "#2a2723";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px(-118), py(-118), s(236), s(236));

  if (snap) {
    // ── Blackwater River (South) ──
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
    ctx.fillText(ui.riverLabel, px(0), py(145));

    // ── Western Cemetery ──
    ctx.fillStyle = "#131410";
    ctx.fillRect(px(-114), py(-7), s(16), s(50));
    ctx.strokeStyle = "#3a382c";
    ctx.strokeRect(px(-114), py(-7), s(16), s(50));
    ctx.fillStyle = "#4a4738";
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 5; c++)
        ctx.fillRect(px(-112 + c * 2.6), py(-3 + r * 2.9), 2.5, 3.5);

    // ── Kypris Complex Perimeter ──
    ctx.fillStyle = "rgba(90,20,16,0.16)";
    ctx.fillRect(px(-92), py(-92), s(46), s(46));
    ctx.strokeStyle = "#6b2020";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px(-92), py(-92), s(46), s(46));

    // ── Roads ──
    ctx.fillStyle = "#1d1d20";
    for (const r of snap.roads) {
      ctx.fillRect(px(r.x - r.w / 2), py(r.z - r.d / 2), s(r.w), s(r.d));
    }
    // Blocked roads
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

    // ── Buildings ──
    for (const b of snap.buildings) {
      if (b.x > 250) continue;
      const bx = px(b.x - b.w / 2);
      const by = py(b.z - b.d / 2);
      ctx.fillStyle = b.poi ? "#2b261d" : "#232019";
      ctx.fillRect(bx, by, s(b.w), s(b.d));
      ctx.strokeStyle = b.poi ? "#7a5a2e" : "#3d3524";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, s(b.w), s(b.d));
    }

    // ── Street Names ──
    ctx.fillStyle = "#57534e";
    ctx.font = "10px Cairo, sans-serif";
    ctx.textAlign = "center";
    for (const st of ui.streets) {
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

    // ── 8 Numbered Locations ──
    for (const p of ui.numbered) {
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

    // ── Extra Discovered Locations ──
    ctx.font = "10.5px Cairo, sans-serif";
    for (const p of ui.extra) {
      const found = snap.buildings.some(
        (b) => b.poi && b.discovered && (b.name === p.key || Math.hypot(b.x - p.x, b.z - p.z) < 25),
      );
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

    // Discovered non-numbered / non-extra POI labels
    ctx.font = "11px Cairo, sans-serif";
    for (const b of snap.buildings) {
      const bName = b.name;
      if (!b.poi || !b.discovered || !bName || b.x > 250) continue;
      const inNumbered = ui.numbered.some((p) => Math.hypot(b.x - p.x, b.z - p.z) < 30);
      const inExtra = ui.extra.some((p) => p.key === bName || Math.hypot(b.x - p.x, b.z - p.z) < 25);
      if (inNumbered || inExtra) continue;
      ctx.fillStyle = "#d6c9a8";
      ctx.fillText(
        translatePoiName(bName, lang),
        clamp(px(b.x), 30, W - 30),
        clamp(py(b.z) - 12, 12, H - 6),
      );
    }

    // ── Live Markers ──
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

    // ── Player arrow ──
    const ppx = clamp(px(snap.player.x), 10, W - 10);
    const ppy = clamp(py(snap.player.z), 10, H - 10);
    ctx.save();
    ctx.translate(ppx, ppy);
    ctx.rotate(-snap.player.yaw);
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
    ctx.fillText(ui.noMapData, W / 2, H / 2);
  }

  // ── Compass Rose (North at top) ──
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

export default function MapScreen() {
  const lang = useGame((s) => s.lang);
  const ui = getContent(lang).ui.map;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<MapSnapshot | null>(null);
  const [, setHasSnap] = useState(false);

  const legend = [
    { label: ui.legendPlayer, color: "#f5f5f4" },
    { label: ui.legendDiscovered, color: "#f59e0b" },
    { label: ui.legendBlocked, color: "#8b1a1a" },
  ];

  const close = () => {
    useGame.getState().setScreen("playing");
    getEngine()?.resume();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape" || e.key.toLowerCase() === "m") {
        e.preventDefault();
        useGame.getState().setScreen("playing");
        getEngine()?.resume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      drawMap(canvasRef.current, snapRef.current, useGame.getState().lang);
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
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 className="font-title text-2xl font-bold text-stone-100">
            {ui.title} <span className="text-stone-500">— {ui.subtitle}</span>
          </h2>
          <button
            onClick={close}
            className="kypris-btn rounded p-1.5 text-stone-400 hover:text-stone-100"
            aria-label="Close"
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

          {/* City Directory */}
          <div className="w-full shrink-0 lg:w-56">
            <p className="mb-2 border-b border-stone-800 pb-1.5 font-title text-sm font-bold text-stone-300">
              {ui.directoryTitle}
            </p>
            <ol className="space-y-1.5 text-[12px] leading-5 text-stone-400">
              {ui.numbered.map((p) => (
                <li key={p.n} className="flex items-baseline gap-2">
                  <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-amber-700/60 bg-amber-950/40 text-[10px] font-bold text-amber-400">
                    {p.n}
                  </span>
                  <span>{p.name}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 border-t border-stone-800 pt-2">
              {legend.map((l) => (
                <span key={l.label} className="me-3 inline-flex items-center gap-1.5 text-[11px] text-stone-400">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-stone-500">
          <span dir="ltr" className="font-mono">
            M
          </span>{" "}
          {ui.footerHint}
        </p>
      </div>
    </div>
  );
}
