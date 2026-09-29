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

/** مصفوفة سريعة: موضع + دوران + مقياس (بترتيب YXZ ليدور حول المحور المحلي ثم محور Y العالمي) */
export function mat4(x: number, y: number, z: number, o: Mat4Opts = {}): THREE.Matrix4 {
  _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
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
    glassWindow: std({
      color: 0x6c90aa,
      roughness: 0.14,
      metalness: 0.25,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
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
    if (o.rx || o.rz || p.ry) {
      if (o.rz) g.rotateZ(o.rz);
      if (o.rx) g.rotateX(o.rx);
      if (p.ry) g.rotateY(p.ry);
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
    if (o.rx || o.rz || p.ry) {
      if (o.rz) g.rotateZ(o.rz);
      if (o.rx) g.rotateX(o.rx);
      if (p.ry) g.rotateY(p.ry);
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

/** مكتب تنفيذي/مكتبي واقعي مع وحدة أدراج وحاسب وشاشة ومصباح وأوراق */
export function desk(w: PropCtx, x: number, z: number, ry = 0, withMonitor = true) {
  const p = new PB(w).group(x, 0, z, ry);
  // 1) وحدة الأدراج اليمنى والقاعدة اليسرى (تجلس على الأرض مباشرة y=0)
  p.boxB("wood2", -0.62, 0, 0, 0.46, 0.72, 0.82);
  p.boxB("wood2", 0.62, 0, 0, 0.46, 0.72, 0.82);
  // لوح الساتر الخلفي بين القاعدتين (Modesty Panel)
  p.boxB("wood2", 0, 0.14, -0.34, 0.82, 0.58, 0.05);
  // واجهات الأدراج ومقابض الكروم
  for (let i = 0; i < 3; i++) {
    const dy = 0.08 + i * 0.21;
    p.boxB("woodFloor", 0.62, dy, 0.415, 0.40, 0.18, 0.02);
    p.boxB("chrome", 0.62, dy + 0.08, 0.43, 0.12, 0.02, 0.02);
  }
  // باب الخزانة اليسرى + صندوق الحاسب المكتبي
  p.boxB("woodFloor", -0.62, 0.08, 0.415, 0.40, 0.60, 0.02);
  p.boxB("chrome", -0.48, 0.38, 0.43, 0.02, 0.14, 0.02);

  // 2) سطح المكتب الخشبي المشطوف + رقعة جلدية وسطية
  p.boxB("wood2", 0, 0.72, 0, 1.88, 0.055, 0.90);
  p.boxB("plastic", 0, 0.775, 0.06, 0.86, 0.008, 0.48);

  if (withMonitor) {
    // قاعدة الشاشة وحامل الرقبة المعدني المتصل بالشاشة
    p.boxB("plastic", 0, 0.78, -0.22, 0.28, 0.022, 0.20);
    p.boxB("metal", 0, 0.80, -0.25, 0.06, 0.16, 0.04);
    // إطار الشاشة المسطحة + الشاشة المضيئة
    p.boxB("plastic", 0, 0.91, -0.21, 0.64, 0.38, 0.04, { rx: 0.05 });
    p.boxB("screenGlow", 0, 0.93, -0.185, 0.58, 0.32, 0.015, { rx: 0.05 });
    // لوحة المفاتيح والفأرة على الرقعة الجلدية
    p.boxB("plastic", -0.04, 0.78, 0.08, 0.42, 0.018, 0.15);
    p.boxB("plastic", 0.28, 0.78, 0.08, 0.07, 0.018, 0.11);
  }
  // مصباح مكتبي صغير وملفات وأوراق منظمة على الجانب
  p.cyl("brass", -0.68, 0.79, -0.22, 0.09, 0.11, 0.03);
  p.cyl("brass", -0.68, 0.95, -0.22, 0.015, 0.015, 0.30);
  p.cyl("greenMetal", -0.62, 1.08, -0.18, 0.08, 0.13, 0.09, { rz: -0.25 });
  p.boxB("paper", 0.56, 0.78, 0.12, 0.24, 0.012, 0.32, { ry: 0.18 });
  p.boxB("paper", 0.52, 0.792, 0.10, 0.22, 0.008, 0.30, { ry: -0.12 });
  p.hit(0, 0, 1.9, 1.0);
}

export function officeChair(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // قاعدة نجمية خماسية وعجلات على الأرض
  p.cyl("metal", 0, 0.06, 0, 0.28, 0.28, 0.04, { seg: 8 });
  for (const [wx, wz] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]] as const) {
    p.cyl("rubber", wx, 0.03, wz, 0.03, 0.03, 0.03, { rx: Math.PI / 2 });
  }
  p.cyl("chrome", 0, 0.26, 0, 0.035, 0.04, 0.38);
  // مقعد ومسند ظهر ومساند ذراعين
  p.boxB("fabric", 0, 0.44, 0, 0.50, 0.08, 0.48);
  p.boxB("fabric", 0, 0.52, -0.21, 0.48, 0.54, 0.08, { rx: -0.08 });
  p.boxB("plastic", -0.26, 0.48, -0.02, 0.04, 0.18, 0.28);
  p.boxB("plastic", 0.26, 0.48, -0.02, 0.04, 0.18, 0.28);
  p.hit(0, 0, 0.6, 0.6);
}

/** رف مخزن معدني بكراتين وبضائع */
export function shelfStocked(w: PropCtx, x: number, z: number, ry = 0, len = 3, stocked = true, seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, ry);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  const buckets = ["wood2", "carA", "carB", "greenMetal", "medWhite"];
  // القوائم الرأسية الأربعة على الأرض (y=0)
  for (const sx of [-len / 2 + 0.04, len / 2 - 0.04]) {
    for (const sz of [-0.25, 0.25]) {
      p.boxB("metal", sx, 0, sz, 0.06, 2.05, 0.06);
    }
  }
  for (const lvl of [0.18, 0.78, 1.38, 1.96]) {
    p.boxB("metal", 0, lvl, 0, len, 0.045, 0.56);
    if (stocked && lvl < 1.8) {
      let cx = -len / 2 + 0.26;
      while (cx < len / 2 - 0.26) {
        const bw = 0.28 + rnd() * 0.42;
        const bh = 0.22 + rnd() * 0.28;
        if (rnd() < 0.76) {
          p.boxB(buckets[Math.floor(rnd() * buckets.length)], cx + bw / 2, lvl + 0.045, 0, bw, bh, 0.42, { ry: (rnd() - 0.5) * 0.14 });
        }
        cx += bw + 0.10 + rnd() * 0.16;
      }
    }
  }
  p.hit(0, 0, len + 0.5, 0.65);
}

export function cabinet(w: PropCtx, x: number, z: number, ry = 0, bucket = "wood2") {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB(bucket, 0, 0, 0, 1.05, 1.95, 0.52);
  // أدراج/أبواب أمامية ومقابض
  for (let i = 0; i < 4; i++) {
    const dy = 0.08 + i * 0.45;
    p.boxB("metal", 0, dy, 0.265, 0.92, 0.40, 0.02);
    p.boxB("chrome", 0, dy + 0.22, 0.285, 0.18, 0.025, 0.025);
  }
  p.hit(0, 0, 1.15, 0.62);
}

/** صف خزائن أمنية (شرطة) — إحداها خزانة الأسلحة */
export function lockerRow(w: PropCtx, x: number, z: number, ry = 0, count = 4) {
  const p = new PB(w).group(x, 0, z, ry);
  for (let i = 0; i < count; i++) {
    const bx = (i - (count - 1) / 2) * 0.62;
    p.boxB("greenMetal", bx, 0, 0, 0.58, 2.05, 0.52);
    p.boxB("metal", bx, 0.08, 0.265, 0.50, 1.88, 0.02);
    p.boxB("chrome", bx + 0.18, 1.02, 0.28, 0.03, 0.16, 0.03);
  }
  p.hit(0, 0, count * 0.62 + 0.2, 0.68);
}

export function bed(w: PropCtx, x: number, z: number, ry = 0, messy = true) {
  const p = new PB(w).group(x, 0, z, ry);
  // قوائم السرير الأربعة على الأرض + إطار السرير واللوح الأمامي والخلفي
  for (const [lx, lz] of [[-0.48, -0.98], [0.48, -0.98], [-0.48, 0.98], [0.48, 0.98]] as const) {
    p.boxB("wood2", lx, 0, lz, 0.08, 0.52, 0.08);
  }
  p.boxB("wood2", 0, 0.16, 0, 1.04, 0.20, 2.04);
  p.boxB("wood2", 0, 0.16, -1.01, 1.06, 0.96, 0.07); // لوح الرأس (Headboard)
  p.boxB("wood2", 0, 0.16, 1.01, 1.06, 0.52, 0.06);  // لوح القدم (Footboard)
  // المرتبة والوسائد والغطاء
  p.boxB("sheet", 0, 0.36, 0, 0.98, 0.18, 1.94);
  p.boxB("white", -0.22, 0.54, -0.74, 0.38, 0.09, 0.28, messy ? { ry: 0.08 } : {});
  p.boxB("white", 0.22, 0.54, -0.74, 0.38, 0.09, 0.28, messy ? { ry: -0.06 } : {});
  p.boxB("fabric2", 0, 0.54, 0.22, 0.99, 0.06, 1.32, messy ? { ry: 0.02 } : {});
  p.hit(0, 0, 1.15, 2.15);
}

/** سرير مستشفى طبي متكامل بعجلات وحواجز جانبية ومرتبة مفصلية ولوح ملاحظات */
export function gurney(w: PropCtx, x: number, z: number, ry = 0, bloody = true) {
  const p = new PB(w).group(x, 0, z, ry);
  // 1) القوائم الفولاذية والعجلات الطبية والصينية السفلية (من الأرض y=0)
  for (const [wx, wz] of [[-0.38, 0.82], [0.38, 0.82], [-0.38, -0.82], [0.38, -0.82]] as const) {
    p.cyl("rubber", wx, 0.07, wz, 0.07, 0.07, 0.05, { rz: Math.PI / 2, seg: 10 });
    p.cyl("chrome", wx, 0.40, wz, 0.028, 0.028, 0.64);
  }
  // قاعدة سفلية وأسطوانة أكسجين تحت السرير
  p.boxB("metal", 0, 0.16, 0, 0.78, 0.04, 1.68);
  p.cyl("greenMetal", -0.18, 0.26, 0.2, 0.07, 0.07, 0.65, { rx: Math.PI / 2 });
  // عمودان هيدروليكيان مركزيان لحمل السرير
  p.cyl("chrome", 0, 0.44, -0.45, 0.05, 0.06, 0.52);
  p.cyl("chrome", 0, 0.44, 0.45, 0.05, 0.06, 0.52);

  // 2) إطار السرير المعدني العلوي (y = 0.68)
  p.boxB("medWhite", 0, 0.68, 0, 0.96, 0.07, 2.12);
  // لوح الرأس ولوح القدم الطبيان مع ملف حالة المريض
  p.boxB("medWhite", 0, 0.68, -1.05, 0.94, 0.52, 0.05);
  p.boxB("chrome", 0, 1.18, -1.05, 0.86, 0.03, 0.06);
  p.boxB("medWhite", 0, 0.68, 1.05, 0.94, 0.38, 0.05);
  p.boxB("wood2", 0, 0.82, 1.08, 0.24, 0.30, 0.02);
  p.boxB("paper", 0, 0.84, 1.095, 0.20, 0.25, 0.01);

  // 3) المرتبة الطبية والوسادة والملاءة
  p.boxB("white", 0, 0.75, 0.18, 0.88, 0.12, 1.66);
  p.boxB("white", 0, 0.78, -0.78, 0.88, 0.13, 0.44, { rx: 0.18 });
  p.boxB("sheet", 0, 0.91, -0.82, 0.54, 0.08, 0.30, { rx: 0.18 });
  p.boxB("sheet", 0, 0.87, 0.28, 0.89, 0.03, 1.36);
  if (bloody) {
    p.boxB("medRed", 0.06, 0.902, 0.12, 0.46, 0.008, 0.68, { ry: 0.25 });
  }

  // 4) قضبان الحماية الجانبية المعدنية (Side Safety Rails)
  for (const sx of [-0.47, 0.47]) {
    p.boxB("chrome", sx, 1.02, 0, 0.03, 0.03, 1.32);
    p.boxB("chrome", sx, 0.86, 0, 0.025, 0.025, 1.32);
    for (const rz of [-0.62, -0.20, 0.20, 0.62]) {
      p.boxB("chrome", sx, 0.72, rz, 0.025, 0.32, 0.025);
    }
  }
  p.hit(0, 0, 1.08, 2.22);
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
  p.boxB("wood2", 0, 0, 0, len, 0.10, 0.86);
  p.boxB("fabric", 0, 0.10, 0, len, 0.32, 0.88);
  p.boxB("fabric", 0, 0.42, -0.34, len, 0.52, 0.22, { rx: -0.08 });
  p.boxB("fabric", -len / 2 + 0.12, 0.10, 0, 0.24, 0.54, 0.88);
  p.boxB("fabric", len / 2 - 0.12, 0.10, 0, 0.24, 0.54, 0.88);
  p.boxB("fabric2", -len / 4, 0.42, -0.05, 0.38, 0.12, 0.34, { ry: 0.2 });
  p.hit(0, 0, len + 0.2, 1.05);
}

export function tvSet(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0, 0, 1.25, 0.52, 0.44);
  p.boxB("plastic", 0, 0.52, 0, 0.34, 0.04, 0.24);
  p.boxB("plastic", 0, 0.56, 0, 0.08, 0.12, 0.08);
  p.boxB("plastic", 0, 0.66, 0, 1.08, 0.62, 0.07);
  // شاشة متشققة مظلمة
  p.boxB("glassDark", 0, 0.70, 0.04, 0.98, 0.54, 0.02);
  p.hit(0, 0, 1.3, 0.6);
}

export function coffeeTable(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0.4, 0, 1.1, 0.05, 0.6);
  p.boxB("wood2", 0, 0.14, 0, 1.0, 0.04, 0.5);
  p.boxB("metal", -0.48, 0, 0, 0.05, 0.4, 0.5);
  p.boxB("metal", 0.48, 0, 0, 0.05, 0.4, 0.5);
  p.hit(0, 0, 1.2, 0.7);
}

