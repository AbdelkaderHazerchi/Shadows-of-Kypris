"use client";

// ─────────────────────────────────────────────────────────────
// الوحوش — أجساد مفصلية كاملة (rig) لكل عدو:
//   حوض → جذع → رأس (+ فك) + ذراعان (عضد/ساعد/كف) + ساقان (فخذ/ساق/قدم)
//   متجول (4 أشكال)، ساعٍ، نافث الحمض (رشقات حمض)، متحوّل عملاق، الحارس (زعيم)
// الذكاء: تجوال / مطاردة / هجوم / اندفاع / رشق بعيد / سماع الضوضاء / خط الرؤية
// كل الأشكال إجرائية بالكامل عبر Three.js — لا نماذج خارجية.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";
import { ENEMIES } from "./content";
import type { Collider, SpawnPoint } from "./world";
import type { EnemyKind } from "./types";
import { audio } from "./audio";

// ── فيزياء مشتركة: دائرة ضد AABB (مع مراعاة الارتفاع الرأسي للطوابق) ──
export function collideCircle(
  p: { x: number; z: number },
  r: number,
  colliders: Collider[],
  minY = 0,
  maxY = 1.75,
) {
  for (const c of colliders) {
    if (c.minY !== undefined || c.maxY !== undefined) {
      const cMinY = c.minY ?? 0;
      const cMaxY = c.maxY ?? 4.2;
      if (maxY <= cMinY + 0.08 || minY >= cMaxY - 0.18) continue;
    }
    const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.0001;
      if (d2 === 0) {
        // داخل الصندوق — ادفع لأقرب حافة
        const left = p.x - c.minX;
        const right = c.maxX - p.x;
        const top = p.z - c.minZ;
        const bottom = c.maxZ - p.z;
        const m = Math.min(left, right, top, bottom);
        if (m === left) p.x = c.minX - r;
        else if (m === right) p.x = c.maxX + r;
        else if (m === top) p.z = c.minZ - r;
        else p.z = c.maxZ + r;
      } else {
        const push = (r - d) / d;
        p.x += dx * push;
        p.z += dz * push;
      }
    }
  }
}

export function segmentBlocked(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  colliders: Collider[],
  y = 1.0,
): boolean {
  const steps = Math.min(60, Math.max(4, Math.floor(Math.hypot(x2 - x1, z2 - z1) / 1.2)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const z = z1 + (z2 - z1) * t;
    for (const c of colliders) {
      if (c.minY !== undefined || c.maxY !== undefined) {
        const cMinY = c.minY ?? 0;
        const cMaxY = c.maxY ?? 4.2;
        if (y < cMinY || y > cMaxY) continue;
      }
      if (x > c.minX - 0.1 && x < c.maxX + 0.1 && z > c.minZ - 0.1 && z < c.maxZ + 0.1) {
        return true;
      }
    }
  }
  return false;
}

// ── أصوات: مفاتيح موجودة + مفاتيح جديدة يضيفها ملف الصوت لاحقًا (spit / acid_hit / thud) ──
type PlayArgs = Parameters<typeof audio.play>;
type ExtraSfx = "spit" | "acid_hit" | "thud";
function sfx(name: PlayArgs[0] | ExtraSfx, opts?: PlayArgs[1]) {
  audio.play(name as PlayArgs[0], opts);
}

type EnemyState = "idle" | "chase" | "attack" | "charge" | "stagger" | "dead";

export interface EnemyHooks {
  damagePlayer: (n: number, fromX: number, fromZ: number) => void;
  onDeath: (e: Enemy) => void;
  spawnAdds: (x: number, z: number, kind: EnemyKind, n: number) => void;
}

// ═════════════════════════════════════════════════════════════
// ذاكرات مشتركة — هندسات / قماشات Canvas / خامات
// ═════════════════════════════════════════════════════════════

const geoCache = new Map<string, THREE.BufferGeometry>();
function cachedGeo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}
const boxGeo = (w: number, h: number, d: number) =>
  cachedGeo(`b${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d));
const sphGeo = (r: number, seg = 8) =>
  cachedGeo(`s${r.toFixed(3)},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(4, seg >> 1)));
const cylGeo = (rt: number, rb: number, h: number, seg = 10) =>
  cachedGeo(`c${rt.toFixed(3)},${rb.toFixed(3)},${h.toFixed(3)},${seg}`, () =>
    new THREE.CylinderGeometry(rt, rb, h, seg),
  );
