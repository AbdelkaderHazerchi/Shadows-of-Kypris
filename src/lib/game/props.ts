"use client";

// ─────────────────────────────────────────────────────────────
// مكتبة النماذج الإجرائية — ظلال كيبريس
// سيارات مفصلة، أثاث حقيقي، دعائم شارع، نماذج التقاط ثلاثية الأبعاد
//
// فلسفة التصميم: كل نموذج مبني من قطع متعددة بتفاصيل حقيقية
// (مقابض، مفصلات، أضواء، تكسّر) بدلاً من المكعبات البدائية.
// الدعائم الساكنة تُدمج في "دلاء" (buckets) لكل مادة → أداء AAA.
// النماذج الحيّة (الالتقاطات/الأبواب/الناجون) تُعاد كمجموعات Groups.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ═══════════════ أنواع مشتركة ═══════════════

/** سياق البناء: يدفع الهندسة إلى دلاء المواد (تُدمج لاحقاً) + المصادمات */
export interface PropCtx {
  /** يدفع geometry إلى دلو مادة — ستُنسخ وتُطبّق المصفوفة */
  push(bucket: string, geo: THREE.BufferGeometry, m: THREE.Matrix4): void;
  collider(minX: number, maxX: number, minZ: number, maxZ: number): void;
}

export interface Mat4Opts {
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/** مصفوفة سريعة: موضع + دوران + مقياس */
export function mat4(x: number, y: number, z: number, o: Mat4Opts = {}): THREE.Matrix4 {
  _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  _q.setFromEuler(_e);
  _v.set(x, y, z);
  _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  return _m4.compose(_v, _q, _s);
}

/** مولّد أرقام شبه عشوائي ثابت البذرة — للمدينة نفسها كل مرة */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 10, 8);

// ═══════════════ خامات الدعائم (دلاء المواد) ═══════════════