/** كاونتر مطبخ مع حوض وخزائن علوية */
export function kitchenCounter(w: PropCtx, x: number, z: number, ry = 0, len = 2.4) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0, 0, len, 0.88, 0.62);
  p.boxB("white", 0, 0.88, 0, len + 0.06, 0.05, 0.66);
  p.boxB("chrome", -0.4, 0.93, 0, 0.5, 0.03, 0.4);                 // حوض
  p.boxB("wood2", 0, 1.65, -0.12, len, 0.68, 0.38);                 // خزائن علوية
  p.hit(0, 0, len + 0.2, 0.8);
}

export function fridge(w: PropCtx, x: number, z: number, ry = 0, open = false) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("white", 0, 0, 0, 0.78, 1.86, 0.72);
  p.boxB("chrome", 0.34, 0.95, 0.37, 0.03, 0.45, 0.03);
  if (open) {
    p.boxB("white", -0.38, 0.04, 0.55, 0.06, 1.76, 0.68, { ry: 0.9 });
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

/** خزانة خادم بيانات احترافية (Data Center Server Rack 42U) بوحدات شفرات ومؤشرات LED */
export function serverRack(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // 1) قاعدة الخادم الفولاذية على الأرض (y=0) والهيكل المعدني الرئيسي
  p.boxB("metal", 0, 0, 0, 0.94, 0.08, 1.04);
  p.boxB("labMetal", 0, 0.08, -0.02, 0.90, 2.06, 0.96);
  p.boxB("metal", 0, 2.14, 0, 0.94, 0.07, 1.04);
  // القائمان الأماميان من الكروم
  p.boxB("chrome", -0.41, 0.08, 0.47, 0.05, 2.06, 0.04);
  p.boxB("chrome", 0.41, 0.08, 0.47, 0.05, 2.06, 0.04);

  // 2) سبع وحدات خوادم نصلية (Server Blades) مركبة داخل الخزانة مع شاشات ومؤشرات حالة
  for (let i = 0; i < 7; i++) {
    const by = 0.14 + i * 0.28;
    p.boxB("plastic", 0, by, 0.46, 0.74, 0.23, 0.04);
    // مقابض سحب الوحدة الجانبية
    p.boxB("chrome", -0.34, by + 0.04, 0.485, 0.02, 0.15, 0.02);
    p.boxB("chrome", 0.34, by + 0.04, 0.485, 0.02, 0.15, 0.02);
    // شاشة حالة ومؤشرات LED مضيئة
    const ledBucket = i % 3 === 0 ? "screenGlow" : i % 3 === 1 ? "screenGlowAmber" : "redEmissive";
    p.boxB(ledBucket, -0.20, by + 0.09, 0.485, 0.12, 0.045, 0.015);
    p.boxB("screenGlow", 0.04, by + 0.10, 0.485, 0.05, 0.03, 0.015);
    p.boxB(i % 2 === 0 ? "screenGlow" : "screenGlowAmber", 0.14, by + 0.10, 0.485, 0.05, 0.03, 0.015);
    p.boxB("metal", 0.25, by + 0.05, 0.482, 0.06, 0.13, 0.01);
  }
  // باب زجاجي مدخن أمامي
  p.boxB("glassWindow", 0, 0.12, 0.50, 0.76, 1.98, 0.02);
  p.hit(0, 0, 1.02, 1.14);
}

/** آلة تصنيع ضخمة (مكبس هيدروليكي صناعي) */
export function pressMachine(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("labMetal", 0, 0, 0, 2.6, 3.0, 1.8);
  p.boxB("labMetal", 0, 3.0, 0, 3.0, 0.45, 2.0);
  p.cyl("chrome", 0, 2.1, 0, 0.28, 0.28, 1.4);
  p.boxB("metal", 0, 1.1, 0, 1.3, 0.38, 1.1);
  p.boxB("hazard", 0, 0, 0.95, 2.4, 0.12, 0.45);
  p.boxB("redEmissive", 0.9, 3.2, 0.95, 0.14, 0.14, 0.14);
  p.hit(0, 0, 3.0, 2.1);
}

export function conveyor(w: PropCtx, x: number, z: number, ry = 0, len = 5) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("labMetal", 0, 0.72, 0, 0.9, 0.1, len);
  p.boxB("metal", -0.35, 0, 0, 0.08, 0.72, len);
  p.boxB("metal", 0.35, 0, 0, 0.08, 0.72, len);
  for (let i = 0; i < Math.floor(len / 0.8); i++) {
    p.cyl("rubber", 0, 0.78, -len / 2 + 0.4 + i * 0.8, 0.3, 0.3, 0.04, { rx: Math.PI / 2, seg: 8 });
  }
  p.hit(0, 0, 1.1, len);
}