const coneGeo = (r: number, h: number, seg = 6) =>
  cachedGeo(`k${r.toFixed(3)},${h.toFixed(3)},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const torusGeo = (r: number, t: number, arc: number) =>
  cachedGeo(`t${r.toFixed(3)},${t.toFixed(3)},${arc.toFixed(2)}`, () =>
    new THREE.TorusGeometry(r, t, 6, 12, arc),
  );
const circleGeo = (r: number, seg: number) =>
  cachedGeo(`o${r.toFixed(3)},${seg}`, () => new THREE.CircleGeometry(r, seg));

const texCache = new Map<string, THREE.CanvasTexture>();
function cachedTex(key: string, draw: (ctx: CanvasRenderingContext2D, px: number) => void) {
  let t = texCache.get(key);
  if (!t) {
    const px = 128;
    const cv = document.createElement("canvas");
    cv.width = px;
    cv.height = px;
    const ctx = cv.getContext("2d");
    if (ctx) draw(ctx, px);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    texCache.set(key, t);
  }
  return t;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function cachedMat(key: string, make: () => THREE.MeshStandardMaterial) {
  let m = matCache.get(key);
  if (!m) {
    m = make();
    matCache.set(key, m);
  }
  return m;
}

// ── قماشة جلد ميت — بقعة أساس + عروق داكنة + تعفن + دم (تباين لوني لكل نوع) ──
const SKIN_PAL: Record<EnemyKind, { base: string; vein: string; rot: string }> = {
  walker: { base: "#a8ad96", vein: "#525a48", rot: "#4a1512" },
  runner: { base: "#9c8276", vein: "#5a4238", rot: "#571712" },
  spitter: { base: "#8ea378", vein: "#42553a", rot: "#4a3413" },
  brute: { base: "#8d9482", vein: "#3a413a", rot: "#451410" },
  boss: { base: "#9a9e96", vein: "#484c4e", rot: "#3e1010" },
};

function skinTexture(kind: EnemyKind, variant: number) {
  return cachedTex(`skinTex:${kind}:${variant}`, (ctx, px) => {
    const pal = SKIN_PAL[kind];
    ctx.fillStyle = pal.base;
    ctx.fillRect(0, 0, px, px);
    // تنقيط الجلد الميت
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle =
        Math.random() < 0.5 ? "rgba(30,34,26,0.10)" : "rgba(222,226,210,0.07)";
      ctx.beginPath();
      ctx.arc(Math.random() * px, Math.random() * px, 1 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // عروق داكنة متعرجة
    ctx.strokeStyle = pal.vein;
    for (let i = 0; i < 11; i++) {
      ctx.globalAlpha = 0.32 + Math.random() * 0.3;
      ctx.lineWidth = 0.8 + Math.random() * 1.4;
      ctx.beginPath();
      let x = Math.random() * px;
      let y = Math.random() * px;
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (Math.random() - 0.5) * 36;
        y += (Math.random() - 0.5) * 36;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // بقع تعفن (أعمق للمتحوّل)
    const patches = kind === "brute" ? 7 : 4;
    for (let i = 0; i < patches; i++) {
      const x = Math.random() * px;
      const y = Math.random() * px;
      const r = 7 + Math.random() * 16;
      const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, "rgba(24,28,20,0.5)");
      grad.addColorStop(1, "rgba(24,28,20,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // بقع دم متحجرة
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * px;
      const y = Math.random() * px;
      const r = 4 + Math.random() * 10;
      ctx.globalAlpha = 0.45 + Math.random() * 0.3;
      ctx.fillStyle = pal.rot;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // تباين لوني لتنويعات المتجول
    if (kind === "walker" && variant > 0) {
      ctx.fillStyle =
        variant === 1
          ? "rgba(120,90,60,0.10)"
          : variant === 2
            ? "rgba(70,100,80,0.10)"
            : "rgba(90,70,80,0.10)";
      ctx.fillRect(0, 0, px, px);
    }
  });
}

// ── قماشة قماش ممزق — نسيج + وسخ + تمزقات + دم ──
function clothTexture(base: number) {
  return cachedTex(`clothTex:${base}`, (ctx, px) => {
    ctx.fillStyle = "#" + base.toString(16).padStart(6, "0");
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    for (let y = 0; y < px; y += 3) ctx.fillRect(0, y, px, 1);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let x = 0; x < px; x += 4) ctx.fillRect(x, 0, 1, px);
    // وسخ تراكمي
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * px;
      const y = Math.random() * px;
      const r = 4 + Math.random() * 14;
      const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, "rgba(14,12,8,0.34)");
      grad.addColorStop(1, "rgba(14,12,8,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // مناطق باهتة مهترئة
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(150,140,118,0.12)";
      ctx.fillRect(Math.random() * px, Math.random() * px, 6 + Math.random() * 14, 3 + Math.random() * 5);
    }
    // دم قديم
    for (let i = 0; i < 2; i++) {
      const x = Math.random() * px;
      const y = px * 0.45 + Math.random() * px * 0.5;
      ctx.fillStyle = "rgba(58,10,8,0.5)";
      ctx.beginPath();
      ctx.arc(x, y, 4 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// تظليل جلد لكل نوع/تنويعة (يُضرب بلون القماشة)
const SKIN_TINT: Record<EnemyKind, number[]> = {
  walker: [0xc9cec0, 0xbac2b2, 0xc4c9ba, 0xaab2a2],
  runner: [0xc8b3a8, 0xbfa9a0, 0xc0ae9e, 0xb6a498],
  spitter: [0xb9c9a6, 0xb2c2a0],
  brute: [0xaab2a0],
  boss: [0xb4b8b0],
};

function skinBaseMat(kind: EnemyKind, variant: number) {
  const tints = SKIN_TINT[kind];
  const tint = tints[Math.min(variant, tints.length - 1)];
  return cachedMat(`skin:${kind}:${variant}`, () =>
    new THREE.MeshStandardMaterial({
      map: skinTexture(kind, variant),
      color: tint,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );
}

function clothMat(base: number) {
  return cachedMat(`cloth:${base}`, () =>
    new THREE.MeshStandardMaterial({ map: clothTexture(base), roughness: 0.95 }),
  );
}

// ── عيون متوهجة لكل نوع ──
const EYE_DEF: Record<EnemyKind, { c: number; e: number; i: number }> = {
  walker: { c: 0x110000, e: 0x7a1810, i: 1.6 },
  runner: { c: 0x110000, e: 0x7a1810, i: 1.7 },
  spitter: { c: 0x0a1000, e: 0x4a8a20, i: 1.9 },
  brute: { c: 0x100800, e: 0xd86418, i: 1.8 },
  boss: { c: 0x180000, e: 0xff2818, i: 3 },
};
const eyeMat = (kind: EnemyKind) => {
  const d = EYE_DEF[kind];
  return cachedMat(`eye:${kind}`, () =>
    new THREE.MeshStandardMaterial({
      color: d.c,
      emissive: d.e,
      emissiveIntensity: d.i,
      roughness: 0.4,
    }),
  );
};

// خامات صغيرة مشتركة
const ribMat = cachedMat("rib", () => new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.9 }));
const boneMat = cachedMat("bone", () => new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 0.8 }));
const teethMat = cachedMat("teeth", () => new THREE.MeshStandardMaterial({ color: 0xb8ac96, roughness: 0.7 }));
const hairMat = cachedMat("hair", () => new THREE.MeshStandardMaterial({ color: 0x1d1712, roughness: 0.92 }));
const metalMat = cachedMat("metalPlate", () =>
  new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.35, metalness: 0.85 }),
);
const stumpMat = cachedMat("stump", () => new THREE.MeshStandardMaterial({ color: 0x4a0d0d, roughness: 0.85 }));
const pustuleMat = cachedMat("pustule", () =>
  new THREE.MeshStandardMaterial({
    color: 0x2a3d14,
    emissive: 0x6aff30,
    emissiveIntensity: 1.1,
    roughness: 0.5,
  }),
);
const coreMat = cachedMat("bossCore", () =>
  new THREE.MeshStandardMaterial({
    color: 0x220a04,
    emissive: 0xff5518,
    emissiveIntensity: 2.2,
    roughness: 0.4,
  }),
);
const corpseMat = cachedMat("corpse", () =>
  new THREE.MeshStandardMaterial({ map: skinTexture("walker", 0), color: 0x6f7466, roughness: 0.95 }),
);
const bloodPoolMat = new THREE.MeshBasicMaterial({
  color: 0x2e0705,
  transparent: true,
  opacity: 0.88,
  depthWrite: false,
});

// ── جثة راقدة (خدعة النهوض) — كتلتان + طرف + بركة دم ──
function makeCorpseProp(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(sphGeo(0.3, 10), corpseMat);
  body.scale.set(1.45, 0.42, 0.8);
  body.position.y = 0.13;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(sphGeo(0.16, 8), corpseMat);
  head.scale.set(1, 0.8, 1);
  head.position.set(0.52, 0.1, 0.06);
  head.castShadow = true;
  g.add(head);
  const arm = new THREE.Mesh(boxGeo(0.09, 0.09, 0.42), corpseMat);
  arm.position.set(0.08, 0.05, 0.36);
  arm.rotation.y = 0.55;
  arm.castShadow = true;
  g.add(arm);
  const pool = new THREE.Mesh(circleGeo(0.9, 16), bloodPoolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.015;
  pool.scale.set(1.3, 0.8, 1);
  g.add(pool);
  g.rotation.y = Math.random() * Math.PI * 2;
  return g;
}

// ═════════════════════════════════════════════════════════════
// الحمض — قذائف نافث الحمض + جزيئات التناثر (قائمة على مستوى الوحدة)
// ═════════════════════════════════════════════════════════════

const ACID_G = 9;
let worldScene: THREE.Scene | null = null;

interface AcidBall {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  dmg: number;
  t: number;
}
interface AcidPart {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

const acidBalls: AcidBall[] = [];
const acidParts: AcidPart[] = [];
const acidMat = cachedMat("acid", () =>
  new THREE.MeshStandardMaterial({
    color: 0x2f4d12,
    emissive: 0x74ff38,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  }),
);
const acidGeo = sphGeo(0.09, 8);
const acidPartGeo = sphGeo(0.045, 6);

function pointInWall(x: number, z: number, colliders: Collider[]): boolean {
  for (const c of colliders) {
    if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
  }
  return false;
}

function acidSplash(
  x: number,
  y: number,
  z: number,
  hitPlayer: boolean,
  dmg: number,
  hooks: EnemyHooks,
) {
  sfx("acid_hit", { volume: 0.7 });
  if (hitPlayer) hooks.damagePlayer(dmg, x, z);
  const scene = worldScene;
  if (!scene) return;
  for (let k = 0; k < 5; k++) {
    const mesh = new THREE.Mesh(acidPartGeo, acidMat);
    mesh.position.set(x, y + 0.06, z);
    const a = (k / 5) * Math.PI * 2 + Math.random();
    mesh.scale.setScalar(0.5 + Math.random() * 0.5);
    scene.add(mesh);
    acidParts.push({
      mesh,
      vx: Math.cos(a) * (0.6 + Math.random()),
      vy: 1.4 + Math.random() * 1.6,
      vz: Math.sin(a) * (0.6 + Math.random()),
      life: 0.45 + Math.random() * 0.25,
    });
  }
}

function stepAcidFx(dt: number, player: THREE.Vector3, hooks: EnemyHooks, colliders: Collider[]) {
  const scene = worldScene;
  if (!scene) return;
  // قذائف
  for (let i = acidBalls.length - 1; i >= 0; i--) {
    const b = acidBalls[i];
    b.t -= dt;
    b.vy -= ACID_G * dt;
    const m = b.mesh.position;
    m.x += b.vx * dt;
    m.y += b.vy * dt;
    m.z += b.vz * dt;
    const dp = Math.hypot(m.x - player.x, m.z - player.z);
    if (m.y <= 0.05 || dp < 1.0 || b.t <= 0 || m.y > 14 || pointInWall(m.x, m.z, colliders)) {
      acidSplash(m.x, Math.max(0.05, m.y), m.z, dp < 1.2, b.dmg, hooks);
      scene.remove(b.mesh);
      acidBalls.splice(i, 1);
    }
  }
  // جزيئات
  for (let i = acidParts.length - 1; i >= 0; i--) {
    const p = acidParts[i];
    p.life -= dt;
    p.vy -= ACID_G * 1.6 * dt;
    const m = p.mesh.position;
    m.x += p.vx * dt;
    m.y += p.vy * dt;
    m.z += p.vz * dt;
    if (p.life <= 0 || m.y < 0.02) {
      scene.remove(p.mesh);
      acidParts.splice(i, 1);
    }
  }
}

function clearAcidFx() {
  const scene = worldScene;
  if (scene) {
    for (const b of acidBalls) scene.remove(b.mesh);
    for (const p of acidParts) scene.remove(p.mesh);
  }
  acidBalls.length = 0;
  acidParts.length = 0;
}

// ═════════════════════════════════════════════════════════════
// بنية الهيكل المفصلي
// ═════════════════════════════════════════════════════════════

interface EnemyRig {
  pelvis: THREE.Group;
  torso: THREE.Group;
  headG: THREE.Group;
  jaw: THREE.Group;
  armLU: THREE.Group;
  armRU: THREE.Group;
  foreLU: THREE.Group;
  foreRU: THREE.Group;
  legLU: THREE.Group;
  legRU: THREE.Group;
  shinLU: THREE.Group;
  shinRU: THREE.Group;
  pelvisY: number;
  torsoBaseX: number;
  torsoBaseZ: number;
  headBaseX: number;
  jawBase: number;
  cadence: number;
  bend: number;
  legAmpL: number;
  legAmpR: number;
  legPhaseL: number;
  legPhaseR: number;
  armBaseX: number;
  foreBaseX: number;
  armSwingL: number;
  armSwingR: number;
  armFreqL: number;
  armFreqR: number;
  armPhaseL: number;
  armPhaseR: number;
  rollAmp: number;
  bobAmp: number;
  abdomen: THREE.Mesh | null;
  coatL: THREE.Group | null;
  coatR: THREE.Group | null;
  coreLight: THREE.PointLight | null;
}

const PELVIS_Y = 0.95;
const _mv = new THREE.Vector3();

let enemyUid = 0;

export class Enemy {
  id = ++enemyUid;
  def = ENEMIES.walker;
  kind: EnemyKind = "walker";
  group = new THREE.Group();
  head!: THREE.Mesh;
  hp = 100;
  state: EnemyState = "idle";
  homeX = 0;
  homeZ = 0;
  wanderR = 6;
  targetX = 0;
  targetZ = 0;
  attackCd = 0;
  specialCd = 0;
  groanCd = Math.random() * 5 + 2;
  staggerT = 0;
  deadT = 0;
  phase = Math.random() * Math.PI * 2;
  losT = Math.random();
  canSee = false;
  heardX = 0;
  heardZ = 0;
  hasHeard = false;
  spawnAddsDone = false;
  fakeCorpseProp: THREE.Group | null = null;
  wanderT = 0;
  chargeVX = 0;
  chargeVZ = 0;

  // حالة داخلية للرسم
  private rig: EnemyRig | null = null;
  private skinMat: THREE.MeshStandardMaterial | null = null;
  private skinFlash = 0;
  private animT = Math.random() * 10;
  private playerDist = 999;
  private scaleF = 1;
  private spitWindup = 0;
  private spitRecoil = 0;
  private fallDir = 1;
  private lastStepSign = 0;
  private sprawlLX = 0.5;
  private sprawlLZ = 0.6;
  private sprawlRX = 0.4;
  private sprawlRZ = -0.5;

  constructor(kind: EnemyKind, x: number, z: number, wander: number) {
    this.kind = kind;
    this.def = ENEMIES[kind];
    this.hp = this.def.hp;
    this.homeX = x;
    this.homeZ = z;
    this.wanderR = wander;
    this.targetX = x;
    this.targetZ = z;
    this.build();
    this.group.position.set(x, 0, z);
  }

  // ───────────────────────── بناء الجسد ─────────────────────────
  private build() {
    const kind = this.kind;
    const S = kind === "boss" ? 2.1 : kind === "brute" ? 1.6 : 1;
    this.scaleF = S;

    // تنويعة المتجول (0..3)
    const variant = kind === "walker" ? Math.floor(Math.random() * 4) : 0;
    const missingArmL = kind === "walker" && variant === 3;
    const showRibs = kind === "brute" || (kind === "walker" && (variant === 1 || variant === 2));
    const showHair = (kind === "walker" && (variant === 0 || variant === 2)) || kind === "runner";

    // ── خامات ──
    const skin = skinBaseMat(kind, variant).clone(); // نسخة خاصة لكل عدو (وميض الإصابة)
    skin.color.offsetHSL((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.05);
    this.skinMat = skin;
    const pants = clothMat(0x1e1c18);
    const boots = clothMat(0x14120f);
    let shirtColor = 0x2e2a24;
    if (kind === "walker") shirtColor = [0x2e2a24, 0x3a2f26, 0x25302a, 0x312321][variant];
    else if (kind === "runner") shirtColor = 0x33231f;
    else if (kind === "brute") shirtColor = 0x26291f;
    else shirtColor = 0x1c1f1c;
    const shirt = clothMat(shirtColor);
    const eyeM = eyeMat(kind);

    const g = this.group;
    g.scale.setScalar(S);

    // ── الحوض ──
    const pelvis = new THREE.Group();
    pelvis.position.y = PELVIS_Y;
    g.add(pelvis);
    const pelvisMesh = new THREE.Mesh(boxGeo(0.34, 0.2, 0.24), pants);
    pelvisMesh.castShadow = true;
    pelvis.add(pelvisMesh);

    // ── الجذع ──
    const torso = new THREE.Group();
    torso.position.y = 0.1;
    pelvis.add(torso);

    const chestW = kind === "runner" ? 0.36 : kind === "brute" ? 0.6 : kind === "spitter" ? 0.44 : kind === "boss" ? 0.46 : 0.42;
    const chestD = kind === "brute" ? 0.3 : kind === "boss" ? 0.28 : 0.26;
    const chest = new THREE.Mesh(boxGeo(chestW, 0.52, chestD), kind === "brute" ? skin : shirt);
    chest.position.y = 0.32;
    chest.castShadow = true;
    torso.add(chest);
    // بطن مكشوف متعفن تحت القميص
    if (kind !== "brute") {
      const belly = new THREE.Mesh(boxGeo(chestW - 0.08, 0.16, chestD - 0.02), skin);
      belly.position.y = 0.03;
      belly.castShadow = true;
      torso.add(belly);
    }
    // جرح دموي
    if (kind !== "brute" && kind !== "boss") {
      const wound = new THREE.Mesh(boxGeo(0.13, 0.22, 0.02), stumpMat);
      wound.position.set(0.09, 0.36, chestD / 2 + 0.005);
      torso.add(wound);
    }
    // أضلاع ظاهرة
    const addRibs = (parent: THREE.Group, r: number, z: number) => {
      for (let i = 0; i < 3; i++) {
        const rib = new THREE.Mesh(torusGeo(r - i * 0.015, 0.012, Math.PI), ribMat);
        rib.position.set(0, 0.24 + i * 0.09, z);
        rib.rotation.x = 0.14;
        rib.castShadow = true;
        parent.add(rib);
      }
    };
    if (showRibs) addRibs(torso, kind === "brute" ? 0.2 : 0.14, kind === "brute" ? 0.155 : 0.135);
    // أشواك ظهرية للمتحوّل
    if (kind === "brute") {
      for (let i = 0; i < 4; i++) {
        const spike = new THREE.Mesh(coneGeo(0.07, 0.3, 5), skin);
        spike.position.set((Math.random() - 0.5) * 0.4, 0.28 + Math.random() * 0.28, -0.17);
        spike.rotation.x = -(0.6 + Math.random() * 0.5);
        spike.castShadow = true;
        torso.add(spike);
      }
    }

    // بطن منتفخ + حبوب لإصبع القدم... لا — للنافث
    let abdomen: THREE.Mesh | null = null;
    if (kind === "spitter") {
      abdomen = new THREE.Mesh(sphGeo(0.24, 10), skin);
      abdomen.scale.set(1.05, 1.35, 1.0);
      abdomen.position.set(0, 0.02, 0.02);
      abdomen.castShadow = true;
      torso.add(abdomen);
      abdomen.userData.baseS = [1.05, 1.35, 1.0];
      // حبوب سامّة متوهجة
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(sphGeo(0.032 + Math.random() * 0.02, 8), pustuleMat);
        const back = Math.random() < 0.35;
        p.position.set(
          (Math.random() - 0.5) * (chestW - 0.06),
          0.16 + Math.random() * 0.3,
          back ? -(chestD / 2 + 0.02) : chestD / 2 + 0.02,
        );
        p.castShadow = true;
        torso.add(p);
      }
    }

    // ── الزعيم: معطف + نواة + كتفيان مدرّعتان ──
    let coatL: THREE.Group | null = null;
    let coatR: THREE.Group | null = null;
    let coreLight: THREE.PointLight | null = null;
    if (kind === "boss") {
      // ياقة
      const collar = new THREE.Mesh(boxGeo(0.5, 0.1, 0.32), shirt);
      collar.position.set(0, 0.58, -0.02);
      collar.rotation.x = 0.14;
      collar.castShadow = true;
      torso.add(collar);
      // لوحتان أماميتان طويلتان للمعطف
      const coatPanel = boxGeo(0.42, 0.78, 0.05);
      coatL = new THREE.Group();
      coatL.position.set(-0.16, 0.5, 0.18);
      const coatLMesh = new THREE.Mesh(coatPanel, shirt);
      coatLMesh.position.y = -0.39;
      coatLMesh.castShadow = true;
      coatL.add(coatLMesh);
      torso.add(coatL);
      coatR = new THREE.Group();
      coatR.position.set(0.16, 0.5, 0.18);
      const coatRMesh = new THREE.Mesh(coatPanel, shirt);
      coatRMesh.position.y = -0.39;
      coatRMesh.castShadow = true;
      coatR.add(coatRMesh);
      torso.add(coatR);
      // نواة صدر متوهجة
      const core = new THREE.Mesh(cylGeo(0.09, 0.09, 0.05, 12), coreMat);
      core.rotation.x = Math.PI / 2;
      core.position.set(0, 0.34, chestD / 2 + 0.02);
      torso.add(core);
      // كتفيان مدرّعتان
      const plateGeo = boxGeo(0.28, 0.07, 0.3);
      const plateL = new THREE.Mesh(plateGeo, metalMat);
      plateL.position.set(-0.33, 0.56, 0);
      plateL.rotation.z = 0.28;
      plateL.castShadow = true;
      torso.add(plateL);
      const plateR = new THREE.Mesh(plateGeo, metalMat);
      plateR.position.set(0.33, 0.56, 0);
      plateR.rotation.z = -0.28;
      plateR.castShadow = true;
      torso.add(plateR);
    }

    // ── الرأس ──
    const headG = new THREE.Group();
    headG.position.y = kind === "brute" ? 0.52 : 0.6;
    if (kind === "brute") headG.scale.setScalar(0.82);
    torso.add(headG);
    const skull = new THREE.Mesh(boxGeo(0.24, 0.27, 0.25), skin);
    skull.position.y = 0.13;
    skull.castShadow = true;
    skull.userData.isHead = true;
    headG.add(skull);
    this.head = skull;
    // فك سفلي
    const jaw = new THREE.Group();
    jaw.position.set(0, 0.02, 0.015);
    headG.add(jaw);
    const jawMesh = new THREE.Mesh(boxGeo(0.18, 0.08, 0.21), skin);
    jawMesh.position.set(0, -0.04, 0.03);
    jawMesh.castShadow = true;
    jawMesh.userData.isHead = true;
    jaw.add(jawMesh);
    const teeth = new THREE.Mesh(boxGeo(0.16, 0.025, 0.02), teethMat);
    teeth.position.set(0, 0.002, 0.125);
    teeth.userData.isHead = true;
    jaw.add(teeth);
    // عينان متوهجتان
    const eyeGeo = sphGeo(0.03, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeM);
    eyeL.position.set(-0.056, 0.16, 0.115);
    eyeL.userData.isHead = true;
    const eyeR = new THREE.Mesh(eyeGeo, eyeM);
    eyeR.position.set(0.056, 0.16, 0.115);
    eyeR.userData.isHead = true;
    headG.add(eyeL, eyeR);
    if (showHair) {
      const hair = new THREE.Mesh(boxGeo(0.25, 0.1, 0.26), hairMat);
      hair.position.set(0, 0.245, -0.015);
      hair.userData.isHead = true;
      headG.add(hair);
    }
    if (kind === "boss") {
      // نصف قناع معدني
      const mask = new THREE.Mesh(boxGeo(0.17, 0.12, 0.03), metalMat);
      mask.position.set(0, 0.22, 0.128);
      mask.userData.isHead = true;
      headG.add(mask);
    }

    // ── الذراعان (كتف → عضد → ساعد → كف) ──
    const mkArm = (
      side: 1 | -1,
      uw: number,
      ul: number,
      fw: number,
      fl: number,
      hw: number,
      hh: number,
      hd: number,
      sleeve: THREE.Material,
    ) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * (0.24 + uw * 0.5), 0.5, 0);
      const upper = new THREE.Mesh(boxGeo(uw, ul, uw), sleeve);
      upper.position.y = -ul / 2;
      upper.castShadow = true;
      shoulder.add(upper);
      const fore = new THREE.Group();
      fore.position.y = -ul;
      const foreMesh = new THREE.Mesh(boxGeo(fw, fl, fw), skin);
      foreMesh.position.y = -fl / 2;
      foreMesh.castShadow = true;
      fore.add(foreMesh);
      const hand = new THREE.Mesh(boxGeo(hw, hh, hd), skin);
      hand.position.y = -fl - hh / 2 + 0.02;
      hand.castShadow = true;
      fore.add(hand);
      shoulder.add(fore);
      torso.add(shoulder);
      return { shoulder, fore };
    };

    let armLU: THREE.Group;
    let foreLU: THREE.Group;
    let armRU: THREE.Group;
    let foreRU: THREE.Group;

    if (kind === "brute") {
      // الذراع اليسرى عادية نسبيًا
      const L = mkArm(-1, 0.14, 0.34, 0.12, 0.32, 0.12, 0.13, 0.07, skin);
      armLU = L.shoulder;
      foreLU = L.fore;
      // اليمنى ضخمة بشكل مفرط + قبضة نادي + شوكتان عظميتان
      const R = mkArm(1, 0.26, 0.44, 0.22, 0.46, 0.3, 0.3, 0.28, skin);
      armRU = R.shoulder;
      foreRU = R.fore;
      for (let i = 0; i < 2; i++) {
        const spike = new THREE.Mesh(coneGeo(0.045, 0.24, 5), boneMat);
        spike.position.set(0.08 - i * 0.16, -0.5, 0.05);
        spike.rotation.x = Math.PI * (0.78 + i * 0.1);
        spike.castShadow = true;
        R.fore.add(spike);
      }
    } else if (kind === "boss") {
      const L = mkArm(-1, 0.13, 0.34, 0.11, 0.33, 0.15, 0.16, 0.1, shirt);
      armLU = L.shoulder;
      foreLU = L.fore;
      const R = mkArm(1, 0.13, 0.34, 0.11, 0.33, 0.15, 0.16, 0.1, shirt);
      armRU = R.shoulder;
      foreRU = R.fore;
    } else if (kind === "runner") {
      const L = mkArm(-1, 0.09, 0.3, 0.08, 0.28, 0.08, 0.11, 0.05, shirt);
      armLU = L.shoulder;
      foreLU = L.fore;
      const R = mkArm(1, 0.09, 0.3, 0.08, 0.28, 0.08, 0.11, 0.05, shirt);
      armRU = R.shoulder;
      foreRU = R.fore;
    } else {
      if (missingArmL) {
        // مجموعات فارغة فقط — تحل محلها الجذعة المبتورة
        armLU = new THREE.Group();
        foreLU = new THREE.Group();
      } else {
        const L = mkArm(-1, 0.11, 0.3, 0.09, 0.3, 0.09, 0.12, 0.06, shirt);
        armLU = L.shoulder;
        foreLU = L.fore;
      }
      const R = mkArm(1, 0.11, 0.3, 0.09, 0.3, 0.09, 0.12, 0.06, shirt);
      armRU = R.shoulder;
      foreRU = R.fore;
    }
    // ذراع مفقودة (تنويعة المتجول 3) — جذع مبتور
    if (missingArmL) {
      const stump = new THREE.Mesh(boxGeo(0.12, 0.15, 0.12), skin);
      stump.position.set(-0.3, 0.44, 0);
      stump.castShadow = true;
      torso.add(stump);
      const cap = new THREE.Mesh(sphGeo(0.055, 6), stumpMat);
      cap.position.set(-0.3, 0.37, 0);
      torso.add(cap);
    }

    // ── الساقان (ورك → فخذ → ساق → قدم) ──
    const mkLeg = (side: 1 | -1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.12, -0.04, 0);
      const thigh = new THREE.Mesh(boxGeo(0.15, 0.44, 0.16), pants);
      thigh.position.y = -0.22;
      thigh.castShadow = true;
      hip.add(thigh);
      const shin = new THREE.Group();
      shin.position.y = -0.44;
      const shinMesh = new THREE.Mesh(boxGeo(0.12, 0.42, 0.13), pants);
      shinMesh.position.y = -0.21;
      shinMesh.castShadow = true;
      shin.add(shinMesh);
      const foot = new THREE.Mesh(boxGeo(0.11, 0.07, 0.26), boots);
      foot.position.set(0, -0.425, 0.06);
      foot.castShadow = true;
      shin.add(foot);
      hip.add(shin);
      pelvis.add(hip);
      return { hip, shin };
    };
    const legL = mkLeg(-1);
    const legR = mkLeg(1);

    // ── معاملات الحركة لكل نوع ──
    const rig: EnemyRig = {
      pelvis,
      torso,
      headG,
      jaw,
      armLU,
      armRU,
      foreLU,
      foreRU,
      legLU: legL.hip,
      legRU: legR.hip,
      shinLU: legL.shin,
      shinRU: legR.shin,
      pelvisY: PELVIS_Y,
      torsoBaseX: 0.18,
      torsoBaseZ: 0,
      headBaseX: -0.08,
      jawBase: 0.1,
      cadence: 5.0,
      bend: 0.55,
      legAmpL: 0.5,
      legAmpR: 0.42,
      legPhaseL: 0,
      legPhaseR: Math.PI * 0.92,
      armBaseX: -0.5,
      foreBaseX: -0.14,
      armSwingL: 0.28,
      armSwingR: 0.22,
      armFreqL: 0.92,
      armFreqR: 1.06,
      armPhaseL: 1.2,
      armPhaseR: 2.9,
      rollAmp: 0.05,
      bobAmp: 0.045,
      abdomen,
      coatL,
      coatR,
      coreLight,
    };

    if (kind === "walker") {
      rig.torsoBaseX = 0.22;
      rig.torsoBaseZ = variant % 2 === 0 ? 0.07 : -0.06;
      headG.rotation.z = (variant % 2 === 0 ? 1 : -1) * (0.22 + Math.random() * 0.13);
      headG.rotation.x = -0.14;
      rig.cadence = 4.4 + Math.random() * 1.0;
      rig.legAmpL = 0.55;
      rig.legAmpR = 0.36 + Math.random() * 0.12;
      rig.legPhaseR = Math.PI * (0.84 + Math.random() * 0.3);
      rig.armSwingL = 0.3;
      rig.armSwingR = 0.18 + Math.random() * 0.16;
      rig.armBaseX = -0.5;
    } else if (kind === "runner") {
      rig.torsoBaseX = 0.5;
      rig.headBaseX = -0.34;
      rig.jawBase = 0.5; // فك مفتوح باستمرار
      jaw.rotation.x = 0.5;
      rig.cadence = 8.5;
      rig.bend = 0.85;
      rig.legAmpL = 0.62;
      rig.legAmpR = 0.6;
      rig.legPhaseR = Math.PI;
      rig.armBaseX = -0.95;
      rig.foreBaseX = -1.15;
      rig.armSwingL = 0.75;
      rig.armSwingR = 0.7;
      rig.armFreqL = 1.0;
      rig.armFreqR = 1.0;
      rig.armPhaseL = 0;
      rig.armPhaseR = Math.PI;
      rig.rollAmp = 0.07;
      rig.bobAmp = 0.06;
    } else {
      // نافث الحمض — تمشية بطيئة متمايلة
      rig.torsoBaseX = 0.12;
      rig.jawBase = 0.22;
      rig.cadence = 4.2;
      rig.bend = 0.4;
      rig.legAmpL = 0.44;
      rig.legAmpR = 0.44;
      rig.legPhaseR = Math.PI;
      rig.legLU.rotation.z = 0.14;
      rig.legRU.rotation.z = -0.14;
      rig.armBaseX = -0.42;
      rig.foreBaseX = -0.55;
      rig.armSwingL = 0.18;
      rig.armSwingR = 0.18;
      rig.rollAmp = 0.12;
      rig.bobAmp = 0.05;
    }
    if (kind === "brute") {
      rig.torsoBaseX = 0.18;
      rig.cadence = 3.2;
      rig.bend = 0.35;
      rig.legAmpL = 0.4;
      rig.legAmpR = 0.4;
      rig.legPhaseR = Math.PI;
      rig.armBaseX = -0.28;
      rig.foreBaseX = -0.25;
      rig.armSwingL = 0.1;
      rig.armSwingR = 0.06;
      rig.armFreqR = 0.7;
      rig.rollAmp = 0.08;
      rig.bobAmp = 0.06;
      rig.jawBase = 0.2;
      rig.headBaseX = -0.1;
    } else if (kind === "boss") {
      rig.torsoBaseX = 0.08;
      rig.cadence = 2.4;
      rig.bend = 0.25;
      rig.legAmpL = 0.34;
      rig.legAmpR = 0.34;
      rig.legPhaseR = Math.PI;
      rig.armBaseX = -0.22;
      rig.foreBaseX = -0.2;
      rig.armSwingL = 0.16;
      rig.armSwingR = 0.14;
      rig.armPhaseL = 0;
      rig.armPhaseR = Math.PI;
      rig.rollAmp = 0.05;
      rig.bobAmp = 0.035;
      rig.jawBase = 0.1;
      rig.headBaseX = -0.06;
    }

    // تسجيل أجزاء الجسد للرصاص
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.userData.enemy = this;
      }
    });

    this.rig = rig;
  }

  eyePos(out: THREE.Vector3) {
    out.set(
      this.group.position.x,
      this.kind === "boss" ? 3.4 : this.kind === "brute" ? 2.4 : 1.6,
      this.group.position.z,
    );
    return out;
  }

  damage(amount: number, isHead: boolean) {
    if (this.state === "dead") return;
    this.hp -= amount;
    this.skinFlash = 1;
    if (this.hp <= 0) {
      this.state = "dead";
      this.deadT = 0;
      this.fallDir = Math.random() < 0.5 ? -1 : 1;
      this.sprawlLX = 0.35 + Math.random() * 0.55;
      this.sprawlLZ = 0.5 + Math.random() * 0.6;
      this.sprawlRX = 0.2 + Math.random() * 0.5;
      this.sprawlRZ = -(0.4 + Math.random() * 0.55);
      this.spitWindup = 0;
      sfx("hit_flesh", { volume: 0.5 });
      return;
    }
    if (isHead && this.kind !== "brute" && this.kind !== "boss") {
      this.staggerT = 0.55;
      this.state = "stagger";
    } else if (this.kind === "walker" || this.kind === "runner" || this.kind === "spitter") {
      this.staggerT = Math.min(this.staggerT + 0.12, 0.3);
    }
    // الألم يوقظه
    this.hasHeard = true;
    this.heardX = this.group.position.x;
    this.heardZ = this.group.position.z;
    if (this.state === "idle") this.state = "chase";
  }

  // ───────────────────────── الحركة الإجرائية ─────────────────────────
  private animate(dt: number, moving: boolean, speedFactor: number) {
    const r = this.rig;
    if (!r) return;
    this.animT += dt;
    this.phase += dt * (moving ? r.cadence * speedFactor : 1.3);
    const ph = this.phase;
    const damp = Math.min(1, dt * 8);

    // أرجل مع ثني الركبة
    if (moving) {
      r.legLU.rotation.x = Math.sin(ph + r.legPhaseL) * r.legAmpL;
      r.legRU.rotation.x = Math.sin(ph + r.legPhaseR) * r.legAmpR;
      r.shinLU.rotation.x = Math.max(0, Math.sin(ph + r.legPhaseL + 0.7)) * r.bend;
      r.shinRU.rotation.x = Math.max(0, Math.sin(ph + r.legPhaseR + 0.7)) * r.bend;
    } else {
      r.legLU.rotation.x *= 1 - damp;
      r.legRU.rotation.x *= 1 - damp;
      r.shinLU.rotation.x *= 1 - damp;
      r.shinRU.rotation.x *= 1 - damp;
    }

    // أذرع — تأرجح مستقل لكل ذراع
    r.armLU.rotation.x = r.armBaseX + Math.sin(ph * r.armFreqL + r.armPhaseL) * r.armSwingL;
    r.armRU.rotation.x = r.armBaseX + Math.sin(ph * r.armFreqR + r.armPhaseR) * r.armSwingR;
    r.foreLU.rotation.x = r.foreBaseX;
    r.foreRU.rotation.x = r.foreBaseX;

    // جذع: انحناء أساسي + تمايل + تنفس
    let pitch = r.torsoBaseX + (moving ? 0 : Math.sin(this.animT * 1.5) * 0.018);
    let roll = Math.sin(ph) * r.rollAmp;

    // استعداد رشقة الحمض — انحناء للخلف + انتفاخ البطن
    if (this.spitWindup > 0) {
      const w = 1 - Math.max(0, this.spitWindup) / 0.5;
      pitch -= w * 0.55;
      roll += w * 0.08;
      if (r.abdomen) {
        const b = r.abdomen.userData.baseS as number[];
        const k = 1 + w * 0.32;
        r.abdomen.scale.set(b[0] * k, b[1] * k, b[2] * k);
      }
    }
    if (this.spitRecoil > 0) {
      pitch += this.spitRecoil * 1.5;
      this.spitRecoil = Math.max(0, this.spitRecoil - dt);
    }
    // الاندفاع — جذع منخفض وذراعان خلفيتان
    if (this.state === "charge") {
      pitch = 0.65;
      r.armLU.rotation.x = 0.75;
      r.armRU.rotation.x = 0.85;
      r.foreLU.rotation.x = -0.2;
      r.foreRU.rotation.x = -0.2;
    }
    // التلعثم — ارتداد الجذع وطلقة الرأس
    if (this.state === "stagger") {
      const st = Math.max(0, Math.min(1, this.staggerT / 0.55));
      pitch -= st * 0.5;
      r.headG.rotation.x = r.headBaseX - st * 0.55;
    }
    r.torso.rotation.x = pitch;
    r.torso.rotation.z = r.torsoBaseZ + roll;
    r.pelvis.position.y =
      r.pelvisY +
      (moving ? Math.abs(Math.sin(ph)) * r.bobAmp : Math.sin(this.animT * 1.3) * 0.012);

    // رأس — مسح جانبي أثناء السكون + اهتزاز مع الخطى
    if (this.state !== "stagger") {
      const target = r.headBaseX + (moving ? Math.sin(ph * 2) * 0.025 : 0);
      r.headG.rotation.x += (target - r.headG.rotation.x) * damp;
    }
    if (this.state === "idle" && !moving) {
      r.headG.rotation.y = Math.sin(this.animT * 0.7) * 0.4;
    } else {
      r.headG.rotation.y *= 0.9;
    }

    // الفك — يعصر عند الهجوم، يطقطق في السكون
    const jawTarget =
      this.state === "attack"
        ? 0.6
        : r.jawBase + (moving ? 0.12 : Math.max(0, Math.sin(this.animT * 2.1)) * 0.09);
    r.jaw.rotation.x += (jawTarget - r.jaw.rotation.x) * Math.min(1, dt * 9);

    // معطف الزعيم — لوحتان متمايلتان متعاكستان
    if (r.coatL && r.coatR) {
      const sw = Math.sin(this.animT * 1.9) * 0.1 + (moving ? Math.sin(ph) * 0.05 : 0);
      r.coatL.rotation.z = sw;
      r.coatR.rotation.z = -sw;
      r.coatL.rotation.x = moving ? Math.sin(ph + 1) * 0.06 : Math.sin(this.animT) * 0.02;
      r.coatR.rotation.x = -r.coatL.rotation.x * 0.8;
    }

    // وميض نواة الزعيم
    if (r.coreLight) {
      r.coreLight.intensity = 0.8 + Math.sin(this.animT * 13) * 0.3 + Math.random() * 0.1;
    }

    // صوت الخطى الثقيل للزعيم — عند تقاطع طور الخطوة فقط
    if (this.kind === "boss") {
      if (moving) {
        const sign = Math.sin(ph) >= 0 ? 1 : -1;
        if (sign !== this.lastStepSign) {
          this.lastStepSign = sign;
          if (this.playerDist < 26) {
            sfx("thud", { volume: Math.max(0.05, 0.5 * (1 - this.playerDist / 26)) });
          }
        }
      } else {
        this.lastStepSign = 0;
      }
    }
  }

  // ───────────────────────── رشقة الحمض ─────────────────────────
  private mouthWorld(out: THREE.Vector3) {
    const s = this.scaleF;
    out.set(
      this.group.position.x + Math.sin(this.group.rotation.y) * 0.35 * s,
      1.45 * s + this.group.position.y,
      this.group.position.z + Math.cos(this.group.rotation.y) * 0.35 * s,
    );
    return out;
  }

  private fireSpit(player: THREE.Vector3) {
    const ranged = this.def.ranged;
    const scene = worldScene;
    if (!ranged || !scene) return;
    const m = this.mouthWorld(_mv);
    const tx = player.x;
    const ty = Math.max(0.5, player.y);
    const tz = player.z;
    let dx = tx - m.x;
    let dz = tz - m.z;
    const d = Math.max(0.6, Math.hypot(dx, dz));
    dx /= d;
    dz /= d;
    const dy = ty - m.y;
    // حل قذفي بسيط: زمن الطيران من السرعة على المسار المستقيم ثم حل مكوّنات السرعة
    const t = Math.hypot(d, dy) / ranged.speed;
    const vy = (dy + 0.5 * ACID_G * t * t) / t;
    const vh = d / t;
    const mesh = new THREE.Mesh(acidGeo, acidMat);
    mesh.position.set(m.x, m.y, m.z);
    scene.add(mesh);
    acidBalls.push({ mesh, vx: dx * vh, vy, vz: dz * vh, dmg: ranged.dmg, t: 4.5 });
    this.specialCd = ranged.cd;
    this.spitRecoil = 0.3;
    sfx("spit", { volume: 0.85 });
  }

  // ───────────────────────── التحديث ─────────────────────────
  update(
    dt: number,
    player: THREE.Vector3,
    colliders: Collider[],
    hooks: EnemyHooks,
    others: Enemy[],
    canAct: boolean,
  ) {
    const g = this.group;
    const px = player.x;
    const pz = player.z;
    const dx = px - g.position.x;
    const dz = pz - g.position.z;
    const dist = Math.hypot(dx, dz);
    this.playerDist = dist;

    // وميض الإصابة على مادة الجلد الخاصة بهذا العدو
    if (this.skinFlash > 0 && this.skinMat) {
      this.skinFlash = Math.max(0, this.skinFlash - dt * 3.2);
      const f = this.skinFlash;
      this.skinMat.emissive.setRGB(0.5 * f, 0.07 * f, 0.04 * f);
    }

    if (this.state !== "charge") this.specialCd -= dt;

    // صوت الزئير
    this.groanCd -= dt;
    if (this.groanCd <= 0 && dist < 34 && this.state !== "dead") {
      this.groanCd = 4 + Math.random() * 7;
      const vol = Math.max(0.08, 1 - dist / 34);
      sfx(dist > 18 ? "growl_far" : "growl", {
        volume: vol * (this.kind === "boss" ? 1.4 : 1),
      });
    }

    if (this.state === "dead") {
      this.deadT += dt;
      // سقوط جانبي مع ارتداد خفيف ثم انبطاح الأطراف
      const fall = Math.min(1, this.deadT / 0.55);
      const ease = fall * fall * (3 - 2 * fall);
      const over = this.deadT - 0.55;
      const bounce = over > 0 ? Math.sin(over * 10) * 0.06 * Math.exp(-over * 6) : 0;
      g.rotation.z = this.fallDir * (ease * (Math.PI / 2) + bounce);
      const r = this.rig;
      if (r) {
        const k = Math.min(1, dt * 5);
        r.armLU.rotation.x += (this.sprawlLX - r.armLU.rotation.x) * k;
        r.armLU.rotation.z += (this.sprawlLZ - r.armLU.rotation.z) * k;
        r.armRU.rotation.x += (this.sprawlRX - r.armRU.rotation.x) * k;
        r.armRU.rotation.z += (this.sprawlRZ - r.armRU.rotation.z) * k;
        r.foreLU.rotation.x *= 0.95;
        r.foreRU.rotation.x *= 0.95;
        r.legLU.rotation.x *= 0.95;
        r.legRU.rotation.x *= 0.95;
        r.jaw.rotation.x += (0.45 - r.jaw.rotation.x) * Math.min(1, dt * 6);
        if (r.coreLight) r.coreLight.intensity = Math.max(0, 1.2 - this.deadT * 0.8);
      }
      if (this.deadT > 3.2) {
        g.position.y = -(this.deadT - 3.2) * 0.35;
      }
      return;
    }

    if (!canAct) {
      this.animate(dt, false, 0.5);
      return;
    }

    // خط رؤية بتكرار متدرج (مع مراعاة فرق الطابق الرأسي)
    const playerFloorY = Math.max(0, player.y - 1.66);
    const sameFloor = Math.abs(playerFloorY - g.position.y) < 2.2;
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.24 + Math.random() * 0.12;
      if (sameFloor && dist < this.def.sightRange) {
        const ex = g.position.x;
        const ez = g.position.z;
        this.canSee = !segmentBlocked(ex, ez, px, pz, colliders, g.position.y + 1.0);
      } else {
        this.canSee = false;
      }
    }

    const attackR = this.def.attackRange + (this.kind === "boss" ? 0.6 : 0.2);

    switch (this.state) {
      case "stagger": {
        this.staggerT -= dt;
        this.animate(dt, false, 0.8);
        if (this.staggerT <= 0) this.state = this.canSee ? "chase" : "idle";
        break;
      }
      case "idle": {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = 2.5 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * this.wanderR;
          this.targetX = this.homeX + Math.cos(a) * r;
          this.targetZ = this.homeZ + Math.sin(a) * r;
        }
        // هل سمع أو رأى؟
        const dHome = Math.hypot(this.heardX - g.position.x, this.heardZ - g.position.z);
        if ((this.hasHeard && dHome < 45) || (this.canSee && dist < this.def.sightRange)) {
          this.state = "chase";
          if (this.canSee) sfx("growl", { volume: 0.7 });
        }
        this.moveToward(this.targetX, this.targetZ, this.def.walkSpeed, dt, colliders);
        this.animate(dt, true, 0.55);
        break;
      }
      case "chase": {
        if (this.canSee) {
          this.hasHeard = true;
          this.heardX = px;
          this.heardZ = pz;
        }
        // نافث الحمض: استعداد ثم رشقة قذفية
        const ranged = this.def.ranged;
        if (this.kind === "spitter" && ranged) {
          if (this.spitWindup > 0) {
            this.spitWindup -= dt;
            if (this.spitWindup <= 0) this.fireSpit(player);
            this.animate(dt, false, 0.8);
            break;
          }
          if (
            this.specialCd <= 0 &&
            dist >= ranged.minDist &&
            dist <= ranged.maxDist &&
            this.canSee
          ) {
            this.spitWindup = 0.5;
            this.animate(dt, false, 0.8);
            break;
          }
        }
        // اندفاع للمتحولين
        if (
          (this.kind === "brute" || this.kind === "boss") &&
          this.specialCd <= 0 &&
          dist > 5 &&
          dist < 20 &&
          this.canSee
        ) {
          this.state = "charge";
          this.specialCd = 5;
          const l = Math.max(dist, 0.01);
          this.chargeVX = dx / l;
          this.chargeVZ = dz / l;
          sfx("roar", { volume: 0.85 });
          break;
        }
        const tgt = this.canSee ? { x: px, z: pz } : { x: this.heardX, z: this.heardZ };
        if (dist < attackR && this.canSee) {
          this.state = "attack";
          this.attackCd = 0.32; // windup
        } else {
          const spd =
            this.kind === "boss" && this.hp < this.def.hp * 0.5
              ? this.def.chaseSpeed * 1.18
              : this.def.chaseSpeed;
          this.moveToward(tgt.x, tgt.z, spd, dt, colliders);
        }
        this.animate(dt, true, this.kind === "runner" ? 2.2 : this.kind === "spitter" ? 1.3 : this.kind === "brute" ? 1.1 : this.kind === "boss" ? 1.0 : 1.15);
        // فقد الأثر
        if (!this.canSee && Math.hypot(this.heardX - g.position.x, this.heardZ - g.position.z) < 1.2) {
          this.hasHeard = false;
          this.state = "idle";
        }
        break;
      }
      case "charge": {
        const step = (this.def.chargeSpeed ?? 5) * dt;
        const p = { x: g.position.x + this.chargeVX * step, z: g.position.z + this.chargeVZ * step };
        const before = { x: g.position.x, z: g.position.z };
        g.position.x = p.x;
        g.position.z = p.z;
        collideCircle(g.position, 0.5, colliders);
        const moved = Math.hypot(g.position.x - before.x, g.position.z - before.z);
        if (moved < step * 0.35) {
          // اصطدم بجدار
          this.state = "chase";
          this.specialCd = 3;
        }
        g.rotation.y = Math.atan2(this.chargeVX, this.chargeVZ);
        if (dist < 2.1) {
          hooks.damagePlayer(this.def.damage * 1.35, g.position.x, g.position.z);
          sfx("roar", { volume: 1 });
          this.state = "chase";
        }
        this.animate(dt, true, 2.6);
        this.specialCd -= dt;
        break;
      }
      case "attack": {
        this.attackCd -= dt;
        // التفاف نحو اللاعب
        g.rotation.y = Math.atan2(dx, dz);
        this.animate(dt, false, 0.6);
        const r = this.rig;
        if (r) {
          const t = Math.max(0, this.attackCd / 0.32);
          const raise = -2.3 + (1 - t) * 2.1; // رفع فوق الرأس ثم صفع
          r.armLU.rotation.x = raise;
          r.armRU.rotation.x = raise * 0.96;
          r.foreLU.rotation.x = -0.3;
          r.foreRU.rotation.x = -0.3;
          r.torso.rotation.x = r.torsoBaseX + (1 - t) * 0.35;
        }
        if (this.attackCd <= 0) {
          if (sameFloor && dist < attackR * 1.45) {
            hooks.damagePlayer(this.def.damage, g.position.x, g.position.z);
          }
          this.attackCd = this.def.attackCooldown;
          this.state = "chase";
        }
        break;
      }
    }

    // فصل عن الآخرين
    for (const o of others) {
      if (o === this || o.state === "dead") continue;
      const ox = g.position.x - o.group.position.x;
      const oz = g.position.z - o.group.position.z;
      const od = Math.hypot(ox, oz);
      const minD = this.kind === "brute" || this.kind === "boss" ? 1.4 : 0.9;
      if (od > 0.001 && od < minD) {
        const push = ((minD - od) / od) * 0.5;
        g.position.x += ox * push;
        g.position.z += oz * push;
      }
    }

    // الزعيم يستدعي المساعدة
    if (this.kind === "boss" && !this.spawnAddsDone && this.hp < this.def.hp * 0.55) {
      this.spawnAddsDone = true;
      sfx("roar", { volume: 1 });
      hooks.spawnAdds(g.position.x, g.position.z, "walker", 2);
    }

    // دوران تدريجي نحو الاتجاه في الحالات الأخرى
    if (this.state === "chase" || this.state === "idle") {
      const tx = this.state === "chase" ? (this.canSee ? px : this.heardX) : this.targetX;
      const tz = this.state === "chase" ? (this.canSee ? pz : this.heardZ) : this.targetZ;
      const tdx = tx - g.position.x;
      const tdz = tz - g.position.z;
      if (Math.hypot(tdx, tdz) > 0.3) {
        const targetYaw = Math.atan2(tdx, tdz);
        let dy = targetYaw - g.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        g.rotation.y += dy * Math.min(1, dt * 6);
      }
    }
  }

  private moveToward(tx: number, tz: number, speed: number, dt: number, colliders: Collider[]) {
    const g = this.group;
    const dx = tx - g.position.x;
    const dz = tz - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) return;
    const step = speed * dt;
    const p = { x: g.position.x + (dx / d) * step, z: g.position.z + (dz / d) * step };
    const before = { x: g.position.x, z: g.position.z };
    g.position.x = p.x;
    g.position.z = p.z;
    collideCircle(g.position, 0.42, colliders);
    const moved = Math.hypot(g.position.x - before.x, g.position.z - before.z);
    if (moved < step * 0.3) {
      // انزلاق حول العائق
      const side = ((this.phase * 7) % 2) > 1 ? 1 : -1;
      const p2 = {
        x: g.position.x + (-dz / d) * step * side,
        z: g.position.z + (dx / d) * step * side,
      };
      g.position.x = p2.x;
      g.position.z = p2.z;
      collideCircle(g.position, 0.42, colliders);
    }
  }
}

// ═════════════════════════════════════════════════════════════
// المدير — توليد / ضوضاء / تهديدات / جثث مزيفة / أداء
// ═════════════════════════════════════════════════════════════

export class EnemyManager {
  enemies: Enemy[] = [];
  scene: THREE.Scene;
  hooks: EnemyHooks;

  constructor(scene: THREE.Scene, hooks: EnemyHooks) {
    this.scene = scene;
    this.hooks = hooks;
    worldScene = scene;
  }

  spawnFromPoints(spawns: SpawnPoint[]) {
    for (const s of spawns) {
      this.spawn(s, true);
    }
  }

  spawn(s: SpawnPoint, initial = false) {
    const e = new Enemy(s.kind, s.x, s.z, s.wander);
    if (s.fakeCorpse) {
      // جثة مزيفة راقدة تنهض عند الاقتراب
      e.group.visible = false;
      e.state = "idle";
      e.wanderT = 9999;
      e.targetX = s.x;
      e.targetZ = s.z;
      e.fakeCorpseProp = makeCorpseProp();
      e.fakeCorpseProp.position.set(s.x, 0, s.z);
      this.scene.add(e.fakeCorpseProp);
      this.scene.add(e.group);
      this.enemies.push(e);
      return e;
    }
    this.scene.add(e.group);
    this.enemies.push(e);
    void initial;
    return e;
  }

  addAt(x: number, z: number, kind: EnemyKind) {
    const e = new Enemy(kind, x, z, 4);
    e.state = "chase";
    e.hasHeard = true;
    e.heardX = x;
    e.heardZ = z;
    this.scene.add(e.group);
    this.enemies.push(e);
    return e;
  }

  /** جثة مزيفة عند نقطة محددة — تنهض وتطارد عندما يقترب اللاعب */
  addFakeCorpse(x: number, z: number, kind: EnemyKind): Enemy {
    const e = new Enemy(kind, x, z, 4);
    e.group.visible = false;
    e.state = "idle";
    e.wanderT = 9999;
    e.targetX = x;
    e.targetZ = z;
    e.fakeCorpseProp = makeCorpseProp();
    e.fakeCorpseProp.position.set(x, 0, z);
    this.scene.add(e.fakeCorpseProp);
    this.scene.add(e.group);
    this.enemies.push(e);
    return e;
  }

  noise(x: number, z: number, radius: number) {
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      const d = Math.hypot(e.group.position.x - x, e.group.position.z - z);
      if (d < radius) {
        e.hasHeard = true;
        e.heardX = x;
        e.heardZ = z;
        if (e.state === "idle") e.state = "chase";
      }
    }
  }

  damageAt(e: Enemy, dmg: number, isHead: boolean) {
    e.damage(dmg, isHead);
    if (e.state === "dead") this.hooks.onDeath(e);
  }

  nearestThreat(x: number, z: number): { dist: number; chasing: boolean; boss: boolean } {
    let best = Infinity;
    let chasing = false;
    let boss = false;
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      if (!e.group.visible && e.state === "idle" && e.wanderT > 9000) continue;
      const d = Math.hypot(e.group.position.x - x, e.group.position.z - z);
      if (d < best) {
        best = d;
        chasing = e.state === "chase" || e.state === "attack" || e.state === "charge";
      }
      if ((e.kind === "boss" || e.kind === "brute") && d < 40) boss = true;
    }
    return { dist: best, chasing, boss };
  }

  aliveInRadius(x: number, z: number, r: number, kinds?: EnemyKind[]): number {
    let n = 0;
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      if (kinds && !kinds.includes(e.kind)) continue;
      if (Math.hypot(e.group.position.x - x, e.group.position.z - z) < r) n++;
    }
    return n;
  }

  update(dt: number, player: THREE.Vector3, colliders: Collider[], canAct: boolean) {
    // قذائف وجزيئات الحمض تعمل دائمًا
    stepAcidFx(dt, player, this.hooks, colliders);

    for (const e of this.enemies) {
      const d = Math.hypot(e.group.position.x - player.x, e.group.position.z - player.z);

      // جثة مزيفة أُنشئت عبر addAt خارجيًا (المحرك القديم) — نبني لها جسدًا راقدًا
      if (!e.group.visible && !e.fakeCorpseProp && e.state === "idle" && e.wanderT > 9000) {
        e.fakeCorpseProp = makeCorpseProp();
        e.fakeCorpseProp.position.set(e.group.position.x, 0, e.group.position.z);
        this.scene.add(e.fakeCorpseProp);
      }

      // نهوض الجثة عند الاقتراب
      if (e.fakeCorpseProp && !e.group.visible && e.state === "idle" && canAct && d < 3.4) {
        e.group.visible = true;
        e.state = "chase";
        e.wanderT = 0;
        e.hasHeard = true;
        e.heardX = player.x;
        e.heardZ = player.z;
        this.scene.remove(e.fakeCorpseProp);
        e.fakeCorpseProp = null;
        sfx("roar", { volume: 0.9 });
      }

      // إخفاء البعيد خلف الضباب وتخطي تحديثه (الجثث الميتة تبقى مرئية حتى تُزال)
      if (d > 54 && e.state !== "dead") {
        e.group.visible = false;
        if (e.fakeCorpseProp) e.fakeCorpseProp.visible = false;
        continue;
      }

      // جثة نائمة — تبقى مخفية بلا تحديث (ويظهر مجسّم الجثة ضمن مدى الضباب فقط)
      if (!e.group.visible && e.state === "idle" && e.wanderT > 9000) {
        if (e.fakeCorpseProp) e.fakeCorpseProp.visible = d <= 54;
        continue;
      }

      e.group.visible = true;
      e.update(dt, player, colliders, this.hooks, this.enemies, canAct);

      if (e.state === "dead") {
        if (e.fakeCorpseProp) {
          this.scene.remove(e.fakeCorpseProp);
          e.fakeCorpseProp = null;
        }
        if (e.deadT > 6) {
          this.scene.remove(e.group);
        }
      }
    }
  }

  killAllInRadius(x: number, z: number, r: number) {
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      if (Math.hypot(e.group.position.x - x, e.group.position.z - z) < r) {
        this.damageAt(e, 9999, false);
      }
    }
  }

  clear() {
    for (const e of this.enemies) {
      this.scene.remove(e.group);
      if (e.fakeCorpseProp) this.scene.remove(e.fakeCorpseProp);
    }
    this.enemies = [];
    clearAcidFx();
  }
}