function noiseCanvasTex(
  size: number,
  base: string,
  amt: number,
  draw?: (ctx: CanvasRenderingContext2D, s: number) => void,
  repeat = 2,
): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  draw?.(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

export function makePropTextures() {
  const rust = noiseCanvasTex(128, "#3a2c22", 40, (ctx, s) => {
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 4 + Math.random() * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(96,54,22,0.5)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 1);

  const sidewalk = noiseCanvasTex(256, "#2c2c2b", 24, (ctx, s) => {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= s; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 8 + Math.random() * 24;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,0.4)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 3);

  const tile = noiseCanvasTex(256, "#494b47", 14, (ctx, s) => {
    ctx.strokeStyle = "rgba(20,20,20,0.7)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= s; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
    // بقع دم قديمة
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 10 + Math.random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(60,8,8,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 4);

  const woodFloor = noiseCanvasTex(256, "#3d2f21", 22, (ctx, s) => {
    ctx.strokeStyle = "rgba(18,12,6,0.75)";
    ctx.lineWidth = 2;
    for (let y = 0; y <= s; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(${30 + Math.random() * 30},${22 + Math.random() * 18},${12 + Math.random() * 10},0.25)`;
      const y = Math.random() * s;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(s / 3, y + 4, (2 * s) / 3, y - 4, s, y); ctx.stroke();
    }
  }, 3);

  const wallpaper = noiseCanvasTex(256, "#4a4238", 16, (ctx, s) => {
    // شريط جدران باهت
    ctx.fillStyle = "rgba(90,70,50,0.14)";
    for (let x = 0; x < s; x += 42) ctx.fillRect(x, 0, 16, s);
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 12 + Math.random() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(28,20,12,0.5)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 2);

  const hazard = noiseCanvasTex(128, "#8a7a22", 12, (ctx, s) => {
    ctx.fillStyle = "#15130a";
    for (let i = -s; i < s * 2; i += 32) {
      ctx.save();
      ctx.translate(i, 0);
      ctx.rotate(-0.6);
      ctx.fillRect(0, -s, 14, s * 3);
      ctx.restore();
    }
  }, 2);

  const clothDark = noiseCanvasTex(128, "#2d2b26", 26, undefined, 2);

  const glowSoft = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, "rgba(255,200,120,0.55)");
    g.addColorStop(0.5, "rgba(255,170,80,0.18)");
    g.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  return { rust, sidewalk, tile, woodFloor, wallpaper, hazard, clothDark, glowSoft };
}

export type PropTextures = ReturnType<typeof makePropTextures>;

/** دلاء مواد الدعائم — تُدمج مع دلاء world.ts وقت الدمج */
export function makePropMaterials(t: PropTextures): Record<string, THREE.Material> {
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  return {
    // شوارع
    sidewalk: std({ map: t.sidewalk, roughness: 0.94 }),
    paint: std({ color: 0xb8b4a6, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 }),
    lampGlow: std({ color: 0x201406, emissive: 0xe8a850, emissiveIntensity: 3 }),
    // سيارات
    carA: std({ color: 0x5a2c24, roughness: 0.42, metalness: 0.55 }),
    carB: std({ color: 0x454b40, roughness: 0.45, metalness: 0.5 }),
    carC: std({ color: 0x6a5b3a, roughness: 0.5, metalness: 0.4 }),
    carBurned: std({ map: t.rust, color: 0x151312, roughness: 0.95, metalness: 0.2 }),
    carPolice: std({ color: 0x1d2124, roughness: 0.4, metalness: 0.65 }),
    carTaxi: std({ color: 0x8a6a1e, roughness: 0.5, metalness: 0.45 }),
    ambulance: std({ color: 0x9a968c, roughness: 0.45, metalness: 0.5 }),
    glassDark: std({ color: 0x0c0f12, roughness: 0.12, metalness: 0.9 }),
    rubber: std({ color: 0x0d0d0d, roughness: 0.96 }),
    chrome: std({ color: 0x5c6266, roughness: 0.28, metalness: 0.95 }),
    // أثاث وداخلي
    woodFloor: std({ map: t.woodFloor, roughness: 0.8 }),
    tile: std({ map: t.tile, roughness: 0.35, metalness: 0.08 }),
    wallpaper: std({ map: t.wallpaper, roughness: 0.95 }),
    wood2: std({ color: 0x54402a, roughness: 0.78 }),
    fabric: std({ map: t.clothDark, roughness: 0.98 }),
    fabric2: std({ color: 0x4a3830, roughness: 0.98 }),
    white: std({ color: 0xb8b4aa, roughness: 0.6 }),
    plastic: std({ color: 0x2a2c2a, roughness: 0.55 }),
    screenGlow: std({ color: 0x0a1408, emissive: 0x3fae5a, emissiveIntensity: 1.6 }),
    screenGlowAmber: std({ color: 0x140c04, emissive: 0xd08a30, emissiveIntensity: 1.5 }),
    redEmissive: std({ color: 0x1a0606, emissive: 0xc22a1e, emissiveIntensity: 2 }),
    hazard: std({ map: t.hazard, roughness: 0.7 }),
    sheet: std({ color: 0xa8a294, roughness: 0.95 }),
    water: std({ color: 0x0e1a18, roughness: 0.08, metalness: 0.8, transparent: true, opacity: 0.86 }),
    brass: std({ color: 0x7a6134, roughness: 0.35, metalness: 0.85 }),
    goldKey: std({ color: 0xa8843c, roughness: 0.3, metalness: 0.9 }),
    medWhite: std({ color: 0xc9c4b8, roughness: 0.5 }),
    medRed: std({ color: 0x7a1a14, roughness: 0.55, emissive: 0x400806, emissiveIntensity: 0.5 }),
    greenMetal: std({ color: 0x39422f, roughness: 0.6, metalness: 0.4 }),
    jerrycan: std({ color: 0x6a1a14, roughness: 0.6, metalness: 0.35 }),
    trunk: std({ color: 0x241d15, roughness: 0.98 }),
    deadLeaf: std({ color: 0x2a2318, roughness: 1 }),
    canvasTop: std({ color: 0x2c2c24, roughness: 0.95 }),
    // قمة البرج — نفس مادة القرميد لكن أفتح قليلاً ليلمح في الضباب
  };
}

// ═══════════════ مساعد بناء داخلي ═══════════════

class PB {
  constructor(private ctx: PropCtx, private ox = 0, private oy = 0, private oz = 0) {}
  /** إحداثيات محلية → عالمية */
  private toWorld(x: number, y: number, z: number, o: Mat4Opts = {}) {
    // دوران المجموعة حول Y فقط (كل الدعائم محاذاة أو مُدارة من العالم)
    const c = Math.cos(this.grpRy), s = Math.sin(this.grpRy);
    return {
      x: this.ox + x * c + z * s,
      y: this.oy + y,
      z: this.oz - x * s + z * c,
      ry: (o.ry ?? 0) + this.grpRy,
      rx: o.rx ?? 0,
      rz: o.rz ?? 0,
      sx: o.sx ?? 1, sy: o.sy ?? 1, sz: o.sz ?? 1,
    };
  }
  private grpRy = 0;
  group(x: number, y: number, z: number, ry = 0) { this.ox = x; this.oy = y; this.oz = z; this.grpRy = ry; return this; }
  box(bucket: string, x: number, y: number, z: number, w: number, h: number, d: number, o: Mat4Opts = {}) {
    const p = this.toWorld(x, y, z, o);
    this.ctx.push(bucket, BOX, mat4(p.x, p.y, p.z, { ...o, ry: p.ry, rx: p.rx, rz: p.rz, sx: w * p.sx, sy: h * p.sy, sz: d * p.sz }));
    return this;
  }
  /** صندوق بمركز القاع (y = قاعدة) */
  boxB(bucket: string, x: number, y: number, z: number, w: number, h: number, d: number, o: Mat4Opts = {}) {
    return this.box(bucket, x, y + h / 2, z, w, h, d, o);
  }
  cyl(bucket: string, x: number, y: number, z: number, rTop: number, rBot: number, h: number, o: Mat4Opts & { seg?: number } = {}) {
    const p = this.toWorld(x, y, z, o);
    const g = new THREE.CylinderGeometry(rTop, rBot, h, o.seg ?? 10, 1);
    if (o.rx || o.ry || o.rz) {
      g.rotateX(o.rx ?? 0);
      g.rotateY(o.ry ?? 0);
      g.rotateZ(o.rz ?? 0);
    }
    g.translate(p.x, p.y, p.z);
    this.ctx.push(bucket, g, mat4(0, 0, 0));
    return this;
  }
  sph(bucket: string, x: number, y: number, z: number, r: number, o: Mat4Opts = {}) {
    const p = this.toWorld(x, y, z, o);
    this.ctx.push(bucket, UNIT_SPHERE, mat4(p.x, p.y, p.z, { ...o, ry: p.ry, sx: r * p.sx, sy: r * p.sy, sz: r * p.sz }));
    return this;
  }
  /** استنساخ هندسة جاهزة بمصفوفة (للأنابيب المعقدة) */
  geo(bucket: string, geo: THREE.BufferGeometry, x: number, y: number, z: number, o: Mat4Opts = {}) {
    const p = this.toWorld(x, y, z, o);
    const g = geo.clone();
    if (o.rx || o.ry || o.rz) {
      g.rotateX(o.rx ?? 0);
      g.rotateY(o.ry ?? 0);
      g.rotateZ(o.rz ?? 0);
    }
    g.translate(p.x, p.y, p.z);
    this.ctx.push(bucket, g, mat4(0, 0, 0));
    return this;
  }
  /** مصادم AABB بمقاسات محلية (غير مُدار) */
  hit(x: number, z: number, w: number, d: number) {
    const c = Math.cos(this.grpRy), s = Math.sin(this.grpRy);
    const wx = this.ox + x * c + z * s;
    const wz = this.oz - x * s + z * c;
    const ew = Math.abs(c) * w / 2 + Math.abs(s) * d / 2;
    const ed = Math.abs(s) * w / 2 + Math.abs(c) * d / 2;
    this.ctx.collider(wx - ew, wx + ew, wz - ed, wz + ed);
  }
}

// ═══════════════ السيارات ═══════════════

export type CarVariant = "sedan" | "wreck" | "taxi" | "police" | "ambulance" | "van" | "truck";

/**
 * سيارة مفصلة: هيكل + كابينة زجاج + عجلات + مصدّات + مصابيح.
 * الطول على محور Z المحلي (المقدمة نحو +Z بعد الدوران ry).
 */
export function car(w: PropCtx, x: number, z: number, ry = 0, variant: CarVariant = "sedan", seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, ry);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  const bodyBucket =
    variant === "police" ? "carPolice" :
    variant === "taxi" ? "carTaxi" :
    variant === "ambulance" ? "ambulance" :
    variant === "wreck" ? "carBurned" :
    variant === "truck" ? "carB" :
    ["carA", "carB", "carC"][Math.floor(rnd() * 3)];
  const burned = variant === "wreck";

  if (variant === "truck") {
    // شاحنة عسكرية (الميناء)
    p.boxB(bodyBucket, 0, 0.55, -1.2, 2.3, 1.5, 4.6);           // كابينة+حمصة
    p.boxB(bodyBucket, 0, 0.75, 2.2, 2.4, 1.9, 3.6);            // صندوق حمولة
    p.boxB("canvasTop", 0, 2.65, 2.2, 2.3, 0.1, 3.4);           // غطاء قماشي
    p.boxB("chrome", 0, 0.3, 3.9, 2.2, 0.35, 0.2);              // مصدّ أمامي
    for (const [wx, wz] of [[-1.15, 2.9], [1.15, 2.9], [-1.15, -1.5], [1.15, -1.5], [-1.15, -2.6], [1.15, -2.6]] as const) {
      p.cyl("rubber", wx, 0.52, wz, 0.52, 0.52, 0.34, { rx: Math.PI / 2 });
    }
    p.hit(0, 0, 3.2, 8.4);
    return;
  }

  const L = variant === "van" || variant === "ambulance" ? 5.2 : 4.5;
  const W = variant === "van" || variant === "ambulance" ? 2.1 : 1.86;
  const wheelR = 0.34;

  // هيكل سفلي + غطاء محرك وصندوق
  p.boxB(bodyBucket, 0, wheelR * 0.55, 0, W, 0.55, L);
  if (variant === "van" || variant === "ambulance") {
    p.boxB(bodyBucket, 0, wheelR * 0.55 + 0.55, -0.15, W, 1.05, L - 0.5);
    p.boxB("glassDark", 0, wheelR * 0.55 + 1.15, 1.6, W - 0.3, 0.5, 0.1);
  } else {
    p.boxB(bodyBucket, 0, wheelR * 0.55 + 0.55, 0.6, W - 0.15, 0.32, L * 0.32); // غطاء محرك منخفض
    // كابينة
    p.boxB(bodyBucket, 0, wheelR * 0.55 + 0.55, -0.45, W - 0.14, 0.62, L * 0.42);
    // زجاج أمامي/خلفي وجوانب
    p.boxB("glassDark", 0, wheelR * 0.55 + 0.95, -0.45 + L * 0.21, W - 0.2, 0.44, 0.06, { rx: -0.28 });
    p.boxB("glassDark", 0, wheelR * 0.55 + 0.95, -0.45 - L * 0.21, W - 0.2, 0.4, 0.06, { rx: 0.32 });
    p.boxB("glassDark", -(W - 0.12) / 2, wheelR * 0.55 + 0.92, -0.45, 0.05, 0.4, L * 0.36);
    p.boxB("glassDark", (W - 0.12) / 2, wheelR * 0.55 + 0.92, -0.45, 0.05, 0.4, L * 0.36);
    // سقف
    p.boxB(bodyBucket, 0, wheelR * 0.55 + 1.18, -0.45, W - 0.12, 0.07, L * 0.4);
  }
  // شرطة: شريط أبيض + منارة؛ إسعاف: شريط أحمر
  if (variant === "police") {
    p.boxB("white", 0, wheelR * 0.55 + 0.62, 0, W + 0.02, 0.22, L * 0.55);
    p.boxB("redEmissive", -0.32, wheelR * 0.55 + 1.28, -0.45, 0.4, 0.12, 0.3);
    p.boxB("screenGlowAmber", 0.32, wheelR * 0.55 + 1.28, -0.45, 0.4, 0.12, 0.3);
  }
  if (variant === "ambulance") {
    p.boxB("medRed", 0, wheelR * 0.55 + 0.62, 0, W + 0.02, 0.3, L * 0.7);
    p.boxB("white", 0, wheelR * 0.55 + 1.28, -0.15, 0.8, 0.12, 0.5);
  }
  if (variant === "taxi") p.boxB("white", 0, wheelR * 0.55 + 1.24, -0.45, 0.9, 0.14, 0.4);

  // مصدّات + مصابيح
  p.boxB(burned ? "carBurned" : "chrome", 0, 0.34, L / 2 - 0.05, W - 0.1, 0.22, 0.14);
  p.boxB(burned ? "carBurned" : "chrome", 0, 0.34, -L / 2 + 0.05, W - 0.1, 0.22, 0.14);
  if (!burned) {
    p.boxB("lampGlow", -(W / 2 - 0.3), 0.78, L / 2 - 0.02, 0.24, 0.12, 0.06);
    p.boxB("lampGlow", W / 2 - 0.3, 0.78, L / 2 - 0.02, 0.24, 0.12, 0.06);
    p.boxB("medRed", -(W / 2 - 0.28), 0.8, -L / 2 + 0.02, 0.2, 0.1, 0.05);
    p.boxB("medRed", W / 2 - 0.28, 0.8, -L / 2 + 0.02, 0.2, 0.1, 0.05);
  }
  // عجلات (المركبات المحترقة قد تفقد عجلة)
  for (const [wx, wz] of [[-W / 2 + 0.1, L * 0.31], [W / 2 - 0.1, L * 0.31], [-W / 2 + 0.1, -L * 0.31], [W / 2 - 0.1, -L * 0.31]] as const) {
    if (burned && rnd() < 0.2) continue;
    p.cyl("rubber", wx, wheelR, wz, wheelR, wheelR, 0.24, { rx: Math.PI / 2, seg: 10 });
    p.cyl("chrome", wx + (wx > 0 ? 0.13 : -0.13), wheelR, wz, 0.12, 0.12, 0.03, { rx: Math.PI / 2, seg: 8 });
  }
  // محترقة: غطاء محرك مفتوح + انهيار سقف
  if (burned) {
    p.boxB("carBurned", 0.6, wheelR * 0.55 + 1.0, 0.95, W - 0.5, 0.05, L * 0.3, { rz: 0.9, rx: -0.3 });
    if (rnd() < 0.5) p.boxB("rubble", 0, wheelR * 0.55 + 1.24, -0.45, W - 0.2, 0.1, L * 0.35, { ry: 0.1 });
  }
  p.hit(0, 0, W + 0.7, L + 0.6);
}

/** حافلة محترقة تسد الشارع */
export function busWreck(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("carBurned", 0, 0.75, 0, 2.5, 1.7, 9.5);
  p.boxB("glassDark", 0, 2.25, 0, 2.4, 0.9, 8.6);
  p.boxB("carBurned", 0, 2.62, 0, 2.5, 0.12, 9.3);
  for (const [wx, wz] of [[-1.2, 3.1], [1.2, 3.1], [-1.2, -3.1], [1.2, -3.1]] as const) {
    p.cyl("rubber", wx, 0.52, wz, 0.52, 0.52, 0.3, { rx: Math.PI / 2 });
  }
  p.boxB("rubble", 0, 0.1, 4.9, 2.6, 0.5, 1.4);
  p.hit(0, 0, 3.2, 10.4);
}

// ═══════════════ دعائم الشارع ═══════════════

/** عمود إنارة — قد يعمل (مع ضوء) أو ميت */
export function lampPost(w: PropCtx, x: number, z: number, ry = 0, lit = true) {
  const p = new PB(w).group(x, 0, z, ry);
  p.cyl("metal", 0, 2.6, 0, 0.07, 0.11, 5.2);
  p.cyl("metal", 0, 0.05, 0, 0.22, 0.26, 0.14, { seg: 8 });
  p.cyl("metal", 0, 5.15, 0.85, 0.05, 0.05, 1.9, { rx: Math.PI / 2 });
  p.boxB(lit ? "lampGlow" : "metal", 0, 5.02, 1.75, 0.34, 0.1, 0.62);
  p.cyl(lit ? "lampGlow" : "metal", 0, 5.02, 1.75, 0.16, 0.2, 0.12, { seg: 8 });
  p.hit(0, 0, 0.5, 0.5);
}

export function trafficLight(w: PropCtx, x: number, z: number, ry = 0, state: "red" | "green" | "dead" = "dead") {
  const p = new PB(w).group(x, 0, z, ry);
  p.cyl("metal", 0, 2.2, 0, 0.07, 0.1, 4.4);
  p.cyl("metal", 0, 4.3, 0.7, 0.05, 0.05, 1.5, { rx: Math.PI / 2 });
  p.boxB("plastic", 0, 4.05, 1.42, 0.3, 0.85, 0.22);
  const glowBucket = state === "red" ? "redEmissive" : state === "green" ? "screenGlow" : "plastic";
  p.boxB(glowBucket, 0, 4.55, 1.54, 0.16, 0.16, 0.03);
  p.boxB(state === "green" ? "screenGlow" : "plastic", 0, 4.25, 1.54, 0.16, 0.16, 0.03);
  p.hit(0, 0, 0.4, 0.4);
}

export function hydrant(w: PropCtx, x: number, z: number) {
  const p = new PB(w).group(x, 0, z, 0);
  p.cyl("medRed", 0, 0.32, 0, 0.13, 0.16, 0.64, { seg: 8 });
  p.sph("medRed", 0, 0.68, 0, 0.12, { sy: 0.9 });
  p.cyl("medRed", 0, 0.45, 0.15, 0.05, 0.05, 0.12, { rx: Math.PI / 2 });
  p.cyl("medRed", 0, 0.45, -0.15, 0.05, 0.05, 0.12, { rx: Math.PI / 2 });
  p.cyl("chrome", 0, 0.74, 0, 0.035, 0.035, 0.1);
}

export function bench(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0.42, 0, 1.9, 0.07, 0.55);
  p.boxB("wood2", 0, 0.56, -0.24, 1.9, 0.5, 0.06, { rx: -0.15 });
  p.boxB("metal", -0.8, 0.2, 0, 0.08, 0.4, 0.5);
  p.boxB("metal", 0.8, 0.2, 0, 0.08, 0.4, 0.5);
  p.hit(0, 0, 2, 0.7);
}

export function trashBin(w: PropCtx, x: number, z: number) {
  const p = new PB(w).group(x, 0, z, 0);
  p.cyl("metal", 0, 0.35, 0, 0.3, 0.26, 0.72, { seg: 10 });
  p.cyl("plastic", 0, 0.74, 0, 0.32, 0.3, 0.06, { seg: 10 });
  p.hit(0, 0, 0.7, 0.7);
}

export function trashBags(w: PropCtx, x: number, z: number, seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, 0);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
    p.sph("plastic", (rnd() - 0.5) * 1.4, 0.14 + rnd() * 0.1, (rnd() - 0.5) * 1.1, 0.22 + rnd() * 0.12, { sy: 0.75 });
  }
}

export function deadTree(w: PropCtx, x: number, z: number, seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, 0);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  p.cyl("trunk", 0, 1.4, 0, 0.09, 0.16, 2.8, { seg: 7 });
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2;
    const hgt = 1.6 + rnd() * 1.2;
    const len = 0.7 + rnd() * 0.9;
    p.cyl("trunk", Math.cos(a) * len * 0.5, hgt, Math.sin(a) * len * 0.5, 0.02, 0.05, len, { rz: Math.cos(a) * 1.1, rx: -Math.sin(a) * 1.1, seg: 5 });
  }
  p.hit(0, 0, 0.6, 0.6);
}

/** حاجز مروري مخطط (أصفر/أسود) */
export function barrier(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("hazard", 0, 0.55, 0, 1.9, 0.24, 0.07);
  p.boxB("hazard", 0, 0.95, 0, 1.9, 0.24, 0.07);
  p.boxB("metal", -0.85, 0, 0, 0.07, 1.1, 0.4);
  p.boxB("metal", 0.85, 0, 0, 0.07, 1.1, 0.4);
  p.hit(0, 0, 2, 0.5);
}

/** جدول رمل — حاجز عسكري */
export function sandbagWall(w: PropCtx, x: number, z: number, ry = 0, len = 3.4) {
  const p = new PB(w).group(x, 0, z, ry);
  const n = Math.round(len / 0.55);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < n - row; i++) {
      const bx = (i - (n - row - 1) / 2) * 0.56 + (row % 2) * 0.14;
      p.sph("fabric", bx, 0.16 + row * 0.3, (i % 2) * 0.04, 0.3, { sy: 0.55, ry: (i * 7 + row * 3) * 0.35 });
    }
  }
  p.hit(0, 0, len, 0.9);
}

/** لافتة متجر عربية — لوحة مضيئة باسم محل */
export function shopSign(x: number, y: number, z: number, ry: number, text: string, bg = "#1c1410", fg = "#d8a850"): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = fg;
  ctx.font = "bold 30px Cairo, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34);
  // وميض التكسر
  if (Math.random() < 0.4) {
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(Math.random() * 200, 0, 30 + Math.random() * 40, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.8 }),
  );
  m.position.set(x, y, z);
  m.rotation.y = ry;
  return m;
}

/** برج الساعة — معلم المدينة (يعود بعرّافتين تتحركان) */
export function clockTower(w: PropCtx, x: number, z: number): { hands: THREE.Object3D[]; faces: THREE.Group[] } {
  const p = new PB(w).group(x, 0, z, 0);
  const H = 21;
  p.boxB("brick", 0, 0, 0, 6.4, H, 6.4);
  p.boxB("concrete", 0, H, 0, 7.2, 0.6, 7.2);
  p.boxB("brick", 0, H + 0.6, 0, 4.6, 3.2, 4.6);
  p.boxB("concrete", 0, H + 3.8, 0, 5.4, 0.35, 5.4);
  // هرم القمة
  const cone = new THREE.ConeGeometry(3.4, 3.2, 4);
  cone.rotateY(Math.PI / 4);
  cone.translate(x, H + 5.55, z);
  w.push("roof", cone, mat4(0, 0, 0));
  // أعمدة زخرفية في القاعدة
  for (const [ox, oz] of [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]] as const) {
    p.boxB("concrete", ox, 0, oz, 0.7, 4.4, 0.7);
  }
  p.hit(0, 0, 6.8, 6.8);

  // أوجه الساعة الأربعة (شرائح منفصلة قابلة للدوران)
  const hands: THREE.Object3D[] = [];
  const faces: THREE.Group[] = [];
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 0.85 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xb8a86a, emissive: 0x6a5a20, emissiveIntensity: 0.7, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const faceG = new THREE.Group();
    const ry = (i * Math.PI) / 2;
    faceG.rotation.y = ry;
    faceG.position.set(x + Math.sin(ry) * 3.25, H + 1.9, z + Math.cos(ry) * 3.25);
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), faceMat);
    faceG.add(face);
    const hourH = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.03), handMat);
    hourH.position.y = 0.2;
    const hourPivot = new THREE.Group();
    hourPivot.add(hourH);
    const minH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 0.03), handMat);
    minH.position.y = 0.34;
    const minPivot = new THREE.Group();
    minPivot.add(minH);
    faceG.add(hourPivot, minPivot);
    hands.push(hourPivot, minPivot);
    faces.push(faceG);
    faceG.traverse((o) => { if (o instanceof THREE.Mesh) o.userData.noHit = true; });
  }
  return { hands, faces };
}

/** نافورة ساحة */
export function fountain(w: PropCtx, x: number, z: number) {
  const p = new PB(w).group(x, 0, z, 0);
  p.cyl("concrete", 0, 0.42, 0, 2.3, 2.5, 0.84, { seg: 18 });
  p.cyl("water", 0, 0.78, 0, 2.05, 2.05, 0.06, { seg: 18 });
  p.cyl("concrete", 0, 0.84, 0, 0.32, 0.42, 1.3, { seg: 10 });
  p.cyl("concrete", 0, 2.14, 0, 0.7, 0.5, 0.16, { seg: 12 });
  p.hit(0, 0, 5.2, 5.2);
}

// ═══════════════ أثاث داخلي ═══════════════

/** مكتب مع مونيتور وأوراق وأدراج */
export function desk(w: PropCtx, x: number, z: number, ry = 0, withMonitor = true) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0.66, 0, 1.8, 0.07, 0.85);
  p.boxB("wood2", 0, 0.3, -0.3, 1.7, 0.5, 0.5);                     // درج
  p.boxB("metal", -0.8, 0, -0.25, 0.07, 0.66, 0.75);
  p.boxB("metal", 0.8, 0, -0.25, 0.07, 0.66, 0.75);
  if (withMonitor) {
    p.boxB("plastic", 0, 0.7, -0.2, 0.55, 0.06, 0.2);               // قاعدة شاشة
    p.boxB("plastic", 0, 0.95, -0.28, 0.6, 0.4, 0.05, { rx: 0.08 });
    p.boxB("screenGlow", 0, 0.95, -0.25, 0.52, 0.32, 0.02, { rx: 0.08 });
  }
  // أوراق مبعثرة
  p.boxB("paper", 0.45, 0.7, 0.15, 0.24, 0.005, 0.32, { ry: 0.3 });
  p.boxB("paper", -0.4, 0.7, 0.2, 0.24, 0.005, 0.32, { ry: -0.5 });
  p.hit(0, 0, 1.9, 1);
}

export function officeChair(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.cyl("metal", 0, 0.25, 0, 0.26, 0.26, 0.04, { seg: 8 });
  p.cyl("metal", 0, 0.27, 0, 0.04, 0.04, 0.35);
  p.boxB("fabric", 0, 0.45, 0, 0.46, 0.09, 0.46);
  p.boxB("fabric", 0, 0.62, -0.2, 0.44, 0.5, 0.08, { rx: -0.12 });
  p.hit(0, 0, 0.6, 0.6);
}

/** رف مخزن بكرات وبضائع */
export function shelfStocked(w: PropCtx, x: number, z: number, ry = 0, len = 3, stocked = true, seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, ry);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  const buckets = ["wood2", "carA", "carB", "greenMetal", "medWhite"];
  p.boxB("metal", 0, 1.0, 0, len, 2, 0.55);
  p.boxB("metal", -len / 2, 0, 0, 0.07, 2, 0.55);
  p.boxB("metal", len / 2, 0, 0, 0.07, 2, 0.55);
  for (const lvl of [0.28, 0.95, 1.62]) {
    p.boxB("metal", 0, lvl, 0, len, 0.05, 0.55);
    if (stocked) {
      let cx = -len / 2 + 0.3;
      while (cx < len / 2 - 0.3) {
        const bw = 0.3 + rnd() * 0.45;
        const bh = 0.22 + rnd() * 0.3;
        if (rnd() < 0.72) {
          p.boxB(buckets[Math.floor(rnd() * buckets.length)], cx + bw / 2, lvl + 0.03, 0, bw, bh, 0.4, { ry: (rnd() - 0.5) * 0.2 });
        }
        cx += bw + 0.12 + rnd() * 0.2;
      }
    }
  }
  p.hit(0, 0, len + 0.7, 0.7);
}

export function cabinet(w: PropCtx, x: number, z: number, ry = 0, bucket = "wood2") {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB(bucket, 0, 0.5, 0, 1.1, 2, 0.5);
  p.boxB("metal", 0, 0.5, 0.26, 0.9, 1.7, 0.03);
  p.boxB("chrome", 0, 1.3, 0.29, 0.5, 0.04, 0.04);
  p.hit(0, 0, 1.2, 0.6);
}

/** صف خزائن أمنية (شرطة) — إحداها خزانة الأسلحة */
export function lockerRow(w: PropCtx, x: number, z: number, ry = 0, count = 4) {
  const p = new PB(w).group(x, 0, z, ry);
  for (let i = 0; i < count; i++) {
    const bx = (i - (count - 1) / 2) * 0.62;
    p.boxB("greenMetal", bx, 0, 0, 0.58, 2.1, 0.5);
    p.boxB("metal", bx, 1.05, 0.26, 0.5, 1.9, 0.02);
    p.boxB("plastic", bx + 0.18, 1.0, 0.28, 0.05, 0.18, 0.03);
    p.sph("plastic", bx - 0.15, 1.5, 0.27, 0.03);
  }
  p.hit(0, 0, count * 0.62 + 0.2, 0.7);
}

export function bed(w: PropCtx, x: number, z: number, ry = 0, messy = true) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("metal", 0, 0.28, 0, 1.0, 0.22, 2.05);
  p.boxB("fabric2", 0, 0.44, 0, 0.95, 0.16, 2.0);
  p.boxB("sheet", 0, 0.6, 0.55, 0.9, 0.1, 0.85, messy ? { ry: 0.06 } : {});
  p.boxB("fabric2", 0, 0.58, -0.35, 0.95, 0.14, 1.25, messy ? { rz: 0.03, ry: -0.05 } : {});
  p.boxB("metal", 0, 0.3, 1.02, 0.96, 0.5, 0.05);
  p.boxB("metal", 0, 0.3, -1.02, 0.96, 0.62, 0.05);
  p.hit(0, 0, 1.1, 2.2);
}

/** سرير مستشفى بعجلات وملاءة ملطخة */
export function gurney(w: PropCtx, x: number, z: number, ry = 0, bloody = true) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("metal", 0, 0.72, 0, 0.85, 0.07, 2.0);
  p.boxB("white", 0, 0.78, 0, 0.8, 0.1, 1.95);
  if (bloody) p.boxB("medRed", 0.05, 0.89, 0.1, 0.45, 0.015, 0.7, { ry: 0.4 });
  p.boxB("white", 0, 0.8, -1.02, 0.8, 0.42, 0.07, { rx: 0.25 });
  for (const [wx, wz] of [[-0.34, 0.7], [0.34, 0.7], [-0.34, -0.7], [0.34, -0.7]] as const) {
    p.cyl("metal", wx, 0.36, wz, 0.025, 0.025, 0.7);
    p.cyl("rubber", wx, 0.09, wz, 0.09, 0.09, 0.05, { rx: Math.PI / 2, seg: 8 });
  }
  p.hit(0, 0, 1, 2.2);
}

export function ivStand(w: PropCtx, x: number, z: number) {
  const p = new PB(w).group(x, 0, z, 0);
  p.cyl("chrome", 0, 0.9, 0, 0.018, 0.018, 1.8);
  p.cyl("chrome", 0, 0.04, 0, 0.28, 0.28, 0.03, { seg: 8 });
  p.boxB("sheet", 0, 1.62, 0, 0.16, 0.24, 0.08);
  p.boxB("screenGlow", 0.12, 1.55, 0, 0.1, 0.05, 0.03);
}

export function sofa(w: PropCtx, x: number, z: number, ry = 0, len = 2.1) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("fabric", 0, 0.24, 0, len, 0.34, 0.9);
  p.boxB("fabric", 0, 0.6, -0.38, len, 0.7, 0.22, { rx: -0.1 });
  p.boxB("fabric", -len / 2 + 0.12, 0.48, 0, 0.24, 0.34, 0.85);
  p.boxB("fabric", len / 2 - 0.12, 0.48, 0, 0.24, 0.34, 0.85);
  p.boxB("fabric2", -len / 4, 0.46, -0.05, 0.4, 0.14, 0.35, { rx: -0.5 });
  p.hit(0, 0, len + 0.2, 1.1);
}

export function tvSet(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("plastic", 0, 0.25, 0, 1.2, 0.5, 0.4);
  p.boxB("plastic", 0, 0.78, 0, 1.05, 0.62, 0.09);
  p.boxB("plastic", 0, 0.4, 0, 0.1, 0.3, 0.35);
  // شاشة متشققة مظلمة
  p.boxB("glassDark", 0, 0.78, 0.05, 0.92, 0.5, 0.02);
  p.hit(0, 0, 1.3, 0.6);
}

export function coffeeTable(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0.4, 0, 1.1, 0.05, 0.6);
  p.boxB("wood2", 0, 0.18, 0, 1.0, 0.04, 0.5);
  p.boxB("metal", -0.48, 0, 0, 0.05, 0.4, 0.5);
  p.boxB("metal", 0.48, 0, 0, 0.05, 0.4, 0.5);
  p.hit(0, 0, 1.2, 0.7);
}

/** كاونتر مطبخ مع حوض وخزائن علوية */
export function kitchenCounter(w: PropCtx, x: number, z: number, ry = 0, len = 2.4) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0.44, 0, len, 0.88, 0.62);
  p.boxB("white", 0, 0.92, 0, len + 0.06, 0.05, 0.66);
  p.boxB("chrome", -0.4, 0.94, 0, 0.5, 0.03, 0.4);                 // حوض
  p.boxB("wood2", 0, 1.9, -0.1, len, 0.7, 0.38);                   // خزائن علوية
  p.hit(0, 0, len + 0.2, 0.8);
}

export function fridge(w: PropCtx, x: number, z: number, ry = 0, open = false) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("white", 0, 0.9, 0, 0.75, 1.8, 0.72);
  p.boxB("chrome", 0.35, 1.0, 0.38, 0.04, 0.5, 0.04);
  if (open) {
    p.boxB("white", -0.72, 0.9, 0.3, 0.06, 1.74, 0.7, { ry: 1.1 });
  }
  p.hit(0, 0, 0.9, 0.85);
}

export function cratesStack(w: PropCtx, x: number, z: number, ry = 0, seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, ry);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const s = 0.55 + rnd() * 0.35;
    p.boxB(rnd() < 0.7 ? "wood2" : "greenMetal", (rnd() - 0.5) * 0.5, s / 2 + Math.floor(i / 2) * 0.6, (rnd() - 0.5) * 0.5, s, s, s, { ry: rnd() * 0.6 });
  }
  p.hit(0, 0, 1.4, 1.4);
}

export function barrel(w: PropCtx, x: number, z: number, bucket = "greenMetal", tipped = false) {
  const p = new PB(w).group(x, 0, z, 0);
  if (tipped) {
    p.cyl(bucket, 0, 0.45, 0, 0.36, 0.36, 0.95, { rz: Math.PI / 2, seg: 12 });
    p.hit(0, 0, 1.1, 1.1);
  } else {
    p.cyl(bucket, 0, 0.47, 0, 0.36, 0.36, 0.94, { seg: 12 });
    p.cyl(bucket, 0, 0.24, 0, 0.38, 0.38, 0.05, { seg: 12 });
    p.cyl(bucket, 0, 0.7, 0, 0.38, 0.38, 0.05, { seg: 12 });
    p.hit(0, 0, 0.85, 0.85);
  }
}

/** خادم شبكة بمؤشرات مضيئة */
export function serverRack(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("labMetal", 0, 1.1, 0, 0.85, 2.2, 1.1);
  for (let i = 0; i < 6; i++) {
    p.boxB("plastic", 0, 0.25 + i * 0.33, 0.56, 0.75, 0.22, 0.02);
    p.boxB(i % 3 === 0 ? "screenGlow" : i % 3 === 1 ? "screenGlowAmber" : "plastic", -0.22, 0.3 + i * 0.33, 0.58, 0.07, 0.04, 0.01);
    p.boxB(i % 2 === 0 ? "screenGlow" : "plastic", 0.02, 0.3 + i * 0.33, 0.58, 0.07, 0.04, 0.01);
  }
  p.hit(0, 0, 1.0, 1.3);
}

/** آلة تصنيع ضخمة (مكبس) */
export function pressMachine(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("labMetal", 0, 1.5, 0, 2.6, 3, 1.8);
  p.boxB("labMetal", 0, 3.15, 0, 3.0, 0.5, 2.0);
  p.cyl("metal", 0, 2.3, 0, 0.3, 0.3, 1.5);
  p.boxB("metal", 0, 1.45, 0, 1.2, 0.4, 1.0);
  p.boxB("hazard", 0, 0.06, 0.95, 2.4, 0.12, 0.5);
  p.boxB("redEmissive", 0.9, 3.45, 0, 0.12, 0.12, 0.12);
  p.hit(0, 0, 3.2, 2.2);
}

export function conveyor(w: PropCtx, x: number, z: number, ry = 0, len = 5) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("labMetal", 0, 0.72, 0, 0.9, 0.1, len);
  p.boxB("metal", -0.35, 0.36, 0, 0.08, 0.72, len);
  p.boxB("metal", 0.35, 0.36, 0, 0.08, 0.72, len);
  for (let i = 0; i < Math.floor(len / 0.8); i++) {
    p.cyl("rubber", 0, 0.74, -len / 2 + 0.4 + i * 0.8, 0.3, 0.3, 0.04, { rx: Math.PI / 2, seg: 8 });
  }
  p.hit(0, 0, 1.1, len);
}

export function controlPanel(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("labMetal", 0, 0.55, 0, 1.3, 1.1, 0.6);
  p.boxB("labMetal", 0, 1.35, -0.12, 1.3, 0.7, 0.35, { rx: -0.35 });
  p.boxB("screenGlow", 0, 1.4, 0.02, 0.8, 0.4, 0.02, { rx: -0.35 });
  p.sph("redEmissive", 0.45, 0.85, 0.31, 0.035);
  p.sph("screenGlowAmber", 0.32, 0.85, 0.31, 0.035);
  p.hit(0, 0, 1.4, 0.8);
}

export function forklift(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("carC", 0, 0.5, 0.3, 1.15, 0.7, 1.7);
  p.boxB("carC", 0, 1.2, -0.5, 1.05, 1.15, 0.9);
  p.boxB("glassDark", 0, 1.45, -0.45, 0.95, 0.6, 0.06);
  p.boxB("metal", 0, 0.55, 1.15, 0.9, 1.2, 0.09);                  // سارية
  p.boxB("metal", -0.4, 0.28, 1.55, 0.12, 0.08, 0.9);              // شوكة
  p.boxB("metal", 0.4, 0.28, 1.55, 0.12, 0.08, 0.9);
  for (const [wx, wz] of [[-0.55, -0.75], [0.55, -0.75], [-0.55, 0.6], [0.55, 0.6]] as const) {
    p.cyl("rubber", wx, 0.26, wz, 0.26, 0.26, 0.2, { rx: Math.PI / 2, seg: 8 });
  }
  p.hit(0, 0, 1.4, 2.6);
}

export function vending(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("carA", 0, 1.0, 0, 1.0, 2.0, 0.75);
  p.boxB("glassDark", 0, 1.35, 0.39, 0.7, 1.0, 0.03);
  p.boxB("plastic", 0.4, 0.85, 0.39, 0.16, 0.5, 0.06);
  p.hit(0, 0, 1.1, 0.9);
}

/** رف منتجات ملونة (بقالة) */
export function shopShelf(w: PropCtx, x: number, z: number, ry = 0, len = 3.4, seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, ry);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  const buckets = ["medWhite", "carA", "greenMetal", "carTaxi", "medRed"];
  p.boxB("metal", 0, 0.95, 0, len, 1.9, 0.5);
  for (const lvl of [0.3, 0.85, 1.4]) {
    p.boxB("metal", 0, lvl, 0, len, 0.04, 0.5);
    let cx = -len / 2 + 0.25;
    while (cx < len / 2 - 0.25) {
      if (rnd() < 0.8) {
        const s = 0.14 + rnd() * 0.12;
        p.boxB(buckets[Math.floor(rnd() * buckets.length)], cx, lvl + 0.02 + s / 2, 0, s, s * 1.4, s, { ry: 0 });
      }
      cx += 0.2 + rnd() * 0.1;
    }
  }
  p.hit(0, 0, len + 0.6, 0.6);
}

export function counter(w: PropCtx, x: number, z: number, ry = 0, len = 2.6) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0.55, 0, len, 1.1, 0.7);
  p.boxB("wood2", 0, 1.13, 0, len + 0.1, 0.06, 0.8);
  p.boxB("plastic", len / 2 - 0.4, 1.2, 0, 0.3, 0.12, 0.25);       // سجل نقدية
  p.hit(0, 0, len + 0.2, 0.9);
}

/** حامل أسلحة على الجدار (متجر) */
export function gunRack(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 1.5, 0, 2.2, 1.1, 0.08);
  for (let i = 0; i < 3; i++) {
    p.boxB("plastic", -0.6 + i * 0.6, 1.55, 0.05, 0.06, 0.85, 0.04);
    p.boxB("wood2", -0.6 + i * 0.6, 1.2, 0.07, 0.07, 0.3, 0.06);
  }
  p.boxB("metal", 0, 1.98, 0.05, 2.2, 0.05, 0.1);
}

export function turnstile(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("metal", 0, 0.5, 0, 0.12, 1.0, 1.3);
  p.boxB("metal", 0, 0.55, 0, 0.5, 0.25, 0.3);
  p.cyl("chrome", 0, 0.85, 0, 0.02, 0.02, 0.7, { rz: Math.PI / 2 });
  for (let i = 0; i < 3; i++) {
    p.boxB("chrome", 0, 0.88, 0, 0.05, 0.02, 0.34, { ry: (i * Math.PI * 2) / 3 });
  }
}

/** نباتات ميتة في أصص */
export function deadPlant(w: PropCtx, x: number, z: number) {
  const p = new PB(w).group(x, 0, z, 0);
  p.cyl("carB", 0, 0.14, 0, 0.14, 0.11, 0.28, { seg: 8 });
  for (let i = 0; i < 5; i++) {
    p.cyl("deadLeaf", (Math.random() - 0.5) * 0.08, 0.4, (Math.random() - 0.5) * 0.08, 0.008, 0.02, 0.3 + Math.random() * 0.2, { rz: (Math.random() - 0.5) * 0.9, seg: 4 });
  }
}

/** أنابيب على جدار مع صمام */
export function wallPipes(w: PropCtx, x: number, y: number, z: number, ry = 0, len = 6) {
  const p = new PB(w).group(x, y, z, ry);
  p.cyl("metal", 0, 0, 0.3, 0.07, 0.07, len, { rx: Math.PI / 2 });
  p.cyl("metal", 0.22, -0.1, 0.3, 0.05, 0.05, len, { rx: Math.PI / 2 });
  for (let i = 0; i < Math.floor(len / 1.6); i++) {
    p.boxB("metal", 0, 0, 0.3, 0.1, 0.24, 0.1);
  }
  p.cyl("medRed", 0, -0.35, 0.3, 0.14, 0.14, 0.1, { rx: Math.PI / 2 });
  p.cyl("metal", 0, -0.35, 0.3, 0.03, 0.03, 0.3);
}

/** جثة مغطاة بملاءة — أشمل من الجثث العارية */
export function coveredBody(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.sph("sheet", 0, 0.17, 0, 0.34, { sx: 1.7, sy: 1, sz: 1 });
  p.sph("sheet", 0.55, 0.15, 0.05, 0.24, { sy: 0.85 });
  p.boxB("sheet", -0.6, 0.06, 0.12, 0.5, 0.1, 0.2, { ry: 0.3 });
  p.boxB("sheet", -0.35, 0.05, -0.2, 0.45, 0.1, 0.2, { ry: -0.4 });
}

/** كيس جثث */
export function bodyBag(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.sph("plastic", 0, 0.16, 0, 0.32, { sx: 1.8, sy: 0.95, sz: 1 });
  p.boxB("chrome", 0, 0.1, 0.3, 0.3, 0.02, 0.06);
}

// ═══════════════ الناجون (نماذج بشرية حيّة) ═══════════════

export interface SurvivorPose {
  stance: "sit" | "stand" | "lean" | "crouch";
  shirt: number;
  pants: number;
  skin: number;
  hair: number;
}

const SURVIVOR_POSES: Record<string, SurvivorPose> = {
  sara: { stance: "sit", shirt: 0x6a7a72, pants: 0x3a3f3a, skin: 0xb08a6a, hair: 0x201610 },
  adel: { stance: "stand", shirt: 0x4a4436, pants: 0x2c2c30, skin: 0xa87e5e, hair: 0x3a3028 },
  soldier: { stance: "crouch", shirt: 0x3c4034, pants: 0x35392e, skin: 0xa8805e, hair: 0x181410 },
};

/** نموذج ناجٍ — جسم مفصلي بوضعية تعبّ عن حالته */
export function survivorModel(id: string): THREE.Group {
  const pose = SURVIVOR_POSES[id] ?? SURVIVOR_POSES.adel;
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: pose.skin, roughness: 0.9 });
  const shirt = new THREE.MeshStandardMaterial({ color: pose.shirt, roughness: 0.95 });
  const pants = new THREE.MeshStandardMaterial({ color: pose.pants, roughness: 0.95 });
  const hair = new THREE.MeshStandardMaterial({ color: pose.hair, roughness: 1 });

  const mkMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };

  // جذع
  const torso = new THREE.Group();
  torso.add(mkMesh(new THREE.BoxGeometry(0.4, 0.55, 0.24), shirt, 0, 0, 0));
  torso.add(mkMesh(new THREE.BoxGeometry(0.42, 0.18, 0.26), shirt, 0, -0.3, 0));
  // رأس
  const headG = new THREE.Group();
  headG.position.y = 0.42;
  headG.add(mkMesh(new THREE.BoxGeometry(0.22, 0.26, 0.24), skin, 0, 0, 0));
  headG.add(mkMesh(new THREE.BoxGeometry(0.24, 0.1, 0.26), hair, 0, 0.12, -0.01));
  torso.add(headG);
  // ذراعان
  const mkArm = (side: number) => {
    const a = new THREE.Group();
    a.position.set(side * 0.26, 0.18, 0);
    a.add(mkMesh(new THREE.BoxGeometry(0.1, 0.3, 0.11), shirt, 0, -0.15, 0));
    const fore = new THREE.Group();
    fore.position.y = -0.3;
    fore.add(mkMesh(new THREE.BoxGeometry(0.09, 0.3, 0.1), skin, 0, -0.15, 0));
    a.add(fore);
    a.userData.fore = fore;
    return a;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  torso.add(armL, armR);
  // ساقان
  const mkLeg = (side: number) => {
    const l = new THREE.Group();
    l.add(mkMesh(new THREE.BoxGeometry(0.14, 0.42, 0.15), pants, 0, -0.21, 0));
    const shin = new THREE.Group();
    shin.position.y = -0.42;
    shin.add(mkMesh(new THREE.BoxGeometry(0.13, 0.42, 0.14), pants, 0, -0.21, 0));
    l.add(shin);
    l.userData.shin = shin;
    return l;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  if (pose.stance === "sit") {
    torso.position.y = 0.78;
    g.add(torso);
    legL.position.set(-0.11, 0.5, 0);
    legL.rotation.x = -1.4;
    (legL.userData.shin as THREE.Group).rotation.x = 1.5;
    legR.position.set(0.11, 0.5, 0);
    legR.rotation.x = -1.4;
    (legR.userData.shin as THREE.Group).rotation.x = 1.5;
    g.add(legL, legR);
    armL.rotation.x = -1.9;
    (armL.userData.fore as THREE.Group).rotation.x = -1.2;
    armR.rotation.x = -1.9;
    (armR.userData.fore as THREE.Group).rotation.x = -1.2;
    headG.rotation.x = 0.3; // رأس منحنٍ — تعب
  } else if (pose.stance === "crouch") {
    torso.position.y = 0.62;
    torso.rotation.x = 0.35;
    g.add(torso);
    legL.position.set(-0.11, 0.42, 0.05);
    legL.rotation.x = -2.0;
    (legL.userData.shin as THREE.Group).rotation.x = 2.1;
    legR.position.set(0.13, 0.42, -0.1);
    legR.rotation.x = -1.1;
    (legR.userData.shin as THREE.Group).rotation.x = 1.9;
    g.add(legL, legR);
    armL.rotation.x = -0.7;
    armR.rotation.x = -0.4;
    // إصابة: يد على ساقه
    headG.rotation.x = 0.15;
  } else {
    // stand / lean
    torso.position.y = 1.06;
    torso.rotation.x = pose.stance === "lean" ? 0.12 : 0.05;
    g.add(torso);
    legL.position.set(-0.11, 0.94, 0);
    legR.position.set(0.11, 0.94, 0);
    g.add(legL, legR);
    armL.rotation.x = 0.15;
    armR.rotation.x = 0.1;
  }
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.userData.noHit = true;
  });
  return g;
}

// ═══════════════ نماذج الالتقاط ═══════════════

let glowRingMat: THREE.MeshBasicMaterial | null = null;
function getGlowRing(): THREE.Mesh {
  if (!glowRingMat) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, "rgba(232,168,80,0.5)");
    g.addColorStop(1, "rgba(232,168,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    glowRingMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), glowRingMat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  m.userData.noHit = true;
  return m;
}

const stdMat = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);

/**
 * نموذج ثلاثي الأبعاد حقيقي لكل عنصر التقاط — بديل المكعبات.
 * يُرجع Group بحجم واقعي يوضع عند نقطة الالتقاط.
 */
export function pickupModel(data: Record<string, unknown> | undefined): THREE.Group {
  const g = new THREE.Group();
  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = false;
    g.add(mesh);
    return mesh;
  };
  const item = data?.item as string | undefined;
  const weapon = data?.weapon as string | undefined;
  const docId = data?.docId as string | undefined;
  const qty = (data?.qty as number) ?? 1;

  if (weapon === "pistol") {
    const dark = stdMat({ color: 0x2a2d31, roughness: 0.42, metalness: 0.75 });
    const grip = stdMat({ color: 0x191410, roughness: 0.85 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.24), dark);
    slide.position.set(0, 0.045, -0.02);
    const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8), dark);
    barrelTip.rotation.x = Math.PI / 2;
    barrelTip.position.set(0, 0.045, -0.16);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.2), dark);
    frame.position.set(0, 0.005, 0);
    const handleM = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.14, 0.055), grip);
    handleM.position.set(0, -0.075, 0.07);
    handleM.rotation.x = 0.28;
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 10), dark);
    guard.rotation.x = Math.PI / 2;
    guard.position.set(0, -0.015, 0.02);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), dark);
    sight.position.set(0, 0.08, -0.12);
    add(slide); add(barrelTip); add(frame); add(handleM); add(guard); add(sight);
    g.rotation.z = Math.PI / 2;   // مستلقٍ على جانبه
    g.position.y = 0.06;
  } else if (weapon === "shotgun") {
    const dark = stdMat({ color: 0x27221c, roughness: 0.5, metalness: 0.6 });
    const wood = stdMat({ color: 0x4c3420, roughness: 0.75 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.78, 10), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.2);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), dark);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.015, -0.14);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.2, 10), wood);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, 0.015, -0.16);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.2), dark);
    receiver.position.set(0, 0.03, 0.14);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.3), wood);
    stock.position.set(0, 0.0, 0.38);
    stock.rotation.x = -0.08;
    add(barrel); add(tube); add(pump); add(receiver); add(stock);
    g.rotation.z = Math.PI / 2;
    g.rotation.y = 0.4;
    g.position.y = 0.07;
  } else if (item === "medkit") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), stdMat({ color: 0xcfc9bb, roughness: 0.5 }));
    box.position.y = 0.1;
    add(box);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 0.16), stdMat({ color: 0x8a1a12, roughness: 0.5, emissive: 0x2a0402, emissiveIntensity: 0.4 }));
    crossV.position.set(0, 0.203, 0);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 0.06), crossV.material);
    crossH.position.set(0, 0.203, 0);
    add(crossV); add(crossH);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI), stdMat({ color: 0x1c1a16, roughness: 0.7 }));
    handle.position.set(0, 0.2, 0);
    handle.rotation.y = Math.PI / 2;
    add(handle);
    for (const sx of [-0.14, 0.14]) {
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), stdMat({ color: 0x5a5e62, metalness: 0.8, roughness: 0.35 }));
      latch.position.set(sx, 0.18, 0.155);
      add(latch);
    }
    g.position.y = 0;
  } else if (item === "bandage") {
    for (let i = 0; i < Math.min(qty, 3); i++) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 12), stdMat({ color: 0xd8d2c4, roughness: 0.9 }));
      roll.position.set((i - 1) * 0.14, 0.06, (i % 2) * 0.05);
      roll.rotation.z = Math.PI / 2;
      add(roll);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.095, 8), stdMat({ color: 0x8a8578, roughness: 0.9 }));
      inner.position.copy(roll.position);
      inner.rotation.z = Math.PI / 2;
      add(inner);
    }
    g.position.y = 0;
  } else if (item === "food") {
    for (let i = 0; i < Math.min(qty, 3); i++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 12), stdMat({ color: 0x6a6a5e, metalness: 0.8, roughness: 0.4 }));
      can.position.set((i - 1) * 0.13, 0.05, (i % 2) * 0.04);
      add(can);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.055, 12), stdMat({ color: i % 2 ? 0x7a5a28 : 0x5a6a4a, roughness: 0.7 }));
      label.position.copy(can.position);
      add(label);
    }
    g.position.y = 0;
  } else if (item === "battery") {
    for (let i = 0; i < Math.min(qty, 2); i++) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.13, 10), stdMat({ color: 0x24261e, roughness: 0.5, metalness: 0.3 }));
      body.position.set((i - 0.5) * 0.12, 0.065, 0);
      add(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), stdMat({ color: 0xb8a850, metalness: 0.9, roughness: 0.3 }));
      cap.position.set((i - 0.5) * 0.12, 0.135, 0);
      add(cap);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.03, 10), stdMat({ color: 0x8a7a2a, roughness: 0.6 }));
      stripe.position.set((i - 0.5) * 0.12, 0.06, 0);
      add(stripe);
    }
    g.position.y = 0;
  } else if (item === "pistol_ammo" || item === "shotgun_ammo") {
    const shotgun = item === "shotgun_ammo";
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.14, 0.2),
      stdMat({ color: shotgun ? 0x5a2018 : 0x39422f, roughness: 0.55, metalness: 0.3 }),
    );
    box.position.y = 0.07;
    add(box);
    // شريط لاصق بلون
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.04, 0.02), stdMat({ color: shotgun ? 0xb8a850 : 0xb8b4a6, roughness: 0.6 }));
    stripe.position.set(0, 0.07, 0.105);
    add(stripe);
    // رصاص مفتوح من الأعلى
    const nR = Math.min(qty, 4);
    for (let i = 0; i < nR; i++) {
      const round = shotgun
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.07, 8), stdMat({ color: 0x8a2a1a, roughness: 0.5, metalness: 0.4 }))
        : new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 6), stdMat({ color: 0xa8843c, metalness: 0.9, roughness: 0.3 }));
      round.position.set(-0.09 + (i % 4) * 0.06, 0.16, (i < 2 ? -0.03 : 0.03));
      add(round);
    }
    g.position.y = 0;
  } else if (item === "fuel") {
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.2), stdMat({ color: 0x6a1a14, roughness: 0.55, metalness: 0.35 }));
    can.position.y = 0.19;
    add(can);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI), stdMat({ color: 0x241512, roughness: 0.6 }));
    handle.position.set(0, 0.38, 0);
    handle.rotation.y = Math.PI / 2;
    add(handle);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.1, 8), stdMat({ color: 0x241512, roughness: 0.6 }));
    spout.position.set(0.1, 0.42, 0);
    spout.rotation.z = -0.5;
    add(spout);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), stdMat({ color: 0xb8a850, metalness: 0.7, roughness: 0.4 }));
    cap.position.set(-0.08, 0.395, 0);
    add(cap);
    g.position.y = 0;
  } else if (item === "key_tower" || item === "key_locker") {
    const brass = stdMat({ color: item === "key_locker" ? 0x9aa0a6 : 0xa8843c, metalness: 0.9, roughness: 0.3 });
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 14), brass);
    bow.position.y = 0.1;
    add(bow);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.12, 0.008), brass);
    blade.position.y = 0.02;
    add(blade);
    for (let i = 0; i < 2; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.008), brass);
      tooth.position.set(0.02, 0.045 - i * 0.03, 0);
      add(tooth);
    }
    g.rotation.z = 0.7;
    g.position.y = 0.02;
  } else if (item === "keycard_blue" || item === "keycard_red") {
    const blue = item === "keycard_blue";
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 0.115), stdMat({ color: 0xd0ccc0, roughness: 0.4 }));
    card.position.y = 0.01;
    add(card);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.038), stdMat({
      color: blue ? 0x22607a : 0x8a2418, roughness: 0.4,
      emissive: blue ? 0x1a4a60 : 0x6a1a10, emissiveIntensity: 0.9,
    }));
    band.position.set(0, 0.011, -0.03);
    add(band);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.03), stdMat({ color: 0xb8a850, metalness: 0.9, roughness: 0.3 }));
    chip.position.set(-0.05, 0.012, 0.02);
    add(chip);
    g.rotation.y = 0.5;
    g.position.y = 0;
  } else {
    // وثيقة — رزم أوراق مروحة مع كليم
    const paperMat = stdMat({ color: 0xd8cba8, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.004, 0.36), paperMat);
      sheet.position.set(0, 0.01 + i * 0.006, 0);
      sheet.rotation.y = (i - 1) * 0.18;
      add(sheet);
    }
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.03), stdMat({ color: 0x3a3d40, metalness: 0.8, roughness: 0.4 }));
    clip.position.set(0.06, 0.035, -0.1);
    add(clip);
    g.position.y = 0.02;
  }

  // هالة ضوء أرضية خفيفة لإبراز الالتقاط في العتمة
  g.add(getGlowRing());
  return g;
}

// ═══════════════ أبواب ═══════════════

export interface DoorDef {
  group: THREE.Group;
  width: number;
  open: boolean;
  locked: boolean;
  kind: "wood" | "metal" | "double";
}

/**
 * باب حقيقي بمفصلة تُفتح بالتفاعل — يدور حول حافته.
 * الأصل pivot عند الحافة اليسرى (نظرة من الخارج).
 */
export function makeDoor(width = 1.5, style: "wood" | "metal" | "double" = "wood"): DoorDef {
  const group = new THREE.Group();
  const h = 2.35;
  const leafW = style === "double" ? width / 2 : width;
  const mat =
    style === "metal"
      ? stdMat({ color: 0x3a4045, roughness: 0.45, metalness: 0.75 })
      : stdMat({ color: 0x4c3826, roughness: 0.7 });

  const mkLeaf = (w: number) => {
    const leaf = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), mat);
    panel.position.set(w / 2, h / 2, 0);
    panel.castShadow = true;
    leaf.add(panel);
    // تكسير داخلي
    for (let i = 0; i < 2; i++) {
      const inset = new THREE.Mesh(new THREE.BoxGeometry(w - 0.24, h * 0.36, 0.02), style === "metal" ? mat : stdMat({ color: 0x3e2c1c, roughness: 0.75 }));
      inset.position.set(w / 2, h * (0.28 + i * 0.42), 0.045);
      leaf.add(inset);
    }
    // مقبض
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), stdMat({ color: 0x8a8f94, metalness: 0.9, roughness: 0.3 }));
    knob.position.set(w - 0.14, 1.05, 0.06);
    leaf.add(knob);
    // لوحة (للأبواب المزدوجة: شعار)
    leaf.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData.noHit = false;
    });
    return leaf;
  };

  if (style === "double") {
    const l = mkLeaf(leafW);
    const r = mkLeaf(leafW);
    r.scale.x = -1;
    r.position.x = width;
    group.add(l, r);
  } else {
    group.add(mkLeaf(leafW));
  }
  return { group, width, open: false, locked: false, kind: style };
}

// ═══════════════ دمج دلاء الدعائم ═══════════════

/**
 * يدمج كل دلاء PropCtx التي لم تُدمج بعد — تُستدعى مرة واحدة من world.ts
 * مع موادّها، وتضيف mesh لكل دلو إلى المشهد.
 */
export function mergePropBuckets(
  scene: THREE.Scene,
  buckets: Map<string, THREE.BufferGeometry[]>,
  mats: Record<string, THREE.Material>,
  noShadowBuckets = new Set(["glassDark", "paint", "water", "lampGlow"]),
) {
  for (const [bucket, geos] of buckets) {
    if (geos.length === 0) continue;
    const mat = mats[bucket];
    if (!mat) continue;
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = !noShadowBuckets.has(bucket);
    mesh.receiveShadow = true;
    scene.add(mesh);
    geos.forEach((g) => g.dispose());
  }
}