export function controlPanel(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("labMetal", 0, 0, 0, 1.35, 1.05, 0.65);
  p.boxB("labMetal", 0, 1.05, -0.10, 1.35, 0.62, 0.36, { rx: -0.30 });
  p.boxB("screenGlow", -0.28, 1.16, 0.05, 0.52, 0.34, 0.02, { rx: -0.30 });
  p.boxB("screenGlowAmber", 0.32, 1.16, 0.05, 0.42, 0.34, 0.02, { rx: -0.30 });
  p.sph("redEmissive", 0.45, 0.95, 0.33, 0.035);
  p.sph("screenGlow", 0.30, 0.95, 0.33, 0.035);
  p.hit(0, 0, 1.45, 0.8);
}

export function forklift(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("carC", 0, 0.18, 0.3, 1.15, 0.68, 1.7);
  p.boxB("carC", 0, 0.86, -0.4, 1.05, 1.12, 0.95);
  p.boxB("glassDark", 0, 1.05, -0.35, 0.95, 0.62, 0.06);
  p.boxB("metal", 0, 0.12, 1.15, 0.9, 1.65, 0.09);                  // سارية
  p.boxB("metal", -0.36, 0.04, 1.55, 0.12, 0.06, 0.9);              // شوكة
  p.boxB("metal", 0.36, 0.04, 1.55, 0.12, 0.06, 0.9);
  for (const [wx, wz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.65], [0.55, 0.65]] as const) {
    p.cyl("rubber", wx, 0.24, wz, 0.24, 0.24, 0.2, { rz: Math.PI / 2, seg: 10 });
  }
  p.hit(0, 0, 1.4, 2.6);
}

export function vending(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("carA", 0, 0, 0, 1.02, 2.02, 0.76);
  p.boxB("glassWindow", -0.08, 0.62, 0.385, 0.68, 1.18, 0.02);
  p.boxB("screenGlowAmber", 0.36, 0.95, 0.385, 0.14, 0.45, 0.03);
  p.boxB("plastic", -0.08, 0.16, 0.385, 0.68, 0.24, 0.04);
  p.hit(0, 0, 1.1, 0.88);
}

/** رف منتجات ملونة (بقالة) */
export function shopShelf(w: PropCtx, x: number, z: number, ry = 0, len = 3.4, seed = Math.random()) {
  const p = new PB(w).group(x, 0, z, ry);
  const rnd = seededRandom(Math.floor(seed * 1e9));
  const buckets = ["medWhite", "carA", "greenMetal", "carTaxi", "medRed"];
  p.boxB("metal", 0, 0, 0, len, 1.92, 0.10);
  for (const lvl of [0.18, 0.68, 1.18, 1.66]) {
    p.boxB("metal", 0, lvl, 0, len, 0.04, 0.52);
    let cx = -len / 2 + 0.22;
    while (cx < len / 2 - 0.22) {
      if (rnd() < 0.8) {
        const s = 0.13 + rnd() * 0.11;
        p.boxB(buckets[Math.floor(rnd() * buckets.length)], cx, lvl + 0.04, 0.14, s, s * 1.35, s);
      }
      cx += 0.2 + rnd() * 0.1;
    }
  }
  p.hit(0, 0, len + 0.4, 0.6);
}

export function counter(w: PropCtx, x: number, z: number, ry = 0, len = 2.6) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0, 0, len, 1.04, 0.72);
  p.boxB("woodFloor", 0, 1.04, 0, len + 0.10, 0.06, 0.80);
  p.boxB("plastic", len / 2 - 0.45, 1.10, 0, 0.32, 0.16, 0.26);       // سجل نقدية
  p.boxB("screenGlow", len / 2 - 0.45, 1.24, 0.08, 0.18, 0.08, 0.02);
  p.hit(0, 0, len + 0.2, 0.88);
}

/** حامل أسلحة على الجدار (متجر) */
export function gunRack(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 1.15, 0, 2.2, 1.1, 0.08);
  for (let i = 0; i < 3; i++) {
    p.boxB("plastic", -0.6 + i * 0.6, 1.32, 0.05, 0.06, 0.78, 0.04);
    p.boxB("wood2", -0.6 + i * 0.6, 1.22, 0.07, 0.07, 0.28, 0.06);
  }
  p.boxB("metal", 0, 1.98, 0.05, 2.2, 0.05, 0.1);
}

export function turnstile(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("metal", 0, 0, 0, 0.22, 1.02, 1.32);
  p.boxB("chrome", 0, 1.02, 0, 0.24, 0.04, 1.36);
  p.cyl("chrome", 0.26, 0.78, 0.15, 0.02, 0.02, 0.55, { rz: Math.PI / 2 });
  p.cyl("chrome", 0.22, 0.72, -0.05, 0.02, 0.02, 0.52, { rz: Math.PI / 2, rx: 0.5 });
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

// ═══════════════ تفاصيل معمارية حقيقية للمباني ═══════════════

/** نافذة واقعية بإطار خشبي/معدني وعتبة وزجاج شفاف حقيقي مع مصاريع أو قضبان */
export function realisticWindow(
  w: PropCtx,
  x: number,
  y: number,
  z: number,
  width = 1.6,
  height = 2.0,
  orient: "x" | "z" = "x",
  style: "wood" | "metal" | "hospital" = "wood",
) {
  const p = new PB(w).group(x, y, z, orient === "z" ? Math.PI / 2 : 0);
  const frameMat = style === "metal" ? "metal" : style === "hospital" ? "medWhite" : "wood2";
  const sillMat = style === "hospital" ? "white" : "concrete";
  const t = 0.09;

  // عتبة سفلية حجرية بارزة للخارج والداخل (Window Sill)
  p.boxB(sillMat, 0, -0.1, 0, width + 0.34, 0.14, 0.68);
  // تاج علوي معماري بارز (Header Lintel & Keystone)
  p.boxB(sillMat, 0, height - 0.02, 0, width + 0.3, 0.18, 0.64);
  p.boxB(sillMat, 0, height + 0.02, 0, 0.26, 0.22, 0.68);

  // إطارات الجوانب والعمق (Deep Window Casing)
  p.boxB(frameMat, -width / 2 + t / 2, 0, 0, t, height, 0.56);
  p.boxB(frameMat, width / 2 - t / 2, 0, 0, t, height, 0.56);
  p.boxB(frameMat, 0, 0, 0, width, t * 0.8, 0.56);
  p.boxB(frameMat, 0, height - t * 0.8, 0, width, t * 0.8, 0.56);

  // قواطع الزجاج الأفقية والعمودية (Mullions & Muntins)
  p.boxB(frameMat, 0, 0, 0, t * 0.75, height, 0.18);
  p.boxB(frameMat, 0, height * 0.52, 0, width - t * 1.6, t * 0.75, 0.18);
  p.boxB(frameMat, 0, height * 0.25, 0, width - t * 1.6, t * 0.45, 0.12);
  p.boxB(frameMat, 0, height * 0.78, 0, width - t * 1.6, t * 0.45, 0.12);

  // ألواح زجاجية شفافة تسمح بالرؤية من الداخل والخارج
  p.boxB("glassWindow", 0, t * 0.5, 0, width - t * 1.6, height - t * 1.2, 0.04);

  // مصاريع خشبية جانبية للمنازل أو قضبان حماية للمباني الصناعية
  if (style === "wood") {
    p.boxB("wood2", -width / 2 - 0.22, 0.04, 0.27, 0.34, height - 0.08, 0.05);
    p.boxB("wood2", width / 2 + 0.22, 0.04, 0.27, 0.34, height - 0.08, 0.05);
    p.boxB("wood2", -width / 2 - 0.22, 0.04, -0.27, 0.34, height - 0.08, 0.05);
    p.boxB("wood2", width / 2 + 0.22, 0.04, -0.27, 0.34, height - 0.08, 0.05);
  } else if (style === "metal") {
    for (let bx = -width / 2 + 0.28; bx <= width / 2 - 0.28; bx += 0.32) {
      p.cyl("chrome", bx, height / 2, 0.16, 0.014, 0.014, height - 0.1);
    }
  }
}

/** إطار باب واقعي مع عتبة وتاج علوي وكشافات مدخل (Door Frame / Architrave) */
export function realisticDoorFrame(
  w: PropCtx,
  x: number,
  y: number,
  z: number,
  width = 1.8,
  height = 2.45,
  orient: "x" | "z" = "x",
  style: "wood" | "metal" | "hospital" = "wood",
) {
  const p = new PB(w).group(x, y, z, orient === "z" ? Math.PI / 2 : 0);
  const frameMat = style === "metal" ? "metal" : style === "hospital" ? "medWhite" : "wood2";
  const trimMat = style === "hospital" ? "white" : "concrete";
  const t = 0.14;
  // قائمان جانبيان عريضان
  p.boxB(frameMat, -width / 2 - t / 2, 0, 0, t, height + 0.15, 0.62);
  p.boxB(frameMat, width / 2 + t / 2, 0, 0, t, height + 0.15, 0.62);
  // عارضة علوية وتاج معماري
  p.boxB(frameMat, 0, height - 0.04, 0, width + t * 2 + 0.16, 0.18, 0.66);
  p.boxB(trimMat, 0, height + 0.12, 0, width + t * 2 + 0.32, 0.16, 0.72);
  // نافذة علوية فوق الباب (Transom Window)
  p.boxB("glassWindow", 0, height + 0.28, 0, width - 0.1, 0.36, 0.06);
  p.boxB(frameMat, 0, height + 0.64, 0, width + t * 2 + 0.2, 0.12, 0.64);
  // عتبة أرضية معدنية بارزة
  p.boxB("chrome", 0, 0, 0, width + t * 2, 0.035, 0.58);
  // مصابيح جدارية على جانبي المدخل
  for (const sx of [-width / 2 - 0.38, width / 2 + 0.38]) {
    p.boxB("metal", sx, 1.95, 0.28, 0.12, 0.28, 0.14);
    p.boxB("lampGlow", sx, 1.98, 0.35, 0.08, 0.18, 0.08);
    p.boxB("metal", sx, 1.95, -0.28, 0.12, 0.28, 0.14);
    p.boxB("lampGlow", sx, 1.98, -0.35, 0.08, 0.18, 0.08);
  }
}

/** رواق مدخل معماري بأعمدة ومظلة ودرجات (Entrance Porch / Portico) */
export function entrancePorch(
  w: PropCtx,
  x: number,
  z: number,
  width = 4.6,
  depth = 2.6,
  height = 3.6,
  orient: "N" | "S" | "E" | "W" = "S",
  style: "brick" | "concrete" | "hospital" = "brick",
) {
  const ry =
    orient === "S" ? 0 : orient === "N" ? Math.PI : orient === "E" ? Math.PI / 2 : -Math.PI / 2;
  const p = new PB(w).group(x, 0, z, ry);
  const colMat = style === "hospital" ? "white" : style === "brick" ? "wood2" : "concrete";
  const roofMat = style === "hospital" ? "medWhite" : "concrete";

  // منصة المدخل السفلية العريضة
  p.boxB("concrete", 0, 0, depth / 2, width + 0.6, 0.14, depth + 0.4);
  p.boxB("tile", 0, 0.14, depth / 2, width + 0.2, 0.03, depth);

  // عمودان أماميان يحملان المظلة
  for (const sx of [-width / 2 + 0.28, width / 2 - 0.28]) {
    p.boxB("concrete", sx, 0.14, depth - 0.25, 0.46, 0.45, 0.46);
    p.boxB(colMat, sx, 0.59, depth - 0.25, 0.32, height - 0.59, 0.32);
    p.boxB("concrete", sx, height - 0.18, depth - 0.25, 0.44, 0.18, 0.44);
  }

  // سقف المظلة العلوي وإضاءة السقف
  p.boxB(roofMat, 0, height, depth / 2, width + 0.5, 0.28, depth + 0.3);
  p.boxB("concrete", 0, height + 0.28, depth / 2, width + 0.7, 0.14, depth + 0.5);
  p.boxB("lampGlow", 0, height - 0.04, depth * 0.55, 0.9, 0.04, 0.35);
}

/** دربزين حماية للطوابق العلوية والشرفات (Mezzanine & Balcony Railing) */
export function railingSection(
  w: PropCtx,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  style: "wood" | "chrome" | "metal" = "chrome",
  solid = true,
) {
  const horiz = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.15) return;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const p = new PB(w).group(cx, 0, cz, horiz ? 0 : Math.PI / 2);
  const mat = style === "wood" ? "wood2" : style === "chrome" ? "chrome" : "metal";
  const h = 1.05;

  // القضيب العلوي والسفلي
  p.boxB(mat, 0, h - 0.06, 0, len, 0.07, 0.09);
  p.boxB(mat, 0, 0.12, 0, len, 0.05, 0.07);

  // لوح زجاجي في الدربزين الطبي/الحديث أو أعمدة متقاربة
  if (style === "chrome") {
    p.boxB("glassWindow", 0, 0.17, 0, Math.max(0.1, len - 0.16), h - 0.25, 0.03);
  }
  const posts = Math.max(2, Math.ceil(len / 0.85) + 1);
  for (let i = 0; i < posts; i++) {
    const px = -len / 2 + (i / (posts - 1)) * len;
    p.boxB(mat, px, 0, 0, 0.06, h, 0.08);
  }
  if (solid) {
    if (horiz) {
      w.collider(cx - len / 2, cx + len / 2, cz - 0.12, cz + 0.12);
    } else {
      w.collider(cx - 0.12, cx + 0.12, cz - len / 2, cz + len / 2);
    }
  }
}

/** ستائر نوافذ داخلية مع قضيب تعليق (Interior Window Curtains) */
export function curtainPair(
  w: PropCtx,
  x: number,
  y: number,
  z: number,
  width = 1.8,
  height = 2.2,
  orient: "x" | "z" = "x",
) {
  const p = new PB(w).group(x, y, z, orient === "z" ? Math.PI / 2 : 0);
  p.cyl("brass", 0, height + 0.08, 0, 0.02, 0.02, width + 0.5, { rz: Math.PI / 2 });
  p.boxB("fabric2", -width / 2 - 0.05, -0.15, 0, 0.38, height + 0.2, 0.08);
  p.boxB("fabric2", width / 2 + 0.05, -0.15, 0, 0.38, height + 0.2, 0.08);
}

/** لوحة جدارية مؤطرة أو مخطط طبي/أمني (Framed Wall Picture / Chart) */
export function wallPicture(
  w: PropCtx,
  x: number,
  y: number,
  z: number,
  width = 1.2,
  height = 0.85,
  orient: "x" | "z" = "x",
  theme: "art" | "medical" | "map" = "art",
) {
  const p = new PB(w).group(x, y, z, orient === "z" ? Math.PI / 2 : 0);
  const frameMat = theme === "medical" ? "chrome" : "wood2";
  const canvasMat = theme === "medical" ? "medWhite" : theme === "map" ? "paper" : "fabric2";
  p.boxB(frameMat, 0, 0, 0, width, height, 0.05);
  p.boxB(canvasMat, 0, 0.05, 0, width - 0.12, height - 0.12, 0.06);
  if (theme === "medical") {
    p.boxB("medRed", -width * 0.2, height * 0.45, 0, 0.18, 0.06, 0.07);
    p.boxB("medRed", -width * 0.2, height * 0.39, 0, 0.06, 0.18, 0.07);
    p.boxB("screenGlow", width * 0.15, height * 0.35, 0, width * 0.35, height * 0.35, 0.065);
  }
}

/** مغسلة حمام مع مرآة وخزانة سفلية (Bathroom Sink Vanity & Mirror) */
export function sinkVanity(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0, 0, 0.85, 0.82, 0.52);
  p.boxB("white", 0, 0.82, 0, 0.9, 0.08, 0.56);
  p.cyl("chrome", 0, 0.9, -0.18, 0.02, 0.02, 0.16);
  // مرآة علوية بإطار
  p.boxB("wood2", 0, 1.15, -0.24, 0.78, 0.95, 0.04);
  p.boxB("glassWindow", 0, 1.2, -0.22, 0.68, 0.85, 0.05);
  p.boxB("lampGlow", 0, 2.14, -0.2, 0.55, 0.06, 0.08);
  p.hit(0, 0, 0.95, 0.62);
}

/** مرحاض حمام خزفي (Porcelain Toilet) */
export function toiletBowl(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("white", 0, 0, 0.08, 0.44, 0.42, 0.52);
  p.boxB("white", 0, 0.42, -0.18, 0.46, 0.44, 0.22);
  p.boxB("white", 0, 0.86, -0.18, 0.48, 0.04, 0.24);
  p.boxB("chrome", 0.18, 0.78, -0.06, 0.08, 0.03, 0.04);
  p.hit(0, 0, 0.55, 0.68);
}

/** خزانة ملابس خشبية كبيرة لغرف النوم (Bedroom Wardrobe Closet) */
export function wardrobeCloset(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  p.boxB("wood2", 0, 0, 0, 1.5, 2.35, 0.62);
  p.boxB("woodFloor", -0.36, 0.12, 0.32, 0.68, 2.1, 0.03);
  p.boxB("woodFloor", 0.36, 0.12, 0.32, 0.68, 2.1, 0.03);
  p.boxB("brass", -0.06, 1.1, 0.35, 0.03, 0.22, 0.03);
  p.boxB("brass", 0.06, 1.1, 0.35, 0.03, 0.22, 0.03);
  p.hit(0, 0, 1.6, 0.72);
}

/** أبواب مصعد معدنية مع لوحة أزرار ومؤشر طابق (Elevator Doors) */
export function elevatorDoors(w: PropCtx, x: number, y: number, z: number, orient: "x" | "z" = "x") {
  const p = new PB(w).group(x, y, z, orient === "z" ? Math.PI / 2 : 0);
  p.boxB("chrome", 0, 0, 0, 2.1, 2.55, 0.18);
  p.boxB("metal", -0.46, 0.04, 0, 0.88, 2.4, 0.22);
  p.boxB("metal", 0.46, 0.04, 0, 0.88, 2.4, 0.22);
  // شاشة رقم الطابق المضيئة فوق المصعد
  p.boxB("plastic", 0, 2.62, 0, 0.55, 0.22, 0.22);
  p.boxB("redEmissive", 0, 2.66, 0, 0.38, 0.14, 0.24);
  // لوحة أزرار الاستدعاء
  p.boxB("chrome", 1.22, 1.1, 0, 0.14, 0.32, 0.16);
  p.boxB("screenGlowAmber", 1.22, 1.2, 0, 0.05, 0.05, 0.18);
}

/** كبسولة حجر حيوي زجاجية مضيئة لمختبر الطابق الثالث في المستشفى (Bio-Containment Incubator) */
export function bioIncubator(w: PropCtx, x: number, z: number) {
  const p = new PB(w).group(x, 0, z, 0);
  p.cyl("labMetal", 0, 0.2, 0, 0.68, 0.72, 0.4, { seg: 14 });
  p.cyl("glassWindow", 0, 1.35, 0, 0.6, 0.6, 1.9, { seg: 14 });
  p.cyl("screenGlow", 0, 1.3, 0, 0.28, 0.22, 1.4, { seg: 10 });
  p.cyl("labMetal", 0, 2.42, 0, 0.72, 0.68, 0.28, { seg: 14 });
  p.hit(0, 0, 1.45, 1.45);
}

/**
 * درج واقعي قابل للصعود والنزول بدرجات ودربزين وأعمدة (Walkable Staircase)
 * لا يغلق ممر الصعود بمصادم جداري بل يضع مصادمات لحافتي الدربزين فقط.
 */
export function staircase(
  w: PropCtx,
  x: number,
  y: number,
  z: number,
  width = 2.4,
  height = 4.2,
  length = 6.4,
  ry = 0,
  steps = 14,
) {
  const p = new PB(w).group(x, y, z, ry);
  const stepH = height / steps;
  const stepD = length / steps;

  // الجسور الحاملة المائلة أسفل جانبي الدرج (Side Stringers)
  const slopeLen = Math.hypot(height, length);
  const angle = Math.atan2(height, length);
  for (const sx of [-width / 2 + 0.09, width / 2 - 0.09]) {
    p.box("wood2", sx, height / 2 - 0.14, 0, 0.14, 0.26, slopeLen, { rx: -angle });
  }

  for (let i = 0; i < steps; i++) {
    const curY = i * stepH;
    const curZ = -length / 2 + (i + 0.5) * stepD;
    // قائم الدرجة (Riser)
    p.boxB("concrete", 0, curY, curZ - stepD * 0.42, width - 0.08, stepH, 0.06);
    // دعسة الدرجة العريضة (Tread)
    p.boxB("woodFloor", 0, curY + stepH - 0.045, curZ, width + 0.04, 0.05, stepD + 0.05);
  }

  // دربزين جانبي متين (Handrails & Newel Posts) مع مصادمات جانبية رفيعة فقط
  for (const side of [-width / 2 + 0.08, width / 2 - 0.08]) {
    p.boxB("wood2", side, 0, -length / 2 + 0.18, 0.11, 1.02, 0.11);
    p.boxB("wood2", side, height, length / 2 - 0.18, 0.11, 1.02, 0.11);
    p.box("wood2", side, height / 2 + 0.92, 0, 0.07, 0.07, slopeLen, { rx: -angle });
    for (let i = 1; i < steps; i++) {
      const curY = i * stepH;
      const curZ = -length / 2 + i * stepD;
      p.boxB("chrome", side, curY, curZ, 0.035, 0.9, 0.035);
    }
    p.hit(side, 0, 0.16, length);
  }
}

/** طاولة عمليات جراحية احترافية (Operating Table) */
export function operatingTable(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // قاعدة هيدروليكية ثقيلة
  p.boxB("chrome", 0, 0, 0, 0.7, 0.16, 1.2);
  p.cyl("chrome", 0, 0.16, 0, 0.18, 0.22, 0.7, { seg: 10 });
  // سطح الطاولة المائل المفصل
  p.boxB("medWhite", 0, 0.86, 0, 0.75, 0.09, 2.0);
  p.boxB("fabric", 0, 0.95, 0, 0.7, 0.06, 1.95);
  // وسادة رأس
  p.boxB("fabric", 0, 1.01, -0.75, 0.45, 0.06, 0.35);
  // مساند أذرع جانبية
  p.boxB("medWhite", -0.48, 0.88, 0.1, 0.16, 0.05, 0.55);
  p.boxB("medWhite", 0.48, 0.88, 0.1, 0.16, 0.05, 0.55);
  p.hit(0, 0, 1.1, 2.2);
}

/** كشافات جراحية سقفية مزدوجة (Dual Surgical Overhead Lamps) */
export function surgicalLamps(w: PropCtx, x: number, y = 3.9, z: number, ry = 0) {
  const p = new PB(w).group(x, y, z, ry);
  // قاعدة سقفية
  p.cyl("chrome", 0, 0, 0, 0.25, 0.25, 0.08);
  p.cyl("chrome", 0, -0.4, 0, 0.04, 0.04, 0.8);
  // ذراعان مفصليان مع قبتي كشاف
  for (const [ox, oz, tilt] of [[-0.65, 0.3, 0.35], [0.65, -0.3, -0.35]] as const) {
    p.cyl("chrome", ox / 2, -0.75, oz / 2, 0.03, 0.03, 0.8, { rz: tilt });
    p.cyl("medWhite", ox, -1.05, oz, 0.45, 0.35, 0.2, { rx: 0.2, rz: tilt, seg: 12 });
    p.cyl("screenGlow", ox, -1.16, oz, 0.38, 0.38, 0.02, { rx: 0.2, rz: tilt, seg: 12 });
  }
}

/** جهاز تخدير وتنفس اصطناعي طبي (Anesthesia Machine) */
export function anesthesiaMachine(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // عربة الجهاز
  p.boxB("medWhite", 0, 0.12, 0, 0.85, 1.35, 0.7);
  // عجلات
  for (const [wx, wz] of [[-0.35, -0.28], [0.35, -0.28], [-0.35, 0.28], [0.35, 0.28]] as const) {
    p.cyl("rubber", wx, 0.06, wz, 0.06, 0.06, 0.04, { rx: Math.PI / 2, seg: 8 });
  }
  // شاشة تخطيط ومراقبة علوية
  p.boxB("plastic", 0, 1.48, 0.08, 0.65, 0.45, 0.12, { rx: -0.15 });
  p.boxB("screenGlow", 0, 1.5, 0.15, 0.55, 0.35, 0.02, { rx: -0.15 });
  // أسطوانات غاز ملونة في الخلف
  p.cyl("greenMetal", -0.22, 0.45, -0.38, 0.09, 0.09, 0.8);
  p.cyl("jerrycan", 0.22, 0.45, -0.38, 0.09, 0.09, 0.8);
  // خراطيم تنفس مطاطية
  p.cyl("rubber", 0.35, 0.95, 0.22, 0.025, 0.025, 0.6, { rz: 0.5 });
  p.hit(0, 0, 1.0, 0.9);
}

/** جهاز فحص أشعة إكس جداري مضيء (X-Ray Lightbox) */
export function xrayLightbox(w: PropCtx, x: number, y = 2.1, z: number, ry = 0) {
  const p = new PB(w).group(x, y, z, ry);
  // إطار الألمنيوم
  p.boxB("chrome", 0, 0, 0, 1.2, 0.85, 0.08);
  // شاشة مضيئة بيضاء
  p.boxB("white", 0, 0.04, 0.05, 1.1, 0.75, 0.02);
  // فيلم صورة أشعة القفص الصدري
  p.boxB("glassDark", 0, 0.04, 0.07, 0.95, 0.68, 0.01);
}

/** سرير عناية مشددة وتنويم طبي متكامل مع أعمدة وستائر خصوصية (Curtained Ward Bed) */
export function curtainedWardBed(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // 1) قاعدة السرير الهيدروليكية والعجلات على الأرض (y=0)
  p.boxB("metal", 0, 0.08, 0, 0.86, 0.08, 1.78);
  for (const [wx, wz] of [[-0.42, -0.82], [0.42, -0.82], [-0.42, 0.82], [0.42, 0.82]] as const) {
    p.cyl("rubber", wx, 0.06, wz, 0.06, 0.06, 0.05, { rz: Math.PI / 2, seg: 10 });
  }
  p.boxB("medWhite", 0, 0.16, -0.45, 0.46, 0.38, 0.24);
  p.boxB("medWhite", 0, 0.16, 0.45, 0.46, 0.38, 0.24);

  // 2) هيكل السرير والمرتبة الطبية والوسائد
  p.boxB("medWhite", 0, 0.54, 0, 1.08, 0.10, 2.20);
  p.boxB("white", 0, 0.64, 0, 1.00, 0.16, 2.06);
  p.boxB("sheet", -0.22, 0.80, -0.78, 0.40, 0.09, 0.30, { rx: 0.15 });
  p.boxB("sheet", 0.22, 0.80, -0.78, 0.40, 0.09, 0.30, { rx: 0.15 });
  p.boxB("fabric", 0, 0.80, 0.22, 1.01, 0.04, 1.42);

  // 3) لوح الرأس والقدم الطبيان + حواجز الحماية الجانبية
  p.boxB("medWhite", 0, 0.52, -1.08, 1.08, 0.68, 0.06);
  p.boxB("medWhite", 0, 0.52, 1.08, 1.08, 0.50, 0.06);
  p.boxB("screenGlow", 0, 0.86, 1.115, 0.26, 0.14, 0.01);
  for (const sx of [-0.53, 0.53]) {
    p.boxB("medWhite", sx, 0.68, -0.38, 0.04, 0.28, 0.68);
    p.boxB("medWhite", sx, 0.68, 0.38, 0.04, 0.28, 0.68);
  }

  // 4) أعمدة وسكة ستائر الخصوصية الطبية (من الأرض y=0 إلى السكة y=2.32 دون اختراق السقف)
  for (const [px2, pz2] of [[-0.78, -1.15], [0.78, -1.15], [-0.78, 1.15], [0.78, 1.15]] as const) {
    p.cyl("chrome", px2, 1.16, pz2, 0.02, 0.02, 2.32);
  }
  p.cyl("chrome", -0.78, 2.32, 0, 0.02, 0.02, 2.32, { rx: Math.PI / 2 });
  p.cyl("chrome", 0.78, 2.32, 0, 0.02, 0.02, 2.32, { rx: Math.PI / 2 });
  // ستائر قماشية جانبية معلقة من السكة (y=0.28..2.30)
  p.boxB("fabric2", -0.78, 0.28, -0.58, 0.03, 2.02, 0.86);
  p.boxB("fabric2", 0.78, 0.28, 0.58, 0.03, 2.02, 0.86);
  p.hit(0, 0, 1.4, 2.3);
}

/** عربة إنعاش وطوارئ مزودة بجهاز صدمات (Defibrillator Crash Cart) */
export function defibrillatorCart(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // عجلات سفلية وجسم العربة الأحمر (من الأرض y=0.08)
  for (const [wx, wz] of [[-0.32, -0.25], [0.32, -0.25], [-0.32, 0.25], [0.32, 0.25]] as const) {
    p.cyl("rubber", wx, 0.05, wz, 0.05, 0.05, 0.04, { rz: Math.PI / 2 });
  }
  p.boxB("medRed", 0, 0.09, 0, 0.75, 0.85, 0.6);
  // أدراج بيضاء
  for (let i = 0; i < 3; i++) {
    p.boxB("medWhite", 0, 0.20 + i * 0.24, 0.305, 0.66, 0.18, 0.02);
    p.boxB("chrome", 0, 0.27 + i * 0.24, 0.32, 0.18, 0.02, 0.02);
  }
  // جهاز الصدمات الكهربائية (Defibrillator)
  p.boxB("medWhite", 0, 0.94, 0.02, 0.48, 0.28, 0.35);
  p.boxB("screenGlowAmber", 0, 1.02, 0.20, 0.32, 0.16, 0.02);
  p.cyl("rubber", -0.18, 1.02, 0.22, 0.04, 0.04, 0.14, { rx: Math.PI / 2 });
  p.cyl("rubber", 0.18, 1.02, 0.22, 0.04, 0.04, 0.14, { rx: Math.PI / 2 });
  p.hit(0, 0, 0.9, 0.75);
}

/** مجهر فحص مخبري مكتبي (Microscope) */
export function microscope(w: PropCtx, x: number, y = 0.85, z: number, ry = 0) {
  const p = new PB(w).group(x, y, z, ry);
  p.boxB("medWhite", 0, 0, 0, 0.18, 0.04, 0.24);
  p.cyl("medWhite", 0, 0.18, -0.06, 0.03, 0.03, 0.32, { rx: 0.2 });
  p.cyl("chrome", 0, 0.32, 0.04, 0.02, 0.02, 0.18, { rx: -0.4 });
  p.cyl("plastic", 0, 0.14, 0.02, 0.07, 0.07, 0.02);
}

/** طاولة طعام خشبية مع كراسي (Dining Table & Chairs) */
export function diningTable(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // سطح الطاولة
  p.boxB("wood2", 0, 0.76, 0, 1.6, 0.06, 1.0);
  // أرجل الطاولة
  for (const [ox, oz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]] as const) {
    p.boxB("wood2", ox, 0, oz, 0.07, 0.76, 0.07);
  }
  // كرسيان خشبيان
  for (const [cx, cz, cr] of [[0, -0.75, 0], [0, 0.75, Math.PI]] as const) {
    p.boxB("wood2", cx, 0, cz, 0.42, 0.45, 0.42);
    p.boxB("wood2", cx, 0.45, cz + (cr === 0 ? -0.18 : 0.18), 0.42, 0.48, 0.04);
  }
  p.hit(0, 0, 1.8, 1.8);
}

/** موقد غاز مطبخي متكامل مع شفاط (Kitchen Stove & Hood) */
export function kitchenStove(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // جسم الفرن
  p.boxB("white", 0, 0, 0, 0.85, 0.9, 0.75);
  // باب زجاجي للفرن
  p.boxB("glassDark", 0, 0.35, 0.38, 0.65, 0.45, 0.02);
  p.boxB("chrome", 0, 0.62, 0.41, 0.55, 0.03, 0.03);
  // عيون الغاز (4 burners)
  for (const [bx, bz] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]] as const) {
    p.cyl("plastic", bx, 0.91, bz, 0.08, 0.08, 0.02);
  }
  // شفاط الهواء السقفي/الجداري
  p.boxB("chrome", 0, 2.1, 0.05, 0.88, 0.18, 0.75);
  p.cyl("chrome", 0, 2.55, 0, 0.12, 0.12, 0.7);
  p.hit(0, 0, 0.95, 0.85);
}

/** حوض استحمام منزلي كامل (Bathroom Bathtub) */
export function bathroomTub(w: PropCtx, x: number, z: number, ry = 0) {
  const p = new PB(w).group(x, 0, z, ry);
  // حوض الخزف الأبيض
  p.boxB("white", 0, 0, 0, 0.95, 0.65, 1.9);
  // صنبور ومقبض الدش
  p.cyl("chrome", 0, 0.72, -0.85, 0.02, 0.02, 0.14);
  p.cyl("chrome", 0, 1.8, -0.88, 0.015, 0.015, 1.2);
  p.cyl("chrome", 0, 2.05, -0.75, 0.08, 0.06, 0.04, { rx: 0.5 });
  p.hit(0, 0, 1.05, 2.0);
}

/** مشجب ملابس خشبي عمودي (Standing Coat Rack) */
export function coatRack(w: PropCtx, x: number, z: number) {
  const p = new PB(w).group(x, 0, z, 0);
  p.cyl("wood2", 0, 0, 0, 0.28, 0.28, 0.06);
  p.cyl("wood2", 0, 0.06, 0, 0.04, 0.04, 1.85);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    p.cyl("brass", Math.sin(angle) * 0.08, 1.78, Math.cos(angle) * 0.08, 0.012, 0.012, 0.16, { rz: 0.6 * Math.cos(angle), rx: -0.6 * Math.sin(angle) });
  }
}

/** خزانة كتب ومراجع علمية مليئة بالكتب والملفات (Full Bookcase) */
export function bookshelfFull(w: PropCtx, x: number, z: number, ry = 0, width = 1.8, seed = 42) {
  const p = new PB(w).group(x, 0, z, ry);
  const rnd = seededRandom(seed);
  const bookMats = ["carA", "carB", "wood2", "fabric2", "medRed", "medWhite"];
  // هيكل الخزانة
  p.boxB("wood2", 0, 0, 0, width, 2.3, 0.42);
  // رفوف مع كتب ملونة
  for (const lvl of [0.45, 0.95, 1.45, 1.92]) {
    p.boxB("wood2", 0, lvl, 0, width - 0.1, 0.04, 0.4);
    let curX = -width / 2 + 0.14;
    while (curX < width / 2 - 0.18) {
      const bW = 0.04 + rnd() * 0.05;
      const bH = 0.24 + rnd() * 0.14;
      const bD = 0.26 + rnd() * 0.06;
      const tilt = rnd() < 0.15 ? (rnd() - 0.5) * 0.3 : 0;
      p.boxB(bookMats[Math.floor(rnd() * bookMats.length)], curX, lvl + 0.04, 0, bW, bH, bD, { rz: tilt });
      curX += bW + 0.01 + rnd() * 0.02;
    }
  }
  p.hit(0, 0, width + 0.1, 0.5);
}

/** ديكورات وزخارف واجهات المباني الواقعية متعددة الطوابق (Building Exterior Trim) */
export function buildingExteriorTrim(
  w: PropCtx,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  style: "brick" | "concrete" | "hospital" = "brick",
) {
  const p = new PB(w).group(x, 0, z, 0);
  const trimMat = style === "hospital" ? "white" : "concrete";
  const accentMat = style === "hospital" ? "medWhite" : style === "brick" ? "wood2" : "metal";

  // قاعدة المبنى السفلية الحجرية (Plinth Base Course)
  p.boxB(trimMat, 0, 0, -depth / 2, width + 0.44, 0.48, 0.42);
  p.boxB(trimMat, 0, 0, depth / 2, width + 0.44, 0.48, 0.42);
  p.boxB(trimMat, -width / 2, 0, 0, 0.42, 0.48, depth + 0.44);
  p.boxB(trimMat, width / 2, 0, 0, 0.42, 0.48, depth + 0.44);

  // أحزمة معمارية فاصلة بين كل طابق وآخر (Floor Stringcourse Bands كل 4.2م)
  const floors = Math.max(1, Math.round(height / 4.2));
  for (let f = 1; f < floors; f++) {
    const fy = f * 4.2;
    p.boxB(trimMat, 0, fy - 0.14, -depth / 2, width + 0.5, 0.28, 0.48);
    p.boxB(trimMat, 0, fy - 0.14, depth / 2, width + 0.5, 0.28, 0.48);
    p.boxB(trimMat, -width / 2, fy - 0.14, 0, 0.48, 0.28, depth + 0.5);
    p.boxB(trimMat, width / 2, fy - 0.14, 0, 0.48, 0.28, depth + 0.5);
  }

  // أعمدة ركنية بارزة على زوايا المبنى الأربعة (Corner Pilasters)
  for (const [cx, cz] of [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [-width / 2, depth / 2],
    [width / 2, depth / 2],
  ] as const) {
    p.boxB(trimMat, cx, 0, cz, 0.68, height + 0.4, 0.68);
  }

  // حافة السطح العلوية والدروة (Roof Parapet & Cornice)
  p.boxB(trimMat, 0, height - 0.1, -depth / 2, width + 0.62, 0.46, 0.58);
  p.boxB(trimMat, 0, height - 0.1, depth / 2, width + 0.62, 0.46, 0.58);
  p.boxB(trimMat, -width / 2, height - 0.1, 0, 0.58, 0.46, depth + 0.62);
  p.boxB(trimMat, width / 2, height - 0.1, 0, 0.58, 0.46, depth + 0.62);

  // سور دروة السطح (Parapet Wall)
  p.boxB(accentMat, 0, height + 0.36, -depth / 2, width + 0.3, 0.42, 0.32);
  p.boxB(accentMat, 0, height + 0.36, depth / 2, width + 0.3, 0.42, 0.32);
  p.boxB(accentMat, -width / 2, height + 0.36, 0, 0.32, 0.42, depth + 0.3);
  p.boxB(accentMat, width / 2, height + 0.36, 0, 0.32, 0.42, depth + 0.3);

  // مزاريب مياه الأمطار ووحدات تكييف خارجية
  for (const [cx, cz] of [[-width / 2 - 0.12, -depth / 2 - 0.12], [width / 2 + 0.12, -depth / 2 - 0.12]] as const) {
    p.cyl("metal", cx, height / 2, cz, 0.055, 0.055, height);
  }
  p.boxB("metal", width * 0.28, 3.2, depth / 2 + 0.28, 0.85, 0.58, 0.38);
  p.boxB("metal", -width * 0.28, Math.min(height - 1.0, 7.4), -depth / 2 - 0.28, 0.85, 0.58, 0.38);
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

export interface SurvivorRig {
  torso: THREE.Group;
  headG: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  foreL: THREE.Group;
  foreR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
}

/** تحديث وضعية أو حركة مشي الناجي (إما جالس/مصاب أو يركض نحو الميناء أو يقف على متن القارب) */
export function setSurvivorPose(
  g: THREE.Group,
  mode: "initial" | "walk" | "boat",
  walkTime = 0,
  id = "adel",
) {
  const rig = g.userData.rig as SurvivorRig | undefined;
  if (!rig) return;
  const { torso, headG, armL, armR, foreL, foreR, legL, legR, shinL, shinR } = rig;
  const pose = SURVIVOR_POSES[id] ?? SURVIVOR_POSES.adel;

  if (mode === "walk") {
    const s = Math.sin(walkTime);
    const c = Math.cos(walkTime);
    torso.position.y = 1.06 + Math.abs(c) * 0.038;
    torso.rotation.x = 0.14;
    torso.rotation.z = s * 0.03;
    headG.rotation.x = -0.06;
    headG.rotation.y = Math.sin(walkTime * 0.5) * 0.08;

    legL.position.set(-0.11, 0.92, 0);
    legR.position.set(0.11, 0.92, 0);
    legL.rotation.x = s * 0.68;
    legR.rotation.x = -s * 0.68;
    shinL.rotation.x = Math.max(0.08, -s * 0.62);
    shinR.rotation.x = Math.max(0.08, s * 0.62);

    armL.rotation.x = -s * 0.52;
    armR.rotation.x = s * 0.52;
    foreL.rotation.x = -0.45 - Math.max(0, s) * 0.25;
    foreR.rotation.x = -0.45 - Math.max(0, -s) * 0.25;
    return;
  }

  if (mode === "boat") {
    // واقف بأمان على سطح قارب الإخلاء في الميناء مع تنفس وحركة خفيفة
    const breathe = Math.sin(walkTime * 1.8) * 0.015;
    torso.position.y = 1.06 + breathe;
    torso.rotation.set(0.03, 0, 0);
    headG.rotation.set(0, Math.sin(walkTime * 0.7) * 0.18, 0);
    legL.position.set(-0.12, 0.92, 0);
    legR.position.set(0.12, 0.92, 0);
    legL.rotation.x = -0.04;
    legR.rotation.x = 0.04;
    shinL.rotation.x = 0.04;
    shinR.rotation.x = 0.04;
    armL.rotation.x = -0.18;
    foreL.rotation.x = -0.35;
    // تلويح خفيف باليد اليمنى للاعب القادم نحو القارب
    armR.rotation.x = -0.45 + Math.sin(walkTime * 2.2) * 0.12;
    foreR.rotation.x = -0.55;
    return;
  }

  // الوضعية الابتدائية قبل الإنقاذ
  torso.rotation.set(0, 0, 0);
  headG.rotation.set(0, 0, 0);
  if (pose.stance === "sit") {
    torso.position.y = 0.78;
    legL.position.set(-0.11, 0.5, 0);
    legL.rotation.x = -1.4;
    shinL.rotation.x = 1.5;
    legR.position.set(0.11, 0.5, 0);
    legR.rotation.x = -1.4;
    shinR.rotation.x = 1.5;
    armL.rotation.x = -1.9;
    foreL.rotation.x = -1.2;
    armR.rotation.x = -1.9;
    foreR.rotation.x = -1.2;
    headG.rotation.x = 0.3;
  } else if (pose.stance === "crouch") {
    torso.position.y = 0.62;
    torso.rotation.x = 0.35;
    legL.position.set(-0.11, 0.42, 0.05);
    legL.rotation.x = -2.0;
    shinL.rotation.x = 2.1;
    legR.position.set(0.13, 0.42, -0.1);
    legR.rotation.x = -1.1;
    shinR.rotation.x = 1.9;
    armL.rotation.x = -0.7;
    foreL.rotation.x = -0.3;
    armR.rotation.x = -0.4;
    foreR.rotation.x = -0.2;
    headG.rotation.x = 0.15;
  } else {
    torso.position.y = 1.06;
    torso.rotation.x = pose.stance === "lean" ? 0.12 : 0.05;
    legL.position.set(-0.11, 0.92, 0);
    legR.position.set(0.11, 0.92, 0);
    legL.rotation.x = 0;
    legR.rotation.x = 0;
    shinL.rotation.x = 0;
    shinR.rotation.x = 0;
    armL.rotation.x = 0.15;
    foreL.rotation.x = -0.2;
    armR.rotation.x = 0.1;
    foreR.rotation.x = -0.2;
  }
}

/** نموذج ناجٍ مفصلي واقعي مع ملابس وتفاصيل مميزة لكل شخصية */
export function survivorModel(id: string): THREE.Group {
  const pose = SURVIVOR_POSES[id] ?? SURVIVOR_POSES.adel;
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: pose.skin, roughness: 0.85 });
  const shirt = new THREE.MeshStandardMaterial({ color: pose.shirt, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: pose.pants, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: pose.hair, roughness: 0.95 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.8 });

  const mkMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };

  // جذع + تفاصيل الزي (معطف طبي لسارة، سترة عمل وحقيبة لعادل، درع تكتيكي للرقيب)
  const torso = new THREE.Group();
  torso.add(mkMesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), shirt, 0, 0, 0));
  torso.add(mkMesh(new THREE.BoxGeometry(0.43, 0.18, 0.26), pants, 0, -0.30, 0));
  if (id === "sara") {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xd8dedc, roughness: 0.75 });
    torso.add(mkMesh(new THREE.BoxGeometry(0.45, 0.58, 0.26), coatMat, 0, -0.04, -0.01));
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0x22789a, emissive: 0x0a2836, emissiveIntensity: 0.5 });
    torso.add(mkMesh(new THREE.BoxGeometry(0.07, 0.09, 0.02), badgeMat, -0.12, 0.12, 0.135));
  } else if (id === "adel") {
    const packMat = new THREE.MeshStandardMaterial({ color: 0x382e22, roughness: 0.9 });
    torso.add(mkMesh(new THREE.BoxGeometry(0.32, 0.42, 0.16), packMat, 0, 0.02, -0.18));
  } else if (id === "soldier") {
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x283022, roughness: 0.85 });
    torso.add(mkMesh(new THREE.BoxGeometry(0.46, 0.44, 0.28), vestMat, 0, 0.02, 0));
  }

  // رأس وملامح وجه
  const headG = new THREE.Group();
  headG.position.y = 0.43;
  headG.add(mkMesh(new THREE.BoxGeometry(0.22, 0.26, 0.24), skin, 0, 0, 0));
  headG.add(mkMesh(new THREE.BoxGeometry(0.24, 0.11, 0.26), hair, 0, 0.12, -0.01));
  if (id === "soldier") {
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2c3426, roughness: 0.7, metalness: 0.2 });
    headG.add(mkMesh(new THREE.BoxGeometry(0.26, 0.12, 0.28), helmetMat, 0, 0.13, 0));
  }
  torso.add(headG);

  // ذراعان
  const mkArm = (side: number) => {
    const a = new THREE.Group();
    a.position.set(side * 0.27, 0.18, 0);
    a.add(mkMesh(new THREE.BoxGeometry(0.11, 0.30, 0.11), shirt, 0, -0.15, 0));
    const fore = new THREE.Group();
    fore.position.y = -0.30;
    fore.add(mkMesh(new THREE.BoxGeometry(0.095, 0.30, 0.10), skin, 0, -0.15, 0));
    a.add(fore);
    a.userData.fore = fore;
    return a;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  torso.add(armL, armR);

  // ساقان وحذاء
  const mkLeg = () => {
    const l = new THREE.Group();
    l.add(mkMesh(new THREE.BoxGeometry(0.15, 0.42, 0.16), pants, 0, -0.21, 0));
    const shin = new THREE.Group();
    shin.position.y = -0.42;
    shin.add(mkMesh(new THREE.BoxGeometry(0.135, 0.40, 0.145), pants, 0, -0.20, 0));
    shin.add(mkMesh(new THREE.BoxGeometry(0.145, 0.10, 0.22), bootMat, 0, -0.43, 0.03));
    l.add(shin);
    l.userData.shin = shin;
    return l;
  };
  const legL = mkLeg();
  const legR = mkLeg();
  g.add(torso, legL, legR);

  g.userData.rig = {
    torso,
    headG,
    armL,
    armR,
    foreL: armL.userData.fore as THREE.Group,
    foreR: armR.userData.fore as THREE.Group,
    legL,
    legR,
    shinL: legL.userData.shin as THREE.Group,
    shinR: legR.userData.shin as THREE.Group,
  } satisfies SurvivorRig;

  setSurvivorPose(g, "initial", 0, id);

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
  kind: "wood" | "metal" | "double" | "hospital";
}

/**
 * باب حقيقي بمفصلة تُفتح بالتفاعل — يدور حول حافته، مع نافذة رؤية علوية ومقبض ولوح حماية سفلي.
 */
export function makeDoor(width = 1.5, style: "wood" | "metal" | "double" | "hospital" = "wood"): DoorDef {
  const group = new THREE.Group();
  const h = 2.42;
  const leafW = style === "double" ? width / 2 : width;
  const mat =
    style === "metal"
      ? stdMat({ color: 0x3a4045, roughness: 0.45, metalness: 0.75 })
      : style === "hospital"
        ? stdMat({ color: 0xb8c2c4, roughness: 0.4, metalness: 0.25 })
        : stdMat({ color: 0x523b26, roughness: 0.68 });
  const trimMat =
    style === "metal"
      ? stdMat({ color: 0x282c30, roughness: 0.5, metalness: 0.8 })
      : style === "hospital"
        ? stdMat({ color: 0x7c878a, roughness: 0.35, metalness: 0.7 })
        : stdMat({ color: 0x3b2818, roughness: 0.75 });
  const glassMat = stdMat({
    color: 0x7898b0,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.42,
  });
  const handleMat = stdMat({ color: 0xc2b89a, metalness: 0.92, roughness: 0.25 });

  const mkLeaf = (w: number) => {
    const leaf = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat);
    panel.position.set(w / 2, h / 2, 0);
    panel.castShadow = true;
    leaf.add(panel);

    // لوح حماية معدني سفلي (Kickplate)
    const kick = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.26, 0.095), handleMat);
    kick.position.set(w / 2, 0.15, 0);
    leaf.add(kick);

    // حشوة سفلية بارزة + نافذة رؤية علوية زجاجية
    const lowerInset = new THREE.Mesh(new THREE.BoxGeometry(w - 0.26, h * 0.34, 0.1), trimMat);
    lowerInset.position.set(w / 2, h * 0.28, 0);
    leaf.add(lowerInset);

    if (style === "hospital" || style === "double" || style === "metal") {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, h * 0.32, 0.095), trimMat);
      winFrame.position.set(w / 2, h * 0.7, 0);
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, h * 0.26, 0.105), glassMat);
      winGlass.position.set(w / 2, h * 0.7, 0);
      leaf.add(winFrame, winGlass);
    } else {
      const upperInset = new THREE.Mesh(new THREE.BoxGeometry(w - 0.26, h * 0.34, 0.1), trimMat);
      upperInset.position.set(w / 2, h * 0.7, 0);
      leaf.add(upperInset);
    }

    // مقبض ذراعي مزدوج (Lever Handle) على الجهتين
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.11), handleMat);
    plate.position.set(w - 0.14, 1.05, 0);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.15), handleMat);
    lever.position.set(w - 0.18, 1.05, 0);
    leaf.add(plate, lever);

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

// ═══════════════ دمج دلاء الدعائم (مقسّمة إلى قطاعات مكانية Chunks) ═══════════════

export interface WorldChunk {
  group: THREE.Group;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const CHUNK_SIZE = 64;

/**
 * يدمج دلاء PropCtx ضمن قطاعات مكانية (Chunks) متوازنة بحجم 64×64م
 * لتفادي التقطيع أثناء السير وتقليل استدعاءات الرسم (Draw Calls).
 */
export function mergePropBuckets(
  scene: THREE.Scene,
  buckets: Map<string, THREE.BufferGeometry[]>,
  mats: Record<string, THREE.Material>,
  noShadowBuckets = new Set(["glassDark", "glassWindow", "paint", "water", "lampGlow"]),
): WorldChunk[] {
  const cellMap = new Map<
    string,
    {
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      byBucket: Map<string, THREE.BufferGeometry[]>;
    }
  >();

  for (const [bucket, geos] of buckets) {
    if (geos.length === 0 || !mats[bucket]) continue;
    for (const g of geos) {
      const pos = g.attributes.position;
      if (!pos || pos.count === 0) {
        g.dispose();
        continue;
      }
      let gMinX = Infinity;
      let gMaxX = -Infinity;
      let gMinZ = Infinity;
      let gMaxZ = -Infinity;
      const step = Math.max(1, Math.floor(pos.count / 16));
      for (let i = 0; i < pos.count; i += step) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        if (vx < gMinX) gMinX = vx;
        if (vx > gMaxX) gMaxX = vx;
        if (vz < gMinZ) gMinZ = vz;
        if (vz > gMaxZ) gMaxZ = vz;
      }
      const cx = (gMinX + gMaxX) * 0.5;
      const cz = (gMinZ + gMaxZ) * 0.5;
      const key = `${Math.floor(cx / CHUNK_SIZE)},${Math.floor(cz / CHUNK_SIZE)}`;
      let cell = cellMap.get(key);
      if (!cell) {
        cell = {
          minX: gMinX,
          maxX: gMaxX,
          minZ: gMinZ,
          maxZ: gMaxZ,
          byBucket: new Map(),
        };
        cellMap.set(key, cell);
      } else {
        if (gMinX < cell.minX) cell.minX = gMinX;
        if (gMaxX > cell.maxX) cell.maxX = gMaxX;
        if (gMinZ < cell.minZ) cell.minZ = gMinZ;
        if (gMaxZ > cell.maxZ) cell.maxZ = gMaxZ;
      }
      let list = cell.byBucket.get(bucket);
      if (!list) {
        list = [];
        cell.byBucket.set(bucket, list);
      }
      list.push(g);
    }
  }

  const chunks: WorldChunk[] = [];
  for (const [, cell] of cellMap) {
    const group = new THREE.Group();
    for (const [bucket, geos] of cell.byBucket) {
      const mat = mats[bucket];
      if (!mat || geos.length === 0) continue;
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !noShadowBuckets.has(bucket);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    if (group.children.length > 0) {
      scene.add(group);
      chunks.push({
        group,
        minX: cell.minX - 2,
        maxX: cell.maxX + 2,
        minZ: cell.minZ - 2,
        maxZ: cell.maxZ + 2,
      });
    }
  }
  return chunks;
}
