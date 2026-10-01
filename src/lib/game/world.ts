"use client";

// ─────────────────────────────────────────────────────────────
// توليد مدينة كيبريس — نسخة AAA
// شوارع منظمة بأرصفة ودهانات، أحياء بطابع مميز، ساحة الساعة،
// مبانٍ قابلة للدخول مؤثثة بالكامل مع أبواب حقيقية، مختبر، ميناء
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";
import { ZONES } from "./content";
import {
  type PropCtx,
  type DoorDef,
  type WorldChunk,
  makePropTextures,
  makePropMaterials,
  mergePropBuckets,
  mat4,
  car,
  busWreck,
  lampPost,
  trafficLight,
  hydrant,
  bench,
  trashBin,
  trashBags,
  deadTree,
  barrier,
  sandbagWall,
  shopSign,
  clockTower,
  fountain,
  desk,
  officeChair,
  shelfStocked,
  cabinet,
  lockerRow,
  bed,
  gurney,
  ivStand,
  sofa,
  tvSet,
  coffeeTable,
  kitchenCounter,
  fridge,
  cratesStack,
  barrel,
  serverRack,
  pressMachine,
  conveyor,
  controlPanel,
  forklift,
  vending,
  shopShelf,
  counter,
  gunRack,
  turnstile,
  deadPlant,
  wallPipes,
  coveredBody,
  bodyBag,
  survivorModel,
  pickupModel,
  makeDoor,
  seededRandom,
  realisticWindow,
  realisticDoorFrame,
  entrancePorch,
  railingSection,
  curtainPair,
  wallPicture,
  sinkVanity,
  toiletBowl,
  wardrobeCloset,
  elevatorDoors,
  bioIncubator,
  staircase,
  operatingTable,
  surgicalLamps,
  anesthesiaMachine,
  xrayLightbox,
  curtainedWardBed,
  defibrillatorCart,
  microscope,
  diningTable,
  kitchenStove,
  bathroomTub,
  coatRack,
  bookshelfFull,
  buildingExteriorTrim,
  streetDebrisBarricade,
  streetRubbleCluster,
} from "./props";

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

export interface StairRamp {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  yBottom: number;
  yTop: number;
  dir: "+z" | "-z" | "+x" | "-x";
}

export interface FloorSlab {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  hole?: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface VirtualLight {
  x: number;
  y: number;
  z: number;
  color: number;
  base: number;
  dist: number;
  speed: number;
  isFire?: boolean;
}

export interface Poi {
  id: string;
  x: number;
  z: number;
  name: string;
  r: number;
}

export interface SpawnPoint {
  kind: "walker" | "runner" | "spitter" | "brute" | "boss";
  x: number;
  z: number;
  wander: number;
  fakeCorpse?: boolean;
}

export type InteractKind =
  | "item"
  | "note"
  | "door"
  | "console"
  | "npc"
  | "generator"
  | "core"
  | "gate"
  | "exit"
  | "checkpoint";

export interface Interactable {
  id: string;
  kind: InteractKind;
  x: number;
  z: number;
  y?: number;
  radius: number;
  prompt: string;
  data?: Record<string, unknown>;
  used?: boolean;
}

export interface Trigger {
  id: string;
  x: number;
  z: number;
  radius: number;
  once: boolean;
  fired?: boolean;
}

export interface WorldDoor {
  id: string;
  def: DoorDef;
  collider: Collider;
  open: boolean;
}

export interface SurvivorEntry {
  id: "sara" | "adel" | "soldier";
  obj: THREE.Group;
  startX: number;
  startY: number;
  startZ: number;
  startRy: number;
  waypoints: [number, number, number][];
  boatPos: [number, number, number];
  boatRy: number;
  state: "idle" | "walking" | "on_boat";
  wpIndex: number;
  walkTime: number;
}

export interface WorldData {
  colliders: Collider[];
  dynamicColliders: Map<string, Collider>;
  stairs: StairRamp[];
  floors: FloorSlab[];
  virtualLights: VirtualLight[];
  pois: Poi[];
  spawns: SpawnPoint[];
  interactables: Interactable[];
  triggers: Trigger[];
  buildings: { x: number; z: number; w: number; d: number; name?: string; poi?: boolean }[];
  roads: { x: number; z: number; w: number; d: number; blocked?: boolean }[];
  blockedRoads: { x: number; z: number; w: number; d: number }[];
  fireLights: { light: { position: { x: number; y: number; z: number } }; base: number }[];
  flickerLights: { light: { position: { x: number; y: number; z: number } }; base: number; speed: number }[];
  labBossGate: { mesh: THREE.Mesh; colliderId: string };
  labDoor: { group: THREE.Group; open: boolean };
  corePedestal: THREE.Vector3;
  gateBarrier: { group: THREE.Group; open: boolean };
  boat: THREE.Group;
  boatLight: THREE.PointLight;
  clockHands: THREE.Object3D[];
  pickups: { id: string; obj: THREE.Group }[];
  doors: WorldDoor[];
  survivors: SurvivorEntry[];
  chunks: WorldChunk[];
  cullables: { obj: THREE.Object3D; x: number; z: number; r: number }[];
}

const WALL_H = 4.2;
const T = 0.5; // سماكة الجدار

// مراجع تُسند أثناء البناء
let doorGroupRef: THREE.Group | null = null;
let barrierRef: THREE.Group | null = null;
let boatRef: THREE.Group | null = null;
let boatLightRef: THREE.PointLight | null = null;

// ── Canvas texture helpers ──
function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat = 1,
): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

function noiseFill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  amt: number,
  dark: string,
) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 6 + Math.random() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, dark);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function makeTextures() {
  const asphalt = canvasTex(256, 256, (ctx) => {
    noiseFill(ctx, 256, 256, "#141416", 46, "rgba(0,0,0,0.55)");
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      let x = Math.random() * 256;
      let y = Math.random() * 256;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 90;
        y += (Math.random() - 0.5) * 90;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 6);

  const concrete = canvasTex(256, 256, (ctx) => {
    noiseFill(ctx, 256, 256, "#3a3a38", 30, "rgba(0,0,0,0.4)");
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }, 3);

  const brick = canvasTex(256, 256, (ctx) => {
    noiseFill(ctx, 256, 256, "#3b2f28", 26, "rgba(0,0,0,0.5)");
    ctx.strokeStyle = "rgba(15,12,10,0.9)";
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      const off = (y / 22) % 2 === 0 ? 0 : 24;
      for (let x = off; x < 256; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 22);
        ctx.stroke();
      }
    }
  }, 3);

  const lit = new Set<number>();
  for (let i = 0; i < 26; i++) lit.add(Math.floor(Math.random() * 64));
  const facadeDraw = (ctx: CanvasRenderingContext2D) => {
    noiseFill(ctx, 256, 256, "#232527", 20, "rgba(0,0,0,0.5)");
    ctx.fillStyle = "#0c0d10";
    for (let gy = 0; gy < 8; gy++) {
      for (let gx = 0; gx < 8; gx++) {
        const idx = gy * 8 + gx;
        ctx.fillRect(8 + gx * 32, 10 + gy * 30, 20, 18);
        if (lit.has(idx)) {
          ctx.fillStyle = Math.random() > 0.5 ? "#c98a3a" : "#b0472f";
          ctx.fillRect(8 + gx * 32, 10 + gy * 30, 20, 18);
          ctx.fillStyle = "#0c0d10";
        }
      }
    }
  };
  const facade = canvasTex(256, 256, facadeDraw, 2);
  const facadeEmissive = canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 256, 256);
    for (let gy = 0; gy < 8; gy++) {
      for (let gx = 0; gx < 8; gx++) {
        const idx = gy * 8 + gx;
        if (lit.has(idx)) {
          ctx.fillStyle = Math.random() > 0.5 ? "#c98a3a" : "#b0472f";
          ctx.fillRect(8 + gx * 32, 10 + gy * 30, 20, 18);
        }
      }
    }
  }, 2);

  const metal = canvasTex(256, 256, (ctx) => {
    noiseFill(ctx, 256, 256, "#2c3033", 18, "rgba(0,0,0,0.4)");
    ctx.strokeStyle = "rgba(120,130,135,0.12)";
    for (let x = 0; x < 256; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  }, 2);

  const blood = canvasTex(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 5; i++) {
      const x = 40 + Math.random() * 48;
      const y = 40 + Math.random() * 48;
      const r = 14 + Math.random() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(70,8,8,0.9)");
      g.addColorStop(0.7, "rgba(45,6,6,0.55)");
      g.addColorStop(1, "rgba(30,4,4,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return { asphalt, concrete, brick, facade, facadeEmissive, metal, blood };
}

export type Textures = ReturnType<typeof makeTextures>;

export function makeMats(t: Textures) {
  return {
    asphalt: new THREE.MeshStandardMaterial({ map: t.asphalt, roughness: 0.95 }),
    concrete: new THREE.MeshStandardMaterial({ map: t.concrete, roughness: 0.92 }),
    brick: new THREE.MeshStandardMaterial({ map: t.brick, roughness: 0.9 }),
    facade: new THREE.MeshStandardMaterial({
      map: t.facade,
      emissiveMap: t.facadeEmissive,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.9,
      roughness: 0.85,
    }),
    metal: new THREE.MeshStandardMaterial({ map: t.metal, roughness: 0.55, metalness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.85 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xd8cba8, roughness: 0.9 }),
    rubble: new THREE.MeshStandardMaterial({ color: 0x2e2c29, roughness: 1 }),
    blood: new THREE.MeshBasicMaterial({ map: t.blood, transparent: true, depthWrite: false }),
    amberLight: new THREE.MeshStandardMaterial({
      color: 0x221a08,
      emissive: 0xd07a28,
      emissiveIntensity: 2.2,
    }),
    redLight: new THREE.MeshStandardMaterial({
      color: 0x220808,
      emissive: 0xc22a1e,
      emissiveIntensity: 2.4,
    }),
    greenLight: new THREE.MeshStandardMaterial({
      color: 0x08220c,
      emissive: 0x2fae4e,
      emissiveIntensity: 2.2,
    }),
  };
}

export type Mats = ReturnType<typeof makeMats>;

// ── Builder state ──
interface BuildCtx {
  scene: THREE.Scene;
  mats: Mats;
  colliders: Collider[];
  stairs: StairRamp[];
  floors: FloorSlab[];
  virtualLights: VirtualLight[];
  buildings: WorldData["buildings"];
  spawns: SpawnPoint[];
  interactables: Interactable[];
  triggers: Trigger[];
  fireLights: WorldData["fireLights"];
  flickerLights: WorldData["flickerLights"];
  staticGeos: Map<string, THREE.BufferGeometry[]>;
  blockedRoads: WorldData["blockedRoads"];
  pickups: WorldData["pickups"];
  doors: WorldDoor[];
  survivors: SurvivorEntry[];
}

function pushStatic(
  ctx: BuildCtx,
  bucket: string,
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  yOffset = 0,
) {
  const g = geo.clone();
  g.applyMatrix4(matrix);
  if (yOffset !== 0) g.translate(0, yOffset, 0);
  if (!ctx.staticGeos.has(bucket)) ctx.staticGeos.set(bucket, []);
  ctx.staticGeos.get(bucket)!.push(g);
}

function addBox(
  ctx: BuildCtx,
  bucket: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  solid = true,
) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y + h / 2, z),
    new THREE.Quaternion(),
    new THREE.Vector3(w, h, d),
  );
  pushStatic(ctx, bucket, new THREE.BoxGeometry(1, 1, 1), m);
  if (solid) {
    ctx.colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      minY: y,
      maxY: y + h,
    });
  }
}

export interface WallGap {
  at: number;
  width: number;
  /** إذا حُدد sill تُعتبر الفتحة نافذة (يُبنى جدار سفلي تحتها مع مصادم) */
  sill?: number;
  top?: number;
}

/** جدار مع فتحات للأبواب والنوافذ مع دعم الطوابق المتعددة (baseY) */
function wallWithGaps(
  ctx: BuildCtx,
  bucket: string,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  gaps: WallGap[] = [],
  baseY = 0,
  wallH = WALL_H,
) {
  const horiz = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const len = horiz ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const segs: { s: number; e: number }[] = [];
  let cur = 0;
  const sorted = [...gaps].sort((a, b) => a.at - b.at);
  for (const g of sorted) {
    const s = g.at - g.width / 2;
    if (s > cur) segs.push({ s: cur, e: s });
    cur = g.at + g.width / 2;
  }
  if (cur < len) segs.push({ s: cur, e: len });

  for (const seg of segs) {
    const segLen = seg.e - seg.s;
    if (segLen <= 0.05) continue;
    const mid = (seg.s + seg.e) / 2;
    if (horiz) {
      const sx = x1 + (x2 > x1 ? mid : -mid);
      addBox(ctx, bucket, sx, baseY, cz, segLen, wallH, T);
    } else {
      const sz = z1 + (z2 > z1 ? mid : -mid);
      addBox(ctx, bucket, cx, baseY, sz, T, wallH, segLen);
    }
  }
  for (const g of sorted) {
    const gapLen = g.width;
    const mid = g.at;
    const topH = g.top ?? (g.sill !== undefined ? g.sill + 1.9 : 2.55);
    const upperH = Math.max(0.1, wallH - topH);
    if (horiz) {
      const sx = x1 + (x2 > x1 ? mid : -mid);
      addBox(ctx, bucket, sx, baseY + topH, cz, gapLen, upperH, T, false);
      if (g.sill !== undefined && g.sill > 0.05) {
        // جدار سفلي تحت النافذة + مصادم يمنع اختراق النافذة
        addBox(ctx, bucket, sx, baseY, cz, gapLen, g.sill, T, false);
        ctx.colliders.push({
          minX: sx - gapLen / 2,
          maxX: sx + gapLen / 2,
          minZ: cz - T / 2,
          maxZ: cz + T / 2,
          minY: baseY,
          maxY: baseY + wallH,
        });
      }
    } else {
      const sz = z1 + (z2 > z1 ? mid : -mid);
      addBox(ctx, bucket, cx, baseY + topH, sz, T, upperH, gapLen, false);
      if (g.sill !== undefined && g.sill > 0.05) {
        addBox(ctx, bucket, cx, baseY, sz, T, g.sill, gapLen, false);
        ctx.colliders.push({
          minX: cx - T / 2,
          maxX: cx + T / 2,
          minZ: sz - gapLen / 2,
          maxZ: sz + gapLen / 2,
          minY: baseY,
          maxY: baseY + wallH,
        });
      }
    }
  }
}

function roomFloor(ctx: BuildCtx, x: number, z: number, w: number, d: number, bucket = "floorIn", baseY = 0) {
  addBox(ctx, bucket, x, baseY - 0.04, z, w, 0.06, d, false);
}

function roomRoof(ctx: BuildCtx, x: number, z: number, w: number, d: number, bucket = "roof", topY = WALL_H) {
  addBox(ctx, bucket, x, topY, z, w, 0.35, d, false);
  addBox(ctx, "white", x, topY - 0.04, z, w - 0.3, 0.04, d - 0.3, false);
}

/** بلاطة طابق علوي مع فتحة بئر الدرج وسقف سفلي وأرضية مشطبة */
function floorSlabWithHole(
  ctx: BuildCtx,
  cx: number,
  cz: number,
  w: number,
  d: number,
  y: number,
  holeMinX: number,
  holeMaxX: number,
  holeMinZ: number,
  holeMaxZ: number,
  topBucket = "tile",
) {
  const minX = cx - w / 2;
  const maxX = cx + w / 2;
  const minZ = cz - d / 2;
  const maxZ = cz + d / 2;

  const buildStrip = (sx1: number, sx2: number, sz1: number, sz2: number) => {
    const sw = sx2 - sx1;
    const sd = sz2 - sz1;
    if (sw <= 0.08 || sd <= 0.08) return;
    const mx = (sx1 + sx2) / 2;
    const mz = (sz1 + sz2) / 2;
    // سقف الطابق السفلي + البلاطة الخرسانية + تشطيب أرضية الطابق العلوي
    addBox(ctx, "white", mx, y - 0.16, mz, sw, 0.04, sd, false);
    addBox(ctx, "concrete", mx, y - 0.12, mz, sw, 0.12, sd, false);
    addBox(ctx, topBucket, mx, y, mz, sw, 0.04, sd, false);
  };

  // تقسيم البلاطة حول فتحة الدرج إلى 4 شرائح
  buildStrip(minX, maxX, minZ, holeMinZ); // الشمال
  buildStrip(minX, maxX, holeMaxZ, maxZ); // الجنوب
  buildStrip(minX, holeMinX, holeMinZ, holeMaxZ); // الغرب
  buildStrip(holeMaxX, maxX, holeMinZ, holeMaxZ); // الشرق

  ctx.floors.push({
    minX,
    maxX,
    minZ,
    maxZ,
    y,
    hole: { minX: holeMinX, maxX: holeMaxX, minZ: holeMinZ, maxZ: holeMaxZ },
  });
}

/** إضافة درج ثلاثي الأبعاد قابل للصعود والنزول مع تسجيل منحدر الحركة الفيزيائي */
function addWalkableStairs(
  ctx: BuildCtx,
  x: number,
  yBottom: number,
  z: number,
  width: number,
  height: number,
  length: number,
  dir: "+z" | "-z" | "+x" | "-x" = "+z",
) {
  const ry =
    dir === "+z" ? 0 : dir === "-z" ? Math.PI : dir === "+x" ? Math.PI / 2 : -Math.PI / 2;
  const pw = propCtxOf(ctx, yBottom);
  staircase(pw, x, 0, z, width, height, length, ry, 16);

  const horizX = dir === "+x" || dir === "-x";
  const pad = 0.42;
  ctx.stairs.push({
    minX: horizX ? x - length / 2 - pad : x - width / 2 + 0.12,
    maxX: horizX ? x + length / 2 + pad : x + width / 2 - 0.12,
    minZ: horizX ? z - width / 2 + 0.12 : z - length / 2 - pad,
    maxZ: horizX ? z + width / 2 - 0.12 : z + length / 2 + pad,
    yBottom,
    yTop: yBottom + height,
    dir,
  });
}

function addFlickerLight(
  ctx: BuildCtx,
  x: number,
  y: number,
  z: number,
  color: number,
  intensity: number,
  dist: number,
  speed = 9,
) {
  ctx.virtualLights.push({ x, y, z, color, base: intensity, dist, speed, isFire: false });
  ctx.flickerLights.push({ light: { position: { x, y, z } }, base: intensity, speed });
}

/** مصباح فلورسنت سقفي — هيئة + ضوء افتراضي لا يسبب إعادة ترجمة الشيدر */
function fluoro(
  ctx: BuildCtx,
  x: number,
  z: number,
  color = 0xd0a860,
  intensity = 1.1,
  dist = 12,
  speed = 7,
  baseY = 0,
) {
  const p = propCtxOf(ctx, baseY);
  p.push("white", new THREE.BoxGeometry(1.3, 0.07, 0.32), mat4(x, 3.95, z));
  p.push("screenGlow", new THREE.BoxGeometry(1.14, 0.03, 0.22), mat4(x, 3.9, z));
  addFlickerLight(ctx, x, baseY + 3.55, z, color, intensity, dist, speed);
}

function addFire(ctx: BuildCtx, x: number, z: number, scale = 1) {
  ctx.virtualLights.push({
    x,
    y: 1 + scale,
    z,
    color: 0xd4562a,
    base: 3.4 * scale,
    dist: 16 * scale,
    speed: 11,
    isFire: true,
  });
  ctx.fireLights.push({ light: { position: { x, y: 1 + scale, z } }, base: 3.4 * scale });
  const p = propCtxOf(ctx);
  // لهب مخروطي مزدوج
  const flame = new THREE.ConeGeometry(0.42 * scale, 1.5 * scale, 7);
  flame.translate(x, 0.75 * scale, z);
  p.push("fireCone", flame, mat4(0, 0, 0));
  const core = new THREE.ConeGeometry(0.24 * scale, 1.0 * scale, 6);
  core.translate(x, 0.6 * scale, z);
  p.push("fireCore", core, mat4(0, 0, 0));
  // دخان
  for (let i = 0; i < 3; i++) {
    const sm = new THREE.SphereGeometry((0.5 + i * 0.35) * scale, 7, 6);
    sm.translate(x + (Math.random() - 0.5) * 0.4, (1.8 + i * 0.9) * scale, z);
    p.push("smoke", sm, mat4(0, 0, 0));
  }
  // أثر الحرق
  const decal = new THREE.Mesh(
    new THREE.CircleGeometry(1.6 * scale, 12),
    new THREE.MeshBasicMaterial({ color: 0x090909 }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.set(x, 0.03, z);
  ctx.scene.add(decal);
  decal.userData.noHit = true;
}

function bloodDecal(ctx: BuildCtx, x: number, z: number, s = 1.4, baseY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), ctx.mats.blood);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.random() * Math.PI;
  m.position.set(x, baseY + 0.045, z);
  m.userData.noHit = true;
  ctx.scene.add(m);
}

/** أثر زحف دموي (خط) */
function bloodTrail(ctx: BuildCtx, x1: number, z1: number, x2: number, z2: number, baseY = 0) {
  const steps = Math.max(3, Math.floor(Math.hypot(x2 - x1, z2 - z1) / 0.8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    bloodDecal(
      ctx,
      x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.3,
      z1 + (z2 - z1) * t + (Math.random() - 0.5) * 0.3,
      0.5 + Math.random() * 0.5,
      baseY,
    );
  }
}

function corpse(ctx: BuildCtx, x: number, z: number, baseY = 0) {
  coveredBody(propCtxOf(ctx, baseY), x, z, Math.random() * Math.PI * 2);
  bloodDecal(ctx, x, z, 1.9, baseY);
}

function emergencyLight(ctx: BuildCtx, x: number, y: number, z: number, color: number) {
  addFlickerLight(ctx, x, y, z, color, 1.4, 12, 1.2);
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    color === 0xc22a1e ? ctx.mats.redLight : ctx.mats.amberLight,
  );
  m.position.set(x, y, z);
  m.userData.noHit = true;
  ctx.scene.add(m);
}

// ── محول PropCtx (يدعم الإزاحة الرأسية للطوابق العلوية baseY) ──
function propCtxOf(ctx: BuildCtx, baseY = 0): PropCtx {
  return {
    push: (bucket, geo, m) => pushStatic(ctx, bucket, geo, m, baseY),
    collider: (minX, maxX, minZ, maxZ) =>
      ctx.colliders.push({ minX, maxX, minZ, maxZ, minY: baseY, maxY: baseY + 3.8 }),
  };
}

// ── التقاط بنموذج حقيقي ──
function pickupProp(
  ctx: BuildCtx,
  id: string,
  kind: InteractKind,
  x: number,
  z: number,
  prompt: string,
  data?: Record<string, unknown>,
  y = 0.14,
) {
  const model = pickupModel(data);
  model.position.set(x, y, z);
  model.rotation.y = Math.random() * Math.PI * 2;
  model.userData.pickupId = id;
  model.traverse((o) => {
    o.userData.pickupId = id;
  });
  ctx.scene.add(model);
  ctx.pickups.push({ id, obj: model });
  ctx.interactables.push({ id, kind, x, z, y, radius: 2.25, prompt, data, used: false });
}

function noteProp(ctx: BuildCtx, id: string, docId: string, x: number, z: number, y = 0.82) {
  pickupProp(ctx, id, "note", x, z, "قراءة الوثيقة", { docId }, y);
}

/** باب حقيقي بمفصلة + تفاعل (يدعم الأبواب في الطوابق العلوية baseY) */
function addDoorAt(
  ctx: BuildCtx,
  id: string,
  cx: number,
  cz: number,
  orient: "x" | "z",
  width: number,
  style: "wood" | "metal" | "double" | "hospital" = "wood",
  baseY = 0,
) {
  const def = makeDoor(width, style);
  if (orient === "x") {
    def.group.position.set(cx - width / 2, baseY, cz);
    def.group.rotation.y = 0;
  } else {
    def.group.position.set(cx, baseY, cz - width / 2);
    def.group.rotation.y = -Math.PI / 2;
  }
  def.group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.userData.doorMesh = id;
  });
  ctx.scene.add(def.group);
  const half = width / 2 + 0.08;
  const collider: Collider =
    orient === "x"
      ? { minX: cx - half, maxX: cx + half, minZ: cz - 0.14, maxZ: cz + 0.14, minY: baseY, maxY: baseY + 2.6 }
      : { minX: cx - 0.14, maxX: cx + 0.14, minZ: cz - half, maxZ: cz + half, minY: baseY, maxY: baseY + 2.6 };
  ctx.doors.push({ id, def, collider, open: false });
  ctx.interactables.push({
    id,
    kind: "door",
    x: cx,
    z: cz,
    y: baseY + 1.0,
    radius: 2.3,
    prompt: "فتح / إغلاق الباب",
    data: { doorId: id },
    used: false,
  });
}

// ═══════════════ المدينة ═══════════════
export function buildWorld(scene: THREE.Scene): WorldData {
  clockHandsRef.length = 0;
  const t = makeTextures();
  const mats = makeMats(t);
  const ctx: BuildCtx = {
    scene,
    mats,
    colliders: [],
    stairs: [],
    floors: [],
    virtualLights: [],
    buildings: [],
    spawns: [],
    interactables: [],
    triggers: [],
    fireLights: [],
    flickerLights: [],
    staticGeos: new Map(),
    blockedRoads: [],
    pickups: [],
    doors: [],
    survivors: [],
  };
  const w = propCtxOf(ctx);
  const rnd = seededRandom(20260114);

  // ── الأرضية والطرق ──
  const preChildren = new Set<THREE.Object3D>(scene.children);
  // الأرضية تنتهي عند ضفة النهر جنوباً (z=118) — النهر بعدها
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 244), mats.asphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -4);
  ground.userData.alwaysVisible = true;
  ground.userData.noHit = true;
  scene.add(ground);

  const roadXs = [-92, -46, 0, 46, 92];
  const roadZs = [-92, -46, 0, 46, 92];
  for (const x of roadXs) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(10, 236), mats.asphalt);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.01, 0);
    r.userData.alwaysVisible = true;
    r.userData.noHit = true;
    scene.add(r);
  }
  for (const z of roadZs) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(236, 10), mats.asphalt);
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0.015, z);
    r.userData.alwaysVisible = true;
    r.userData.noHit = true;
    scene.add(r);
  }

  // ── أرصفة مرتفعة حول كل حرم بلوك ──
  const blockCs = [-69, -23, 23, 69];
  for (const bx of blockCs) {
    for (const bz of blockCs) {
      // شريطان أفقيان + شريطان عموديان (بدون تداخل)
      w.push("sidewalk", new THREE.BoxGeometry(36, 0.12, 2.5), mat4(bx, 0.06, bz - 16.75));
      w.push("sidewalk", new THREE.BoxGeometry(36, 0.12, 2.5), mat4(bx, 0.06, bz + 16.75));
      w.push("sidewalk", new THREE.BoxGeometry(2.5, 0.12, 31), mat4(bx - 16.75, 0.06, bz));
      w.push("sidewalk", new THREE.BoxGeometry(2.5, 0.12, 31), mat4(bx + 16.75, 0.06, bz));
      // حافة رصيف (كورب) داكنة
      w.push("concrete", new THREE.BoxGeometry(36.3, 0.16, 0.22), mat4(bx, 0.05, bz - 18));
      w.push("concrete", new THREE.BoxGeometry(36.3, 0.16, 0.22), mat4(bx, 0.05, bz + 18));
      w.push("concrete", new THREE.BoxGeometry(0.22, 0.16, 36.3), mat4(bx - 18, 0.05, bz));
      w.push("concrete", new THREE.BoxGeometry(0.22, 0.16, 36.3), mat4(bx + 18, 0.05, bz));
    }
  }

  // ── دهانات الطرق: خطوط متقطعة + معابر ──
  const dash = new THREE.BoxGeometry(0.18, 0.02, 2.2);
  for (const x of roadXs) {
    for (let z = -99; z <= 99; z += 4.6) {
      if (roadZs.some((rz) => Math.abs(z - rz) < 8)) continue;
      w.push("paint", dash, mat4(x, 0.021, z));
    }
  }
  for (const z of roadZs) {
    for (let x = -99; x <= 99; x += 4.6) {
      if (roadXs.some((rx) => Math.abs(x - rx) < 8)) continue;
      w.push("paint", dash, mat4(x, 0.022, z, { ry: Math.PI / 2 }));
    }
  }
  // معابر مشاة عند تقاطعات رئيسية
  const zebra = new THREE.BoxGeometry(0.6, 0.02, 2.6);
  const crosswalk = (cx: number, cz: number, horiz: boolean) => {
    for (let i = -3; i <= 3; i++) {
      if (horiz) w.push("paint", zebra, mat4(cx + i * 1.05, 0.023, cz));
      else w.push("paint", zebra, mat4(cx, 0.023, cz + i * 1.05, { ry: Math.PI / 2 }));
    }
  };
  crosswalk(0, -6.5, true);
  crosswalk(0, 6.5, true);
  crosswalk(-6.5, 0, false);
  crosswalk(6.5, 0, false);
  crosswalk(-40, -69, false); // أمام بوابة مجمع كيبريس
  crosswalk(-23, 6.5, true); // أمام متجر الأسلحة/الساحة

  // جدران حدود المدينة — الجنوب مفتوح على رصيف نهر بلاك ووتر
  const B = 118;
  wallWithGaps(ctx, "rubble", -B, -B, B, -B);
  wallWithGaps(ctx, "rubble", -B, -B, -B, B);
  wallWithGaps(ctx, "rubble", B, -B, B, B);

  // ── أحياء خلفية ومبانٍ غير قابلة للدخول بتصميم معماري مطابق للمباني القابلة للدخول ──
  // دالة مساعدة لبناء مبنى مغلق غير قابل للدخول بنفس التفاصيل المعمارية (أفاريز، نوافذ ثلاثية الأبعاد، ستائر، رواق مدخل، وباب مغلق)
  const buildClosedBuilding = (
    cx: number,
    cz: number,
    wdt: number,
    dpt: number,
    floors: 2 | 3,
    wallMat: "brick" | "concrete" | "metal",
    trimStyle: "brick" | "concrete" | "hospital",
    winStyle: "wood" | "metal" | "hospital",
    doorSide: "N" | "S" | "E" | "W",
    withCurtains = true,
  ) => {
    const hgt = floors * 4.2;
    // الكتلة الجدارية المصمتة + مصادم يمنع الدخول
    addBox(ctx, wallMat, cx, 0, cz, wdt, hgt, dpt, false);
    ctx.colliders.push({
      minX: cx - wdt / 2 - 0.35,
      maxX: cx + wdt / 2 + 0.35,
      minZ: cz - dpt / 2 - 0.35,
      maxZ: cz + dpt / 2 + 0.35,
      minY: 0,
      maxY: hgt,
    });
    ctx.buildings.push({ x: cx, z: cz, w: wdt, d: dpt });

    // السقف العلوي والأفاريز المعمارية والأعمدة الركنية ووحدات التكييف
    roomRoof(ctx, cx, cz, wdt, dpt, "roof", hgt);
    buildingExteriorTrim(w, cx, cz, wdt, dpt, hgt, trimStyle);

    // رواق المدخل المعماري + إطار الباب + ضلفة باب ثلاثية الأبعاد مغلقة بإحكام
    const doorW = 2.0;
    const doorH = 2.45;
    const isNS = doorSide === "N" || doorSide === "S";
    const dx = doorSide === "E" ? cx + wdt / 2 : doorSide === "W" ? cx - wdt / 2 : cx;
    const dz = doorSide === "S" ? cz + dpt / 2 : doorSide === "N" ? cz - dpt / 2 : cz;
    const outX = doorSide === "E" ? 1 : doorSide === "W" ? -1 : 0;
    const outZ = doorSide === "S" ? 1 : doorSide === "N" ? -1 : 0;

    entrancePorch(w, dx, dz, 4.2, 2.2, 3.6, doorSide, trimStyle);
    realisticDoorFrame(w, dx, 0, dz, doorW, doorH, isNS ? "x" : "z", winStyle);

    // ضلفة الباب المغلق مع تجويف داكن وحشوات ومقبض ولوح حماية سفلي
    const doorMatName = winStyle === "metal" ? "metal" : winStyle === "hospital" ? "medWhite" : "wood2";
    const doorW1 = isNS ? doorW : 0.14;
    const doorD1 = isNS ? 0.14 : doorW;
    w.push("dark", new THREE.BoxGeometry(isNS ? doorW + 0.06 : 0.10, doorH, isNS ? 0.10 : doorW + 0.06), mat4(dx + outX * 0.03, doorH / 2, dz + outZ * 0.03));
    w.push(doorMatName, new THREE.BoxGeometry(doorW1, doorH - 0.06, doorD1), mat4(dx + outX * 0.08, doorH / 2, dz + outZ * 0.08));
    w.push("chrome", new THREE.BoxGeometry(isNS ? doorW - 0.16 : 0.18, 0.24, isNS ? 0.18 : doorW - 0.16), mat4(dx + outX * 0.09, 0.14, dz + outZ * 0.09));
    w.push("brass", new THREE.BoxGeometry(0.14, 0.22, 0.14), mat4(dx + outX * 0.13 + (isNS ? doorW * 0.34 : 0), 1.05, dz + outZ * 0.13 + (isNS ? 0 : doorW * 0.34)));

    // مصادم أعمدة رواق المدخل
    ctx.colliders.push({
      minX: dx + outX * 1.1 - (isNS ? 2.2 : 1.2),
      maxX: dx + outX * 1.1 + (isNS ? 2.2 : 1.2),
      minZ: dz + outZ * 1.1 - (isNS ? 1.2 : 2.2),
      maxZ: dz + outZ * 1.1 + (isNS ? 1.2 : 2.2),
      minY: 0,
      maxY: 3.8,
    });

    // توزيع النوافذ الواقعية ثلاثية الأبعاد على الواجهات الأربع عبر كافة الطوابق
    const winW = 1.85;
    const winH = 1.9;
    const addClosedWin = (wx: number, wy: number, wz: number, orient: "x" | "z", nX: number, nZ: number) => {
      const pw = propCtxOf(ctx, wy - 1.1);
      realisticWindow(pw, wx, 1.1, wz, winW, winH, orient, winStyle);
      // خلفية زجاجية معتمة داخل إطار النافذة تمنع ظهور الجدار المصمت خلف الزجاج
      w.push(
        "dark",
        new THREE.BoxGeometry(orient === "x" ? winW - 0.16 : 0.14, winH - 0.12, orient === "z" ? winW - 0.16 : 0.14),
        mat4(wx + nX * 0.06, wy + winH / 2 - 0.04, wz + nZ * 0.06),
      );
      if (withCurtains) {
        curtainPair(pw, wx + nX * 0.09, 1.1, wz + nZ * 0.09, winW, winH, orient);
      }
    };

    const colsX = wdt >= 22 ? [-wdt * 0.3, 0, wdt * 0.3] : [-wdt * 0.26, wdt * 0.26];
    const colsZ = dpt >= 22 ? [-dpt * 0.3, 0, dpt * 0.3] : [-dpt * 0.26, dpt * 0.26];

    for (let f = 0; f < floors; f++) {
      const wy = f * 4.2 + 1.1;
      for (const ox of colsX) {
        if (f === 0 && doorSide === "N" && Math.abs(ox) < 2.4) continue;
        addClosedWin(cx + ox, wy, cz - dpt / 2, "x", 0, -1);
      }
      for (const ox of colsX) {
        if (f === 0 && doorSide === "S" && Math.abs(ox) < 2.4) continue;
        addClosedWin(cx + ox, wy, cz + dpt / 2, "x", 0, 1);
      }
      for (const oz of colsZ) {
        if (f === 0 && doorSide === "W" && Math.abs(oz) < 2.4) continue;
        addClosedWin(cx - wdt / 2, wy, cz + oz, "z", -1, 0);
      }
      for (const oz of colsZ) {
        if (f === 0 && doorSide === "E" && Math.abs(oz) < 2.4) continue;
        addClosedWin(cx + wdt / 2, wy, cz + oz, "z", 1, 0);
      }
    }

    // تجهيزات السطح (خزانات مياه ووحدات تكييف مركزية)
    w.push("metal", new THREE.CylinderGeometry(0.95, 0.95, 1.8, 10), mat4(cx - wdt * 0.24, hgt + 0.9, cz + dpt * 0.22));
    w.push("metal", new THREE.BoxGeometry(1.4, 0.85, 1.1), mat4(cx + wdt * 0.24, hgt + 0.42, cz - dpt * 0.2, { ry: 0.3 }));
  };

  const usedBlocks = new Set([
    "-69,-69", "-23,-69", "69,-69", "23,-23", "-23,-23", "-23,23", "-69,23", "-69,69", "69,23", "69,69",
  ]);
  for (const bx of blockCs) {
    for (const bz of blockCs) {
      if (usedBlocks.has(`${bx},${bz}`)) continue;
      const downtown = bx > 0 && bz < 0;
      const commercial = bz > 0;
      if (commercial && bx !== 69) {
        // حي تجاري: مبنيان متجاوران بطابقين ونوافذ ثلاثية الأبعاد وأبواب مغلقة ولافتات ومظلات
        buildClosedBuilding(bx - 7.5, bz, 14, 22, 2, "brick", "brick", "wood", "N", true);
        buildClosedBuilding(bx + 8.0, bz, 14, 20, 2, "concrete", "concrete", "metal", "N", false);
        // مظلات قماشية فوق الواجهات
        w.push("fabric2", new THREE.BoxGeometry(8, 0.08, 1.6), mat4(bx - 7.5, 3.55, bz - 11.8, { rx: 0.25 }));
        w.push("fabric2", new THREE.BoxGeometry(7, 0.08, 1.6), mat4(bx + 8.0, 3.55, bz - 10.8, { rx: 0.25 }));
        // لافتات عربية مضيئة
        const s1 = shopSign(bx - 7.5, 4.45, bz - 11.35, 0, ["صيدلية النور", "بقالة الأمانة", "مكتبة الأمل"][Math.floor(rnd() * 3)]);
        const s2 = shopSign(bx + 8.0, 4.45, bz - 10.35, 0, ["مقهى الشرق", "مصورات المدينة", "حلاق الشارع"][Math.floor(rnd() * 3)]);
        s1.userData.noHit = true;
        s2.userData.noHit = true;
        scene.add(s1, s2);
      } else if (downtown) {
        // وسط المدينة: مبنى إداري/طبي مغلق من 3 طوابق بتفاصيل معمارية كاملة
        buildClosedBuilding(bx, bz, 24, 20, 3, "concrete", "concrete", "hospital", "S", true);
        w.push("metal", new THREE.CylinderGeometry(0.08, 0.12, 4.5, 6), mat4(bx + 4, 12.6 + 2.25, bz - 4));
        w.push("redEmissive", new THREE.SphereGeometry(0.14, 6, 6), mat4(bx + 4, 12.6 + 4.5, bz - 4));
      } else {
        // أحياء سكنية/إدارية: مبانٍ من طابقين أو 3 طوابق بتصميم مماثل للمباني القابلة للدخول
        const isThreeFloor = bx < 0;
        buildClosedBuilding(
          bx,
          bz,
          24,
          20,
          isThreeFloor ? 3 : 2,
          isThreeFloor ? "concrete" : "brick",
          isThreeFloor ? "concrete" : "brick",
          isThreeFloor ? "metal" : "wood",
          bx < 0 ? "E" : "W",
          true,
        );
      }
    }
  }

  // ── الساحة الرئيسية (3) — مركز المدينة مع النافورة ──
  {
    const px = -23, pz = -23;
    // أرضية ساحة مبلطة
    w.push("sidewalk", new THREE.BoxGeometry(30, 0.13, 30), mat4(px, 0.065, pz));
    // برج الساعة يطل على الساحة من زاويتها الشمالية الشرقية
    const tower = clockTower(w, px + 11, pz - 11);
    tower.faces.forEach((f) => scene.add(f));
    // الساعة متجمدة لحظة الكارثة: 2:47
    for (let i = 0; i < tower.hands.length; i += 2) {
      (tower.hands[i] as THREE.Object3D).rotation.z = -1.31;
      (tower.hands[i + 1] as THREE.Object3D).rotation.z = -4.92;
    }
    clockHandsRef.push(...tower.hands);
    // النافورة في قلب الساحة (كما في خريطة المدينة)
    fountain(w, px, pz + 1);
    bench(w, px - 6, pz + 7, 0.3);
    bench(w, px + 6, pz + 7, Math.PI - 0.3);
    bench(w, px, pz - 6, 0);
    bench(w, px - 8, pz + 12, 0.3);
    deadTree(w, px - 10, pz - 9);
    deadTree(w, px + 11, pz - 6);
    deadTree(w, px - 9, pz + 12);
    lampPost(w, px - 12, pz - 12, Math.PI / 2, false);
    lampPost(w, px + 12, pz + 12, -Math.PI / 2, true);
    addFlickerLight(ctx, px + 12, 5, pz + 13.5, 0xe8a850, 1.1, 14, 2.2);
    trashBin(w, px + 2, pz + 12.5);
    trashBags(w, px - 13, pz + 2);
    hydrant(w, px + 13, pz + 2);
    ctx.buildings.push({ x: px, z: pz, w: 30, d: 30, name: "الساحة الرئيسية", poi: true });
    ctx.spawns.push({ kind: "spitter", x: px - 4, z: pz + 3, wander: 7 });
    ctx.spawns.push({ kind: "walker", x: px - 8, z: pz - 6, wander: 8 });
    ctx.spawns.push({ kind: "walker", x: px + 9, z: pz - 10, wander: 8 });
    ctx.triggers.push({ id: "trig_plaza", x: px, z: pz, radius: 20, once: true });
  }

  // ── الحطام الذي يسد الطرق ──
  debrisPile(ctx, 46, 34, 9, 7);
  debrisPile(ctx, -46, -34, 9, 7);
  debrisPile(ctx, 0, 68, 9, 7);
  debrisPile(ctx, -92, 58, 7, 9);
  debrisPile(ctx, 92, -58, 7, 9);
  debrisPile(ctx, 34, -92, 9, 7);
  debrisPile(ctx, -34, 92, 9, 7);
  debrisPile(ctx, 68, 0, 7, 9);

  // ── سيارات: حوادث وحطام سيارات مدمرة ومهجورة (موزعة بدقة على المسارات والتقاطعات دون أي تداخل مع الأرصفة أو الحواجز) ──
  const cars: [number, number, number, CarVariantLike][] = [
    // الشارع الأوسط العمودي (x = 0)
    [3.1, -62, 0.08, "wreck"], [-3.1, -53, Math.PI - 0.06, "taxi"], [3.0, -28, -0.14, "wreck"],
    [-2.8, -19, 2.75, "wreck"], [0, 0, 0.72, "wreck"], [-3.1, 13, -0.10, "wreck"],
    [3.1, 43, Math.PI + 0.12, "wreck"], [-3.1, 55, 0.06, "van"],
    // الشارع الأوسط الأفقي (z = 0)
    [-44, 3.1, Math.PI / 2 - 0.08, "wreck"], [-60, -3.1, -Math.PI / 2 + 0.10, "wreck"],
    [25, 3.1, Math.PI / 2 + 0.05, "taxi"], [54, -3.1, -Math.PI / 2 - 0.08, "wreck"], [80, 3.1, Math.PI / 2 + 0.04, "van"],
    // الشارع الشرقي العمودي (x = 46)
    [48.2, -62, 0.06, "sedan"], [43.8, -24, Math.PI - 0.10, "wreck"], [48.2, 15, 0.08, "wreck"], [43.8, 60, Math.PI + 0.05, "sedan"],
    // الشارع الغربي العمودي (x = -46)
    [-43.8, -60, -0.08, "wreck"], [-48.2, 15, Math.PI + 0.06, "sedan"], [-48.2, 60, Math.PI - 0.08, "taxi"],
    // الشارع الشمالي الأفقي (z = -46) — محاذاة صحيحة على محور X (Math.PI / 2) لمنع التداخل مع الأرصفة
    [-60, -43.8, Math.PI / 2 + 0.08, "wreck"], [-25, -48.2, -Math.PI / 2 + 0.05, "van"],
    [20, -43.8, Math.PI / 2 - 0.10, "sedan"], [70, -48.2, -Math.PI / 2 - 0.06, "wreck"],
    // الشارع الجنوبي الأفقي (z = +46) — محاذاة صحيحة على محور X (Math.PI / 2)
    [-70, 43.8, Math.PI / 2 - 0.06, "sedan"], [-20, 48.2, -Math.PI / 2 + 0.08, "wreck"],
    [30, 43.8, Math.PI / 2 + 0.12, "wreck"], [70, 43.8, Math.PI / 2 - 0.05, "van"],
    // تقاطعات رئيسية وحوادث مركبات طوارئ
    [-46, 46, 2.15, "wreck"], [46, -46, 1.10, "van"],
    [65, -35, 0.15, "police"], [-15, 15, 1.60, "ambulance"],
  ];
  for (const [cx, cz, cr, variant] of cars) {
    car(w, cx, cz, cr, variant, rnd());
  }
  // حافلة محترقة تسد الشارع الرئيسي
  busWreck(w, 0, -40, 0.26);
  // حرائق سيارات (ضوءان فقط حفاظاً على الأداء)
  addFire(ctx, 0.8, 0.8, 0.75);
  addFire(ctx, 48.2, 14.2, 0.7);

  // أكوام حطام شوارع متناثرة قرب الحوادث وعلى جوانب الطرقات (مرتكزة بالكامل على الأرض y=0 دون غلتشات)
  const streetRubbleSpots: [number, number, number][] = [
    [3.8, -35, 0.4], [-3.8, -6, 1.2], [4.0, 22, 2.1], [-38, -3.6, 0.8],
    [38, 3.6, 1.7], [42.2, -16, 2.5], [-42.2, 26, 0.9], [-12, -42.5, 1.4],
    [12, 42.5, 2.8], [58, -42.5, 0.6], [-58, 42.5, 1.9], [3.6, 82, 1.1],
  ];
  streetRubbleSpots.forEach(([rx, rz, rry], idx) => {
    streetRubbleCluster(w, rx, rz, rry, idx + 1);
  });

  // جثث بشرية مفصلية كاملة وآثار دماء في الشوارع وقرب الحوادث
  const corpseSpots: [number, number][] = [
    [30, 30], [-30, -30], [50, 8], [-8, 50], [15, -55], [-55, 15], [80, -10], [-80, 10],
    [26, 62], [-60, -60], [40, -26], [-26, 40], [3.2, -45], [-3.5, 4], [44, 18], [-44, -55],
  ];
  corpseSpots.forEach(([x, z], i) => {
    if (i % 3 === 0) bodyBag(w, x, z, rnd() * Math.PI * 2);
    else coveredBody(w, x, z, rnd() * Math.PI * 2);
    bloodDecal(ctx, x, z, 1.8);
  });
  bloodTrail(ctx, -26, 40, -30, 46);
  bloodTrail(ctx, 30, 30, 24, 36);

  // ── أعمدة إنارة (8 مضاءة) وإشارات ──
  const litLamps: [number, number, number][] = [
    [6.4, -70, Math.PI / 2], [-6.4, -20, -Math.PI / 2], [6.4, 30, Math.PI / 2], [-6.4, 80, -Math.PI / 2],
    [30, 6.4, Math.PI], [-30, -6.4, 0], [75, -6.4, 0], [-52.4, 20, Math.PI / 2],
  ];
  for (const [lx, lz, lr] of litLamps) {
    lampPost(w, lx, lz, lr, true);
    addFlickerLight(ctx, lx + Math.sin(lr) * 1.75, 4.9, lz + Math.cos(lr) * 1.75, 0xe8a850, 1.0, 14, 1.4 + rnd() * 2);
  }
  const deadLamps: [number, number, number][] = [
    [-6.4, 45, -Math.PI / 2], [6.4, 5, Math.PI / 2], [-52.4, -20, Math.PI / 2], [52.4, -30, -Math.PI / 2],
    [20, 52.4, Math.PI], [-70, -52.4, 0], [80, 52.4, Math.PI], [23, 52.6, Math.PI], [-23, -52.6, 0],
  ];
  for (const [lx, lz, lr] of deadLamps) lampPost(w, lx, lz, lr, false);

  trafficLight(w, 7, 7, Math.PI * 0.75, "green");
  trafficLight(w, -7, -7, -Math.PI * 0.25, "dead");
  trafficLight(w, 7, -7, Math.PI * 0.25, "dead");
  trafficLight(w, -7, 7, -Math.PI * 0.75, "dead");

  hydrant(w, 12, 7);
  hydrant(w, -52, 41);
  hydrant(w, 41, -52);
  trashBin(w, 18, 41);
  trashBin(w, -41, -18);
  trashBags(w, 18.8, -18);
  trashBags(w, 44, 8);
  trashBags(w, -14, 44);
  deadTree(w, 52, 7);
  deadTree(w, -7, 52);

  // لوحة إعلانية قرب الحي التجاري
  {
    w.push("metal", new THREE.CylinderGeometry(0.14, 0.18, 6, 8), mat4(13.5, 3, 57));
    w.push("metal", new THREE.CylinderGeometry(0.14, 0.18, 6, 8), mat4(19.5, 3, 57));
    w.push("dark", new THREE.BoxGeometry(7.2, 3.4, 0.25), mat4(16.5, 5.6, 57));
    const bbCanvas = document.createElement("canvas");
    bbCanvas.width = 256;
    bbCanvas.height = 128;
    const bbCtx = bbCanvas.getContext("2d")!;
    const bbTex = new THREE.CanvasTexture(bbCanvas);
    const drawBb = (lang: "en" | "ar") => {
      bbCtx.fillStyle = "#171310";
      bbCtx.fillRect(0, 0, 256, 128);
      bbCtx.fillStyle = "#7a1a12";
      bbCtx.font = lang === "en" ? "bold 28px Cairo, Arial" : "bold 34px Cairo, Arial";
      bbCtx.textAlign = "center";
      bbCtx.fillText(lang === "en" ? "KYPRIS CORP" : "كيبريس", 128, 52);
      bbCtx.fillStyle = "#8a7a4a";
      bbCtx.font = lang === "en" ? "16px Cairo, Arial" : "22px Cairo, Arial";
      bbCtx.fillText(lang === "en" ? "A Safer Tomorrow… A Promise Kept" : "مستقبلٌ آمن… وعدٌ صادق", 128, 92);
      bbCtx.fillStyle = "rgba(0,0,0,0.5)";
      bbCtx.fillRect(60, 0, 40, 128);
      bbTex.needsUpdate = true;
    };
    drawBb("en");
    const bb = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 3.1),
      new THREE.MeshStandardMaterial({ map: bbTex, roughness: 0.8, emissive: 0x333333, emissiveIntensity: 0.25 }),
    );
    bb.position.set(16.5, 5.6, 56.85);
    bb.rotation.y = Math.PI;
    bb.userData.noHit = true;
    bb.userData.updateSignLang = drawBb;
    scene.add(bb);
  }

  // ═══════════ المباني القابلة للدخول ═══════════

  // ── 1) منزل شقة جون (البداية) في حي شادو هافن السكني (-23,-69) — منزل حقيقي من طابقين ──
  {
    const cx = -23, cz = -69;
    const w2 = propCtxOf(ctx, 4.2);

    // الطابق الأرضي + السقف النهائي للطابق الثاني + الزخارف الخارجية متعددة الطوابق
    roomFloor(ctx, cx, cz, 18, 14);
    // فصل أرضية الخشب الشرقية عن بلاط الغرفة الداخلية الغربية لمنع التداخل البصري (Z-fighting)
    w.push("woodFloor", new THREE.BoxGeometry(10.0, 0.04, 13.6), mat4(cx + 3.8, 0.05, cz));
    w.push("tile", new THREE.BoxGeometry(7.5, 0.04, 13.6), mat4(cx - 5.05, 0.05, cz));
    roomRoof(ctx, cx, cz, 18, 14, "roof", 8.4);
    buildingExteriorTrim(w, cx, cz, 18, 14, 8.4, "brick");
    entrancePorch(w, cx + 4.5, cz + 7, 4.4, 2.4, 3.6, "S", "brick");

    // الجدران الخارجية للطابق الأرضي (y = 0..4.2) مع نوافذ حقيقية بجدران سفلية وستائر
    wallWithGaps(ctx, "brick", cx - 9, cz - 7, cx + 9, cz - 7, [
      { at: 4.5, width: 1.8, sill: 1.05, top: 3.0 },
      { at: 13.5, width: 1.8, sill: 1.05, top: 3.0 },
    ]);
    realisticWindow(w, cx - 4.5, 1.05, cz - 7, 1.8, 1.95, "x", "wood");
    realisticWindow(w, cx + 4.5, 1.05, cz - 7, 1.8, 1.95, "x", "wood");
    curtainPair(w, cx - 4.5, 1.05, cz - 6.65, 1.8, 1.95, "x");
    curtainPair(w, cx + 4.5, 1.05, cz - 6.65, 1.8, 1.95, "x");

    wallWithGaps(ctx, "brick", cx - 9, cz + 7, cx + 9, cz + 7, [
      { at: 4.5, width: 1.8, sill: 1.05, top: 3.0 },
      { at: 13.5, width: 1.8 },
    ]);
    realisticDoorFrame(w, cx + 4.5, 0, cz + 7, 1.8, 2.5, "x", "wood");
    realisticWindow(w, cx - 4.5, 1.05, cz + 7, 1.8, 1.95, "x", "wood");
    curtainPair(w, cx - 4.5, 1.05, cz + 6.65, 1.8, 1.95, "x");

    wallWithGaps(ctx, "brick", cx - 9, cz - 7, cx - 9, cz + 7, [
      { at: 7, width: 1.8, sill: 1.05, top: 3.0 },
    ]);
    realisticWindow(w, cx - 9, 1.05, cz, 1.8, 1.95, "z", "wood");
    curtainPair(w, cx - 8.65, 1.05, cz, 1.8, 1.95, "z");
    wallWithGaps(ctx, "brick", cx + 9, cz - 7, cx + 9, cz + 7, [
      { at: 10.5, width: 1.8, sill: 1.05, top: 3.0 },
    ]);
    realisticWindow(w, cx + 9, 1.05, cz + 3.5, 1.8, 1.95, "z", "wood");

    // تقسيم الطابق الأرضي: ردهة الاستقبال + صالة المعيشة + الغرفة الداخلية (المكتب والمطبخ)
    coatRack(w, cx + 2.2, cz + 5.8);
    wallPicture(w, cx + 1.2, 1.6, cz + 6.65, 1.2, 0.85, "x", "art");

    // جدار فاصل بين الغرفة الداخلية وصالة المعيشة بفتحة باب واسعة
    wallWithGaps(ctx, "wallpaper", cx - 1.2, cz - 7, cx - 1.2, cz + 7, [{ at: 9.5, width: 1.9 }]);
    realisticDoorFrame(w, cx - 1.2, 0, cz + 2.5, 1.9, 2.45, "z", "wood");

    // صالة المعيشة (Living Room — الجناح الشرقي الأرضي)
    sofa(w, cx + 2.6, cz + 1.2, Math.PI, 2.2);
    coffeeTable(w, cx + 2.6, cz - 0.6, 0);
    tvSet(w, cx + 2.6, cz - 6.1, 0);
    bookshelfFull(w, cx + 0.2, cz - 2.5, Math.PI / 2, 2.2, 101);
    deadPlant(w, cx + 5.0, cz - 5.8);
    wallPicture(w, cx - 0.85, 1.65, cz - 1.5, 1.3, 0.9, "z", "art");

    // الغرفة الداخلية الأرضية: مكتب جون الشخصي (جنوب غرب) + المطبخ (شمال غرب)
    desk(w, cx - 4.8, cz + 4.2, 0, true);
    officeChair(w, cx - 4.8, cz + 2.9, Math.PI);
    bookshelfFull(w, cx - 8.2, cz + 4.2, Math.PI / 2, 2.0, 108);
    kitchenCounter(w, cx - 7.8, cz - 4.2, Math.PI / 2, 3.4);
    kitchenStove(w, cx - 7.8, cz - 1.4, Math.PI / 2);
    fridge(w, cx - 7.8, cz + 0.6, Math.PI / 2, true);
    diningTable(w, cx - 4.5, cz - 2.2, 0);
    cabinet(w, cx - 4.5, cz - 6.2, 0, "wood2");

    // الدرج الخشبي الداخلي الصاعد للطابق الثاني (يتسلق باتجاه -z من cz+2.6 إلى cz-3.6)
    addWalkableStairs(ctx, cx + 6.8, 0, cz - 0.5, 2.2, 4.2, 6.2, "-z");

    // ──────────────── الطابق الثاني للمنزل (y = 4.2..8.4) ────────────────
    floorSlabWithHole(ctx, cx, cz, 18, 14, 4.2, cx + 5.6, cx + 8.0, cz - 3.7, cz + 2.7, "woodFloor");
    // دربزين خشبي حول فتحة الدرج في الطابق الثاني (الجهة الشمالية cz-3.7 مفتوحة للخروج من الدرج)
    railingSection(w2, cx + 5.6, cz - 3.7, cx + 5.6, cz + 2.7, "wood");
    railingSection(w2, cx + 5.6, cz + 2.7, cx + 8.0, cz + 2.7, "wood");

    // الجدران الخارجية للطابق الثاني مع النوافذ والستائر
    wallWithGaps(
      ctx,
      "brick",
      cx - 9,
      cz - 7,
      cx + 9,
      cz - 7,
      [
        { at: 4.5, width: 1.8, sill: 1.05, top: 3.0 },
        { at: 13.5, width: 1.8, sill: 1.05, top: 3.0 },
      ],
      4.2,
    );
    realisticWindow(w2, cx - 4.5, 1.05, cz - 7, 1.8, 1.95, "x", "wood");
    realisticWindow(w2, cx + 4.5, 1.05, cz - 7, 1.8, 1.95, "x", "wood");
    curtainPair(w2, cx + 4.5, 1.05, cz - 6.65, 1.8, 1.95, "x");

    wallWithGaps(
      ctx,
      "brick",
      cx - 9,
      cz + 7,
      cx + 9,
      cz + 7,
      [
        { at: 4.5, width: 1.8, sill: 1.05, top: 3.0 },
        { at: 13.5, width: 1.8, sill: 1.05, top: 3.0 },
      ],
      4.2,
    );
    realisticWindow(w2, cx - 4.5, 1.05, cz + 7, 1.8, 1.95, "x", "wood");
    realisticWindow(w2, cx + 4.5, 1.05, cz + 7, 1.8, 1.95, "x", "wood");
    curtainPair(w2, cx - 4.5, 1.05, cz + 6.65, 1.8, 1.95, "x");
    curtainPair(w2, cx + 4.5, 1.05, cz + 6.65, 1.8, 1.95, "x");

    wallWithGaps(
      ctx,
      "brick",
      cx - 9,
      cz - 7,
      cx - 9,
      cz + 7,
      [{ at: 4.5, width: 1.8, sill: 1.05, top: 3.0 }],
      4.2,
    );
    realisticWindow(w2, cx - 9, 1.05, cz - 2.5, 1.8, 1.95, "z", "wood");
    curtainPair(w2, cx - 8.65, 1.05, cz - 2.5, 1.8, 1.95, "z");
    wallWithGaps(ctx, "brick", cx + 9, cz - 7, cx + 9, cz + 7, [], 4.2);

    // تقسيم غرف الطابق الثاني:
    // 1) غرفة نوم ومكتب جون العلوي مباشرة أمام مخرج الدرج الشمالي (الركن الشمالي الغربي للطابق الثاني)
    wallWithGaps(ctx, "wallpaper", cx + 1.5, cz - 7, cx + 1.5, cz + 7, [{ at: 3.2, width: 1.8 }, { at: 10.8, width: 1.6 }], 4.2);
    realisticDoorFrame(w2, cx + 1.5, 0, cz - 3.8, 1.8, 2.45, "z", "wood");
    realisticDoorFrame(w2, cx + 1.5, 0, cz + 3.8, 1.6, 2.45, "z", "wood");
    wallWithGaps(ctx, "wallpaper", cx - 9, cz + 1.2, cx + 1.5, cz + 1.2, [], 4.2);

    bed(w2, cx - 6.2, cz - 4.8, Math.PI);
    wardrobeCloset(w2, cx - 7.8, cz - 0.2, Math.PI);
    bookshelfFull(w2, cx - 1.8, cz - 6.2, 0, 1.8, 202);
    desk(w2, cx - 3.2, cz - 1.8, 0, true);
    officeChair(w2, cx - 3.2, cz - 3.0, Math.PI);
    wallPicture(w2, cx - 5.5, 1.65, cz + 0.85, 1.4, 0.9, "x", "art");

    // 2) الحمام المستقل في الطابق الثاني (الركن الجنوبي الغربي)
    w2.push("tile", new THREE.BoxGeometry(10.0, 0.045, 5.2), mat4(cx - 3.75, 0.05, cz + 4.1));
    bathroomTub(w2, cx - 7.6, cz + 4.6, Math.PI / 2);
    toiletBowl(w2, cx - 4.5, cz + 6.1, Math.PI);
    sinkVanity(w2, cx - 1.8, cz + 6.1, Math.PI);

    // 3) ردهة الطابق الثاني المطلة على الدرج
    sofa(w2, cx + 3.6, cz + 5.4, Math.PI, 1.8);
    bookshelfFull(w2, cx + 3.5, cz - 6.2, 0, 2.0, 205);

    // إضاءة الطابقين (دافئة خافتة على طراز سايلنت هيل)
    fluoro(ctx, cx + 3.2, cz - 1, 0xd0a860, 0.85, 11, 7, 0);
    fluoro(ctx, cx - 4.8, cz + 2.5, 0xd0a860, 0.95, 11, 8, 0);
    fluoro(ctx, cx - 4.2, cz - 3.2, 0xd0a860, 0.9, 11, 6, 4.2);
    fluoro(ctx, cx + 3.8, cz - 2.0, 0xd0a860, 0.8, 10, 9, 4.2);

    // آثار الكارثة ودماء
    coveredBody(w, cx + 2.8, cz - 2.5, 0.7);
    bloodDecal(ctx, cx + 2.4, cz - 2, 2.0, 0);
    bloodDecal(ctx, cx - 3.2, cz - 2.8, 1.4, 4.2);

    // خزانة الحفظ في الغرفة الداخلية الأرضية + غرفة النوم العلوية
    addBox(ctx, "metal", cx - 8.2, 0, cz + 1.8, 0.8, 2.2, 1.1);
    ctx.interactables.push({
      id: "apt_safe",
      kind: "checkpoint",
      x: cx - 8.2,
      z: cz + 1.8,
      y: 1.0,
      radius: 2.2,
      prompt: "خزانة الحفظ — حفظ التقدم",
      used: false,
    });

    // الالتقاطات: التسجيل الشخصي (doc_1) على مكتب الغرفة الداخلية الأرضية وعلى مكتب غرفة النوم العلوية معاً!
    noteProp(ctx, "apt_rec", "doc_1", cx - 4.8, cz + 4.2, 0.82);
    noteProp(ctx, "apt_rec_up", "doc_1", cx - 3.2, cz - 1.8, 4.2 + 0.82);
    pickupProp(ctx, "apt_stick_1", "item", cx + 1.8, cz + 4.8, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "apt_stick_2", "item", cx + 3.2, cz + 2.2, "التقاط عصا خشبية", { weapon: "crowbar" }, 4.2 + 0.12);
    pickupProp(ctx, "apt_band", "item", cx - 1.8, cz + 6.0, "التقاط ضمادة", { item: "bandage", qty: 1 }, 4.2 + 0.92);
    pickupProp(ctx, "apt_battery", "item", cx - 7.5, cz - 4.0, "التقاط بطارية", { item: "battery", qty: 1 }, 1.0);

    // الأبواب
    addDoorAt(ctx, "door_apt", cx + 4.5, cz + 7, "x", 1.8, "wood", 0);
    addDoorAt(ctx, "door_apt_bath", cx + 1.5, cz + 3.8, "z", 1.6, "wood", 4.2);
    ctx.buildings.push({ x: cx, z: cz, w: 18, d: 14, name: "شقتك", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 2, z: cz + 13, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 14, z: cz + 14, wander: 8 });
    ctx.triggers.push({ id: "trig_apartment_exit", x: cx + 4.5, z: cz + 10, radius: 5, once: true });
  }

  // ── 2) متجر الأسلحة (5) — جنوب الساحة الرئيسية (-23,23) — مبنى تجاري واقعي ──
  {
    const cx = -23, cz = 23;
    const w2 = propCtxOf(ctx, 4.2);
    roomFloor(ctx, cx, cz, 16, 14);
    w.push("woodFloor", new THREE.BoxGeometry(15.6, 0.04, 13.6), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, 16, 14, "roof", 4.2);
    roomRoof(ctx, cx, cz, 16, 14, "roof", 8.4);
    buildingExteriorTrim(w, cx, cz, 16, 14, 8.4, "concrete");
    entrancePorch(w, cx, cz - 7, 3.8, 2.0, 3.5, "N", "concrete");

    // واجهة المتجر الشمالية مع نوافذ عرض سلاح محمية بقضبان وباب رئيسي
    wallWithGaps(ctx, "brick", cx - 8, cz - 7, cx + 8, cz - 7, [
      { at: 3.5, width: 2.4, sill: 0.95, top: 3.0 },
      { at: 8, width: 2.0 },
      { at: 12.5, width: 2.4, sill: 0.95, top: 3.0 },
    ]);
    realisticDoorFrame(w, cx, 0, cz - 7, 2.0, 2.5, "x", "metal");
    realisticWindow(w, cx - 4.5, 0.95, cz - 7, 2.4, 2.05, "x", "metal");
    realisticWindow(w, cx + 4.5, 0.95, cz - 7, 2.4, 2.05, "x", "metal");
    const gunSign = shopSign(cx, 4.5, cz - 7.35, 0, "متجر الأسلحة والعتاد — ARMS & AMMO");
    gunSign.userData.noHit = true;
    scene.add(gunSign);

    wallWithGaps(ctx, "brick", cx - 8, cz + 7, cx + 8, cz + 7);
    wallWithGaps(ctx, "brick", cx - 8, cz - 7, cx - 8, cz + 7, [{ at: 7, width: 1.8, sill: 1.2, top: 3.0 }]);
    realisticWindow(w, cx - 8, 1.2, cz, 1.8, 1.8, "z", "metal");
    wallWithGaps(ctx, "brick", cx + 8, cz - 7, cx + 8, cz + 7, [{ at: 7, width: 1.8, sill: 1.2, top: 3.0 }]);
    realisticWindow(w, cx + 8, 1.2, cz, 1.8, 1.8, "z", "metal");

    // واجهة الطابق العلوي المعمارية للمبنى التجاري
    wallWithGaps(ctx, "brick", cx - 8, cz - 7, cx + 8, cz - 7, [
      { at: 4, width: 1.8, sill: 1.1, top: 3.0 },
      { at: 12, width: 1.8, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 4, 1.1, cz - 7, 1.8, 1.9, "x", "wood");
    realisticWindow(w2, cx + 4, 1.1, cz - 7, 1.8, 1.9, "x", "wood");
    wallWithGaps(ctx, "brick", cx - 8, cz + 7, cx + 8, cz + 7, [], 4.2);
    wallWithGaps(ctx, "brick", cx - 8, cz - 7, cx - 8, cz + 7, [], 4.2);
    wallWithGaps(ctx, "brick", cx + 8, cz - 7, cx + 8, cz + 7, [], 4.2);

    // صالة العرض الرئيسية (Main Showroom)
    counter(w, cx + 1, cz - 3, 0, 3.2);
    gunRack(w, cx, cz + 6.5, Math.PI);
    gunRack(w, cx + 4.5, cz + 6.5, Math.PI);
    shelfStocked(w, cx + 6.8, cz + 1, Math.PI / 2, 3.2, true);
    shelfStocked(w, cx - 6.8, cz - 2, -Math.PI / 2, 2.6, true);
    w.push("glassWindow", new THREE.BoxGeometry(2.4, 0.06, 0.8), mat4(cx - 3.5, 1.18, cz + 1.5));
    counter(w, cx - 3.5, cz + 1.5, Math.PI / 2, 2.2);

    // غرفة الورشة الخلفية لصيانة السلاح (Gunsmith Workshop)
    wallWithGaps(ctx, "metal", cx - 8, cz + 3, cx + 2, cz + 3, [{ at: 6, width: 1.6 }]);
    realisticDoorFrame(w, cx - 2, 0, cz + 3, 1.6, 2.45, "x", "metal");
    addBox(ctx, "metal", cx - 5.5, 0, cz + 5.5, 2.4, 0.9, 1.1);
    w.push("chrome", new THREE.BoxGeometry(0.3, 0.25, 0.2), mat4(cx - 4.8, 1.05, cz + 5.5));
    cratesStack(w, cx - 6.5, cz + 5.8);
    barrel(w, cx + 6.5, cz - 5.0, "greenMetal");
    barrel(w, cx + 6.5, cz + 5.5, "carB");

    bloodDecal(ctx, cx - 1, cz + 1.5, 2.4);
    fluoro(ctx, cx, cz - 2, 0xd0a860, 1.2, 12, 11);
    fluoro(ctx, cx - 4, cz + 5, 0xd8e8d0, 1.0, 8, 14);

    pickupProp(ctx, "gun_pistol", "item", cx + 1, cz - 3, "التقاط مسدس الخدمة", { weapon: "pistol" }, 1.25);
    pickupProp(ctx, "gun_stick", "item", cx - 5.5, cz - 4.5, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "gun_ammo1", "item", cx - 0.5, cz - 3.2, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 24 }, 1.25);
    pickupProp(ctx, "gun_shotgun", "item", cx + 6.5, cz + 0.4, "التقاط بندقية الصيد", { weapon: "shotgun" }, 0.95);
    pickupProp(ctx, "gun_shells", "item", cx + 6.8, cz + 1.8, "التقاط خرطوش", { item: "shotgun_ammo", qty: 8 }, 0.95);
    pickupProp(ctx, "gun_extra_ammo", "item", cx - 5.5, cz + 5.5, "التقاط ذخيرة مسدس إضافية", { item: "pistol_ammo", qty: 16 }, 1.05);

    addDoorAt(ctx, "door_gunshop", cx, cz - 7, "x", 2.0, "wood");
    ctx.buildings.push({ x: cx, z: cz, w: 16, d: 14, name: "متجر الأسلحة", poi: true });
    ctx.spawns.push({ kind: "runner", x: cx + 2, z: cz + 2, wander: 3 });
    ctx.triggers.push({ id: "trig_gunshop", x: cx, z: cz, radius: 9, once: true });
  }

  // ── 3) مركز الشرطة (23,-23) — شرق الساحة الرئيسية — مقر أمني من طابقين ──
  {
    const cx = 23, cz = -23;
    const w2 = propCtxOf(ctx, 4.2);
    roomFloor(ctx, cx, cz, 22, 18);
    w.push("tile", new THREE.BoxGeometry(21.6, 0.04, 17.6), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, 22, 18, "roof", 8.4);
    buildingExteriorTrim(w, cx, cz, 22, 18, 8.4, "concrete");
    entrancePorch(w, cx - 11, cz - 3, 4.4, 2.4, 3.8, "W", "concrete");

    // الجدران الخارجية للطابق الأرضي مع نوافذ محصنة وباب المدخل الغربي
    wallWithGaps(ctx, "concrete", cx - 11, cz - 9, cx + 11, cz - 9, [
      { at: 5.5, width: 2.0, sill: 1.15, top: 3.0 },
      { at: 16.5, width: 2.0, sill: 1.15, top: 3.0 },
    ]);
    realisticWindow(w, cx - 5.5, 1.15, cz - 9, 2.0, 1.85, "x", "metal");
    realisticWindow(w, cx + 5.5, 1.15, cz - 9, 2.0, 1.85, "x", "metal");

    wallWithGaps(ctx, "concrete", cx - 11, cz + 9, cx + 11, cz + 9, [
      { at: 6, width: 2.0, sill: 1.15, top: 3.0 },
      { at: 16, width: 2.0, sill: 1.15, top: 3.0 },
    ]);
    realisticWindow(w, cx - 5, 1.15, cz + 9, 2.0, 1.85, "x", "metal");
    realisticWindow(w, cx + 5, 1.15, cz + 9, 2.0, 1.85, "x", "metal");

    wallWithGaps(ctx, "concrete", cx - 11, cz - 9, cx - 11, cz + 9, [
      { at: 6, width: 2.0 },
      { at: 13.5, width: 2.0, sill: 1.15, top: 3.0 },
    ]);
    realisticDoorFrame(w, cx - 11, 0, cz - 3, 2.0, 2.5, "z", "metal");
    realisticWindow(w, cx - 11, 1.15, cz + 4.5, 2.0, 1.85, "z", "metal");
    const polSign = shopSign(cx - 11.35, 4.5, cz - 3, -Math.PI / 2, "مركز شرطة شادو هافن — POLICE");
    polSign.userData.noHit = true;
    scene.add(polSign);

    wallWithGaps(ctx, "concrete", cx + 11, cz - 9, cx + 11, cz + 9, [
      { at: 9, width: 2.0, sill: 1.15, top: 3.0 },
    ]);
    realisticWindow(w, cx + 11, 1.15, cz, 2.0, 1.85, "z", "metal");

    // الطابق الأرضي: الردهة والاستقبال + الترسانة + الزنازين
    counter(w, cx - 6, cz - 1.5, 0, 3.2);
    officeChair(w, cx - 6, cz + 0.2, 0);
    bench(w, cx - 8.5, cz - 6.5, 0);
    bench(w, cx - 4.5, cz - 6.5, 0);
    elevatorDoors(w, cx, 0, cz - 8.65, "x");

    // غرفة الأدلة والترسانة (Evidence & Armory — جنوب غرب الأرضي)
    wallWithGaps(ctx, "metal", cx - 11, cz + 2, cx - 2, cz + 2);
    wallWithGaps(ctx, "metal", cx - 2, cz + 2, cx - 2, cz + 9, [{ at: 3.5, width: 1.5 }]);
    realisticDoorFrame(w, cx - 2, 0, cz + 5.5, 1.5, 2.45, "z", "metal");
    lockerRow(w, cx - 7.5, cz + 7.8, 0, 4);
    shelfStocked(w, cx - 9.8, cz + 4.8, Math.PI / 2, 2.4, true);
    gunRack(w, cx - 5.5, cz + 2.35, 0);

    // زنزانة الحجز الاحتياطي (Holding Cell — جنوب شرق الأرضي)
    for (let bx2 = cx + 2.5; bx2 <= cx + 9.8; bx2 += 0.3) {
      w.push("chrome", new THREE.CylinderGeometry(0.035, 0.035, 3.8, 6), mat4(bx2, 1.9, cz + 2.8));
    }
    w.push("chrome", new THREE.CylinderGeometry(0.04, 0.04, 7.4, 6), mat4(cx + 6.1, 1.9, cz + 2.8, { rx: Math.PI / 2 }));
    addBox(ctx, "metal", cx + 7.5, 0, cz + 7.5, 2.0, 0.5, 1.0);
    addBox(ctx, "metal", cx + 7.5, 1.6, cz + 7.5, 2.0, 0.1, 1.0, false);
    toiletBowl(w, cx + 3.5, cz + 7.8, Math.PI);
    ctx.colliders.push({ minX: cx + 2.3, maxX: cx + 10.5, minZ: cz + 2.5, maxZ: cz + 3.0, minY: 0, maxY: 4.0 });

    // لوحة البلاغات
    w.push("cork", new THREE.PlaneGeometry(2.4, 1.5), mat4(cx - 10.7, 2.1, cz + 0.5, { ry: Math.PI / 2 }));
    for (let i = 0; i < 6; i++) {
      w.push("paper", new THREE.BoxGeometry(0.02, 0.32, 0.24), mat4(cx - 10.62, 1.8 + (i % 2) * 0.55, cz - 0.5 + i * 0.34, { ry: (seededRandom(i + 1)() - 0.5) * 0.2 }));
    }

    // درج مركز الشرطة الصاعد إلى الطابق الثاني (يتسلق باتجاه -z من cz+1.7 إلى cz-4.7)
    addWalkableStairs(ctx, cx + 8.6, 0, cz - 1.5, 2.4, 4.2, 6.4, "-z");

    // ──────────────── الطابق الثاني لمركز الشرطة: مكاتب المحققين وغرفة العمليات (y = 4.2..8.4) ────────────────
    floorSlabWithHole(ctx, cx, cz, 22, 18, 4.2, cx + 7.2, cx + 10.0, cz - 4.8, cz + 1.8, "tile");
    railingSection(w2, cx + 7.2, cz - 4.8, cx + 7.2, cz + 1.8, "chrome");
    railingSection(w2, cx + 7.2, cz + 1.8, cx + 10.0, cz + 1.8, "chrome");

    wallWithGaps(ctx, "concrete", cx - 11, cz - 9, cx + 11, cz - 9, [
      { at: 5.5, width: 2.0, sill: 1.15, top: 3.0 },
      { at: 16.5, width: 2.0, sill: 1.15, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 5.5, 1.15, cz - 9, 2.0, 1.85, "x", "metal");
    realisticWindow(w2, cx + 5.5, 1.15, cz - 9, 2.0, 1.85, "x", "metal");

    wallWithGaps(ctx, "concrete", cx - 11, cz + 9, cx + 11, cz + 9, [
      { at: 6, width: 2.0, sill: 1.15, top: 3.0 },
      { at: 16, width: 2.0, sill: 1.15, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 5, 1.15, cz + 9, 2.0, 1.85, "x", "metal");
    realisticWindow(w2, cx + 5, 1.15, cz + 9, 2.0, 1.85, "x", "metal");

    wallWithGaps(ctx, "concrete", cx - 11, cz - 9, cx - 11, cz + 9, [
      { at: 5, width: 2.0, sill: 1.15, top: 3.0 },
      { at: 13, width: 2.0, sill: 1.15, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 11, 1.15, cz - 4, 2.0, 1.85, "z", "metal");
    realisticWindow(w2, cx - 11, 1.15, cz + 4, 2.0, 1.85, "z", "metal");
    wallWithGaps(ctx, "concrete", cx + 11, cz - 9, cx + 11, cz + 9, [], 4.2);

    // قاعة التحقيقات المفتوحة في الطابق الثاني (Detective Bullpen)
    desk(w2, cx + 2.0, cz + 3.5, 0, true);
    officeChair(w2, cx + 2.0, cz + 2.2, Math.PI);
    desk(w2, cx - 2.5, cz + 3.5, 0, true);
    officeChair(w2, cx - 2.5, cz + 2.2, Math.PI);
    cabinet(w2, cx + 5.5, cz + 7.8, Math.PI, "metal");
    cabinet(w2, cx + 3.8, cz + 7.8, Math.PI, "metal");
    wallPicture(w2, cx, 1.7, cz + 8.65, 2.4, 1.3, "x", "map");

    // مكتب قائد المركز والعمليات في الطابق الثاني (Chief's Command Office)
    wallWithGaps(ctx, "concrete", cx - 1.5, cz - 9, cx - 1.5, cz - 0.5, [{ at: 4.5, width: 1.6 }], 4.2);
    realisticDoorFrame(w2, cx - 1.5, 0, cz - 4.5, 1.6, 2.45, "z", "wood");
    wallWithGaps(ctx, "concrete", cx - 11, cz - 0.5, cx - 1.5, cz - 0.5, [], 4.2);
    w2.push("woodFloor", new THREE.BoxGeometry(9.1, 0.045, 8.1), mat4(cx - 6.2, 0.03, cz - 4.7));
    desk(w2, cx - 6.0, cz - 5.5, Math.PI, true);
    officeChair(w2, cx - 6.0, cz - 4.2, 0);
    bookshelfFull(w2, cx - 9.8, cz - 4.5, Math.PI / 2, 2.6, 303);
    cabinet(w2, cx - 3.2, cz - 7.8, 0, "wood2");
    sofa(w2, cx - 6.2, cz - 1.8, 0, 2.0);

    bloodDecal(ctx, cx - 2, cz - 1, 2.6, 0);
    coveredBody(w, cx - 4, cz - 3, 1.1);
    bodyBag(w, cx + 5, cz + 6.5, 0.5);
    emergencyLight(ctx, cx - 2, 3.6, cz - 4, 0xc22a1e);
    fluoro(ctx, cx - 5, cz - 3, 0xd0a860, 1.1, 13, 13, 0);
    fluoro(ctx, cx + 4, cz - 3, 0xd0a860, 1.0, 12, 11, 0);
    fluoro(ctx, cx - 6, cz - 4.5, 0xd0a860, 1.1, 12, 9, 4.2);
    fluoro(ctx, cx + 1, cz + 3.5, 0xd8e8d0, 1.0, 12, 10, 4.2);

    // الالتقاطات (الوثيقة 4 ومفتاح البرج في مكتب القائد بالطابق الثاني، ومفتاح الخزانة والترسانة بالأرضي)
    noteProp(ctx, "pol_doc", "doc_4", cx - 6.0, cz - 5.5, 4.2 + 0.82);
    pickupProp(ctx, "pol_key", "item", cx - 5.2, cz - 5.3, "التقاط مفتاح برج الإذاعة", { item: "key_tower", qty: 1 }, 4.2 + 0.92);
    pickupProp(ctx, "pol_ammo", "item", cx - 7.0, cz - 5.5, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 24 }, 4.2 + 0.92);
    pickupProp(ctx, "pol_med", "item", cx - 9.6, cz + 4.8, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.95);
    pickupProp(ctx, "pol_stick", "item", cx - 7.5, cz - 5.5, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "pol_shells", "item", cx - 4.5, cz + 7.5, "التقاط خرطوش", { item: "shotgun_ammo", qty: 6 }, 0.14);
    pickupProp(ctx, "pol_lockerkey", "item", cx - 6.0, cz - 1.5, "التقاط مفتاح خزانة الأسلحة", { item: "key_locker", qty: 1 }, 1.22);
    ctx.interactables.push({ id: "pol_locker", kind: "item", x: cx - 7.5, z: cz + 7.0, y: 1.0, radius: 2, prompt: "خزانة الأسلحة — تحتاج مفتاح الترسانة", data: { locker: true }, used: false });

    // الأبواب
    addDoorAt(ctx, "door_police", cx - 11, cz - 3, "z", 2.0, "metal", 0);
    addDoorAt(ctx, "door_police_evidence", cx - 2, cz + 5.5, "z", 1.5, "metal", 0);
    addDoorAt(ctx, "door_police_chief", cx - 1.5, cz - 4.5, "z", 1.6, "wood", 4.2);
    ctx.buildings.push({ x: cx, z: cz, w: 22, d: 18, name: "مركز الشرطة", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 6, z: cz, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx + 3, z: cz - 5, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx + 14, z: cz + 12, wander: 8 });
    ctx.triggers.push({ id: "trig_police", x: cx, z: cz, radius: 12, once: true });
  }

  // ── 4) برج الإذاعة (6) — الركن الشمالي الشرقي (69,-69) — محطة بث من طابقين ──
  {
    const cx = 69, cz = -69;
    const w2 = propCtxOf(ctx, 4.2);
    roomFloor(ctx, cx, cz, 16, 14);
    w.push("tile", new THREE.BoxGeometry(15.6, 0.04, 13.6), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, 16, 14, "roof", 8.4);
    buildingExteriorTrim(w, cx, cz, 16, 14, 8.4, "concrete");
    entrancePorch(w, cx - 3, cz - 7, 3.8, 2.0, 3.6, "N", "concrete");

    // الطابق الأرضي: قاعة المرسلات والخوادم
    wallWithGaps(ctx, "metal", cx - 8, cz - 7, cx + 8, cz - 7, [
      { at: 5, width: 1.8 },
      { at: 12, width: 2.0, sill: 1.2, top: 3.0 },
    ]);
    realisticDoorFrame(w, cx - 3, 0, cz - 7, 1.8, 2.5, "x", "metal");
    realisticWindow(w, cx + 4, 1.2, cz - 7, 2.0, 1.8, "x", "metal");

    wallWithGaps(ctx, "metal", cx - 8, cz + 7, cx + 8, cz + 7);
    wallWithGaps(ctx, "metal", cx - 8, cz - 7, cx - 8, cz + 7);
    wallWithGaps(ctx, "metal", cx + 8, cz - 7, cx + 8, cz + 7, [{ at: 7, width: 2.0, sill: 1.2, top: 3.0 }]);
    realisticWindow(w, cx + 8, 1.2, cz, 2.0, 1.8, "z", "metal");

    // البرج الرئيسي الضخم خلف المبنى
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.8, 34, 6, 1, true), mats.metal);
    tower.position.set(cx, 17, cz + 10);
    scene.add(tower);
    tower.userData.noHit = true;
    ctx.colliders.push({ minX: cx - 1.6, maxX: cx + 1.6, minZ: cz + 8.4, maxZ: cz + 11.6, minY: 0, maxY: 34 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mats.redLight);
    beacon.position.set(cx, 34.4, cz + 10);
    beacon.userData.noHit = true;
    scene.add(beacon);
    addFlickerLight(ctx, cx, 34, cz + 10, 0xc22a1e, 2, 20, 0.7);

    // خوادم الطابق الأرضي + درج الصعود لاستوديو البث في الطابق الثاني
    serverRack(w, cx + 6.2, cz - 3.5, -Math.PI / 2);
    serverRack(w, cx + 6.2, cz - 0.5, -Math.PI / 2);
    serverRack(w, cx + 6.2, cz + 2.5, -Math.PI / 2);
    controlPanel(w, cx + 1.5, cz + 5.5, Math.PI);
    wallPipes(w, cx, 3.4, cz + 6.6, 0, 8);

    // درج محطة الإذاعة إلى الطابق الثاني (يتسلق باتجاه +z من cz-3.2 إلى cz+2.8)
    addWalkableStairs(ctx, cx - 5.4, 0, cz - 0.2, 2.2, 4.2, 6.0, "+z");

    // ──────────────── الطابق الثاني لمحطة الإذاعة: استوديو البث العالي (y = 4.2..8.4) ────────────────
    floorSlabWithHole(ctx, cx, cz, 16, 14, 4.2, cx - 6.6, cx - 4.2, cz - 3.3, cz + 2.9, "tile");
    railingSection(w2, cx - 4.2, cz - 3.3, cx - 4.2, cz + 2.9, "chrome");
    railingSection(w2, cx - 6.6, cz - 3.3, cx - 4.2, cz - 3.3, "chrome");

    wallWithGaps(ctx, "metal", cx - 8, cz - 7, cx + 8, cz - 7, [
      { at: 4.5, width: 2.4, sill: 1.0, top: 3.0 },
      { at: 11.5, width: 2.4, sill: 1.0, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 3.5, 1.0, cz - 7, 2.4, 2.0, "x", "metal");
    realisticWindow(w2, cx + 3.5, 1.0, cz - 7, 2.4, 2.0, "x", "metal");
    wallWithGaps(ctx, "metal", cx - 8, cz + 7, cx + 8, cz + 7, [], 4.2);
    wallWithGaps(ctx, "metal", cx - 8, cz - 7, cx - 8, cz + 7, [{ at: 7, width: 2.2, sill: 1.0, top: 3.0 }], 4.2);
    realisticWindow(w2, cx - 8, 1.0, cz, 2.2, 2.0, "z", "metal");
    wallWithGaps(ctx, "metal", cx + 8, cz - 7, cx + 8, cz + 7, [{ at: 7, width: 2.2, sill: 1.0, top: 3.0 }], 4.2);
    realisticWindow(w2, cx + 8, 1.0, cz, 2.2, 2.0, "z", "metal");

    // تجهيزات استوديو البث في الطابق الثاني
    desk(w2, cx - 0.5, cz - 3.8, 0, true);
    officeChair(w2, cx - 0.5, cz - 2.5, Math.PI);
    controlPanel(w2, cx + 3.5, cz - 3.8, 0);
    counter(w2, cx + 5.8, cz + 2.5, -Math.PI / 2, 3.0);
    serverRack(w2, cx + 6.2, cz - 2.5, -Math.PI / 2);

    // كونسول البث الرئيسي في الطابق الثاني
    addBox(ctx, "metal", cx + 2.5, 4.2, cz - 1.2, 2.0, 1.15, 0.9);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.7), mats.greenLight);
    screen.position.set(cx + 2.5, 4.2 + 1.55, cz - 0.73);
    screen.userData.noHit = true;
    scene.add(screen);
    ctx.interactables.push({
      id: "tower_console",
      kind: "console",
      x: cx + 2.5,
      z: cz - 0.5,
      y: 5.2,
      radius: 2.2,
      prompt: "البث — نداء استغاثة",
      used: false,
    });
    fluoro(ctx, cx + 1, cz, 0xd0a860, 1.0, 12, 6, 0);
    fluoro(ctx, cx + 1, cz - 1, 0x6ac070, 1.15, 13, 5, 4.2);
    pickupProp(ctx, "tower_stick", "item", cx - 2.5, cz + 4.2, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);

    addDoorAt(ctx, "door_tower", cx - 3, cz - 7, "x", 1.8, "metal", 0);
    ctx.buildings.push({ x: cx, z: cz, w: 16, d: 14, name: "برج الإذاعة", poi: true });
    ctx.spawns.push({ kind: "runner", x: cx + 2, z: cz + 2, wander: 4 });
    ctx.spawns.push({ kind: "walker", x: cx - 10, z: cz + 10, wander: 8 });
    ctx.triggers.push({ id: "trig_tower", x: cx, z: cz, radius: 10, once: true });
  }

  // ── 5) المستشفى المركزي (8) — الجنوب الشرقي (69,23) — مجمع طبي ضخم من 3 طوابق حقيقية ──
  {
    const cx = 69, cz = 23;
    const HW = 32, HD = 26;
    const w2 = propCtxOf(ctx, 4.2);
    const w3 = propCtxOf(ctx, 8.4);

    roomFloor(ctx, cx, cz, HW, HD);
    w.push("tile", new THREE.BoxGeometry(HW - 0.4, 0.04, HD - 0.4), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, HW, HD, "roof", 12.6);
    buildingExteriorTrim(w, cx, cz, HW, HD, 12.6, "hospital");

    // لافتة المستشفى الكبرى المضيئة مع الصليب الطبي ومظلة الإسعاف
    const hospSign = shopSign(cx, 11.4, cz - HD / 2 - 0.25, 0, "مستشفى شادو هافن المركزي — GENERAL HOSPITAL");
    hospSign.userData.noHit = true;
    scene.add(hospSign);
    w.push("medRed", new THREE.BoxGeometry(0.5, 1.8, 0.1), mat4(cx, 9.8, cz - HD / 2 - 0.18));
    w.push("medRed", new THREE.BoxGeometry(1.8, 0.5, 0.1), mat4(cx, 9.8, cz - HD / 2 - 0.18));
    entrancePorch(w, cx, cz - HD / 2, 8.4, 4.2, 4.0, "N", "concrete");

    // ──────────────── الطابق الأرضي (y = 0..4.2): الاستقبال، الطوارئ ER، الصيدلية، والغسيل ────────────────
    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - HD / 2, cx + HW / 2, cz - HD / 2, [
      { at: 6, width: 2.2, sill: 1.2, top: 3.0 },
      { at: HW / 2, width: 2.6 },
      { at: HW - 6, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticDoorFrame(w, cx, 0, cz - HD / 2, 2.6, 2.6, "x", "metal");
    realisticWindow(w, cx - 10, 1.2, cz - HD / 2, 2.2, 1.8, "x", "hospital");
    realisticWindow(w, cx + 10, 1.2, cz - HD / 2, 2.2, 1.8, "x", "hospital");

    wallWithGaps(ctx, "concrete", cx - HW / 2, cz + HD / 2, cx + HW / 2, cz + HD / 2, [
      { at: 6, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 16, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 26, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticWindow(w, cx - 10, 1.2, cz + HD / 2, 2.2, 1.8, "x", "hospital");
    realisticWindow(w, cx, 1.2, cz + HD / 2, 2.2, 1.8, "x", "hospital");
    realisticWindow(w, cx + 10, 1.2, cz + HD / 2, 2.2, 1.8, "x", "hospital");

    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - HD / 2, cx - HW / 2, cz + HD / 2, [
      { at: 6, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 13, width: 2.0 },
      { at: 20, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticWindow(w, cx - HW / 2, 1.2, cz - 7, 2.2, 1.8, "z", "hospital");
    realisticDoorFrame(w, cx - HW / 2, 0, cz, 2.0, 2.5, "z", "metal");
    realisticWindow(w, cx - HW / 2, 1.2, cz + 7, 2.2, 1.8, "z", "hospital");

    wallWithGaps(ctx, "concrete", cx + HW / 2, cz - HD / 2, cx + HW / 2, cz + HD / 2, [
      { at: 7, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 19, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticWindow(w, cx + HW / 2, 1.2, cz - 6, 2.2, 1.8, "z", "hospital");
    realisticWindow(w, cx + HW / 2, 1.2, cz + 6, 2.2, 1.8, "z", "hospital");

    // ردهة الاستقبال الرئيسية (Grand Triage Atrium) + المصعد
    counter(w, cx, cz - 6.5, 0, 3.8);
    officeChair(w, cx - 0.8, cz - 5.2, Math.PI);
    officeChair(w, cx + 0.8, cz - 5.2, Math.PI);
    bench(w, cx - 9.5, cz - 9.5, 0);
    bench(w, cx - 5.5, cz - 9.5, 0);
    bench(w, cx + 5.5, cz - 9.5, 0);
    bench(w, cx + 9.5, cz - 9.5, 0);
    elevatorDoors(w, cx - 3.8, 0, cz + 12.6, "x");
    wallPicture(w, cx - 3.8, 1.8, cz - 12.6, 2.2, 1.2, "x", "medical");

    for (const sx of [-7.5, -6.2]) {
      w.push("rubber", new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), mat4(cx + sx, 0.32, cz - 8.5, { rz: Math.PI / 2 }));
      w.push("rubber", new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), mat4(cx + sx + 0.6, 0.32, cz - 8.5, { rz: Math.PI / 2 }));
      w.push("chrome", new THREE.BoxGeometry(0.65, 0.05, 0.58), mat4(cx + sx + 0.3, 0.58, cz - 8.5));
      w.push("fabric", new THREE.BoxGeometry(0.6, 0.65, 0.05), mat4(cx + sx + 0.3, 0.9, cz - 8.78, { rx: -0.15 }));
    }

    // قواطع الجناح الغربي الأرضي (جناح الطوارئ والإسعاف - ER)
    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - 1, cx - 4, cz - 1, [{ at: 6, width: 1.8 }]);
    realisticDoorFrame(w, cx - 10, 0, cz - 1, 1.8, 2.5, "x", "hospital");
    wallWithGaps(ctx, "concrete", cx - 4, cz - 1, cx - 4, cz + HD / 2, [{ at: 6, width: 1.8 }]);
    for (let i = 0; i < 3; i++) {
      gurney(w, cx - 13 + i * 3.0, cz + 6.5, 0, i === 1);
      ivStand(w, cx - 14.1 + i * 3.0, cz + 6.5);
    }
    defibrillatorCart(w, cx - 5.5, cz + 3.5, -Math.PI / 2);
    shelfStocked(w, cx - 14.8, cz + 2.5, Math.PI / 2, 2.6, true);
    sinkVanity(w, cx - 14.8, cz + 10.5, Math.PI / 2);

    // قواطع الجناح الشمالي الشرقي الأرضي (الصيدلية والعيادات)
    wallWithGaps(ctx, "concrete", cx + 4, cz - 1, cx + HW / 2, cz - 1, [{ at: 6, width: 1.8 }]);
    realisticDoorFrame(w, cx + 10, 0, cz - 1, 1.8, 2.5, "x", "hospital");
    shelfStocked(w, cx + 11.5, cz - 7.5, 0, 4.2, true);
    desk(w, cx + 12.5, cz - 4.5, Math.PI / 2, true);
    cabinet(w, cx + 14.8, cz - 10, 0, "medWhite");
    cabinet(w, cx + 14.8, cz - 7.5, 0, "medWhite");

    // الجناح الجنوبي الشرقي الأرضي: الغسيل والخدمات (حيث توجد سارة)
    wallWithGaps(ctx, "concrete", cx + 5, cz + 3, cx + HW / 2, cz + 3, [{ at: 4, width: 1.8 }]);
    realisticDoorFrame(w, cx + 9, 0, cz + 3, 1.8, 2.5, "x", "metal");
    wallWithGaps(ctx, "concrete", cx + 5, cz + 3, cx + 5, cz + HD / 2);
    machineProp(ctx, cx + 8.5, cz + 9.5, 2.0, 2.2, 1.8);
    machineProp(ctx, cx + 12.0, cz + 9.5, 2.0, 2.2, 1.8);
    counter(w, cx + 14.5, cz + 5.5, Math.PI / 2, 2.4);

    // الدرج المركزي الأول: من الطابق الأرضي (0) إلى الطابق الثاني (4.2)
    // يمتد من cz+1.0 إلى cz+8.0 وعرضه من cx-2.3 إلى cx+0.7
    addWalkableStairs(ctx, cx - 0.8, 0, cz + 4.5, 2.8, 4.2, 7.0, "+z");

    // ──────────────── الطابق الثاني (y = 4.2..8.4): العمليات الجراحية، العناية المشددة، ومكتب الأبحاث ────────────────
    // بلاطة الطابق الثاني مع فتحة بهو الدرج المزدوج (من cx-2.3 إلى cx+3.7 ومن cz+0.9 إلى cz+8.1)
    floorSlabWithHole(ctx, cx, cz, HW, HD, 4.2, cx - 2.3, cx + 3.7, cz + 0.9, cz + 8.1, "tile");
    railingSection(w2, cx - 2.3, cz + 0.9, cx - 2.3, cz + 8.1, "chrome");
    railingSection(w2, cx - 2.3, cz + 0.9, cx + 0.7, cz + 0.9, "chrome");
    railingSection(w2, cx + 3.7, cz + 0.9, cx + 3.7, cz + 8.1, "chrome");
    elevatorDoors(w2, cx - 3.8, 0, cz + 12.6, "x");

    // الجدران الخارجية للطابق الثاني مع نوافذ زجاجية
    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - HD / 2, cx + HW / 2, cz - HD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 16, width: 2.6, sill: 1.1, top: 3.0 },
      { at: 26, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 10, 1.1, cz - HD / 2, 2.2, 1.9, "x", "hospital");
    realisticWindow(w2, cx, 1.1, cz - HD / 2, 2.6, 1.9, "x", "hospital");
    realisticWindow(w2, cx + 10, 1.1, cz - HD / 2, 2.2, 1.9, "x", "hospital");

    wallWithGaps(ctx, "concrete", cx - HW / 2, cz + HD / 2, cx + HW / 2, cz + HD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 16, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 26, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 10, 1.1, cz + HD / 2, 2.2, 1.9, "x", "hospital");
    realisticWindow(w2, cx, 1.1, cz + HD / 2, 2.2, 1.9, "x", "hospital");
    realisticWindow(w2, cx + 10, 1.1, cz + HD / 2, 2.2, 1.9, "x", "hospital");

    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - HD / 2, cx - HW / 2, cz + HD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 20, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - HW / 2, 1.1, cz - 7, 2.2, 1.9, "z", "hospital");
    realisticWindow(w2, cx - HW / 2, 1.1, cz + 7, 2.2, 1.9, "z", "hospital");

    wallWithGaps(ctx, "concrete", cx + HW / 2, cz - HD / 2, cx + HW / 2, cz + HD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 20, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx + HW / 2, 1.1, cz - 7, 2.2, 1.9, "z", "hospital");
    realisticWindow(w2, cx + HW / 2, 1.1, cz + 7, 2.2, 1.9, "z", "hospital");

    // 1. جناح العمليات الجراحية في الطابق الثاني (شمال شرق)
    wallWithGaps(ctx, "concrete", cx + 4, cz - 1, cx + HW / 2, cz - 1, [{ at: 5, width: 1.8 }], 4.2);
    realisticDoorFrame(w2, cx + 9, 0, cz - 1, 1.8, 2.5, "x", "hospital");
    wallWithGaps(ctx, "concrete", cx + 4, cz - HD / 2, cx + 4, cz - 1, [], 4.2);
    operatingTable(w2, cx + 10.0, cz - 6.5, Math.PI / 2);
    surgicalLamps(w2, cx + 10.0, 3.9, cz - 6.5);
    anesthesiaMachine(w2, cx + 7.2, cz - 6.5, 0);
    xrayLightbox(w2, cx + 10.0, 2.0, cz - 12.6, 0);
    counter(w2, cx + 14.4, cz - 6.5, -Math.PI / 2, 3.2);
    defibrillatorCart(w2, cx + 6.2, cz - 10.2, 0);

    // 2. جناح العناية والتنويم ICU في الطابق الثاني (شمال غرب)
    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - 1, cx - 4, cz - 1, [{ at: 6, width: 1.8 }], 4.2);
    realisticDoorFrame(w2, cx - 10, 0, cz - 1, 1.8, 2.5, "x", "hospital");
    wallWithGaps(ctx, "concrete", cx - 4, cz - HD / 2, cx - 4, cz - 1, [], 4.2);
    curtainedWardBed(w2, cx - 12.0, cz - 8.5, 0);
    curtainedWardBed(w2, cx - 7.5, cz - 8.5, 0);
    ivStand(w2, cx - 13.4, cz - 8.5);
    ivStand(w2, cx - 8.9, cz - 8.5);
    sinkVanity(w2, cx - 14.8, cz - 3.5, Math.PI / 2);

    // 3. مكتب مديرة الأبحاث د. ليلى حسن في الطابق الثاني (جنوب غرب - البطاقة الزرقاء)
    wallWithGaps(ctx, "concrete", cx - HW / 2, cz + 3.5, cx - 4, cz + 3.5, [{ at: 6, width: 1.6 }], 4.2);
    realisticDoorFrame(w2, cx - 10, 0, cz + 3.5, 1.6, 2.5, "x", "wood");
    wallWithGaps(ctx, "concrete", cx - 4, cz + 3.5, cx - 4, cz + HD / 2, [], 4.2);
    w2.push("woodFloor", new THREE.BoxGeometry(11.4, 0.045, 8.8), mat4(cx - 10, 0.03, cz + 8.2));
    desk(w2, cx - 9.5, cz + 9.5, Math.PI, true);
    officeChair(w2, cx - 9.5, cz + 8.2, 0);
    microscope(w2, cx - 8.2, 0.85, cz + 9.5);
    bookshelfFull(w2, cx - 14.6, cz + 8.5, Math.PI / 2, 3.2, 404);
    cabinet(w2, cx - 12.8, cz + 11.8, Math.PI, "wood2");
    sofa(w2, cx - 6.5, cz + 8.2, -Math.PI / 2, 2.1);

    // الدرج المركزي الثاني: من الطابق الثاني (4.2) إلى الطابق الثالث (8.4)
    // يمتد من cz+8.0 نزولاً بالاتجاه -z إلى cz+1.0 وعرضه من cx+0.9 إلى cx+3.5
    addWalkableStairs(ctx, cx + 2.2, 4.2, cz + 4.5, 2.6, 4.2, 7.0, "-z");

    // ──────────────── الطابق الثالث (y = 8.4..12.6): مختبر الفيروسات والحجر البيولوجي العالي ────────────────
    floorSlabWithHole(ctx, cx, cz, HW, HD, 8.4, cx + 0.8, cx + 3.7, cz + 0.9, cz + 8.1, "tile");
    railingSection(w3, cx + 0.8, cz + 0.9, cx + 0.8, cz + 8.1, "chrome");
    railingSection(w3, cx + 3.7, cz + 0.9, cx + 3.7, cz + 8.1, "chrome");
    railingSection(w3, cx + 0.8, cz + 8.1, cx + 3.7, cz + 8.1, "chrome");
    elevatorDoors(w3, cx - 3.8, 0, cz + 12.6, "x");

    // الجدران الخارجية للطابق الثالث مع نوافذ بانورامية
    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - HD / 2, cx + HW / 2, cz - HD / 2, [
      { at: 7, width: 2.4, sill: 1.1, top: 3.0 },
      { at: 16, width: 2.6, sill: 1.1, top: 3.0 },
      { at: 25, width: 2.4, sill: 1.1, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx - 9, 1.1, cz - HD / 2, 2.4, 1.9, "x", "hospital");
    realisticWindow(w3, cx, 1.1, cz - HD / 2, 2.6, 1.9, "x", "hospital");
    realisticWindow(w3, cx + 9, 1.1, cz - HD / 2, 2.4, 1.9, "x", "hospital");

    wallWithGaps(ctx, "concrete", cx - HW / 2, cz + HD / 2, cx + HW / 2, cz + HD / 2, [
      { at: 8, width: 2.4, sill: 1.1, top: 3.0 },
      { at: 24, width: 2.4, sill: 1.1, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx - 8, 1.1, cz + HD / 2, 2.4, 1.9, "x", "hospital");
    realisticWindow(w3, cx + 8, 1.1, cz + HD / 2, 2.4, 1.9, "x", "hospital");

    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - HD / 2, cx - HW / 2, cz + HD / 2, [
      { at: 13, width: 2.4, sill: 1.1, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx - HW / 2, 1.1, cz, 2.4, 1.9, "z", "hospital");

    wallWithGaps(ctx, "concrete", cx + HW / 2, cz - HD / 2, cx + HW / 2, cz + HD / 2, [
      { at: 13, width: 2.4, sill: 1.1, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx + HW / 2, 1.1, cz, 2.4, 1.9, "z", "hospital");

    // قاعة الحجر البيولوجي وأبحاث السلالات في الطابق الثالث
    wallWithGaps(ctx, "concrete", cx - HW / 2, cz - 1.5, cx + HW / 2, cz - 1.5, [{ at: 16, width: 2.0 }], 8.4);
    realisticDoorFrame(w3, cx, 0, cz - 1.5, 2.0, 2.5, "x", "metal");
    bioIncubator(w3, cx - 10.5, cz - 8.5);
    bioIncubator(w3, cx - 6.5, cz - 8.5);
    bioIncubator(w3, cx + 6.5, cz - 8.5);
    bioIncubator(w3, cx + 10.5, cz - 8.5);
    serverRack(w3, cx + 14.2, cz - 9.0, -Math.PI / 2);
    serverRack(w3, cx + 14.2, cz - 6.0, -Math.PI / 2);
    controlPanel(w3, cx, cz - 10.5, 0);
    desk(w3, cx - 9.5, cz + 6.5, 0, true);
    microscope(w3, cx - 8.5, 0.85, cz + 6.5);
    gurney(w3, cx + 9.5, cz + 6.5, 0.2, true);

    // دماء وآثار صراع
    for (let i = 0; i < 6; i++) {
      bloodDecal(ctx, cx - 13 + rnd() * 26, cz - 11 + rnd() * 22, 2.2 + rnd() * 1.8, 0);
    }
    bloodDecal(ctx, cx + 9.5, cz - 6.5, 2.4, 4.2);
    bloodDecal(ctx, cx - 8.5, cz + 7.5, 2.2, 4.2);
    bloodDecal(ctx, cx, cz - 6.5, 2.5, 8.4);
    bloodTrail(ctx, cx - 2, cz - 12, cx - 8, cz - 3);
    bloodTrail(ctx, cx + 1, cz + 3, cx + 11, cz + 9);
    corpse(ctx, cx + 3, cz - 6);
    coveredBody(w, cx + 13.5, cz + 1.5, 0.4);
    bodyBag(w2, cx - 11.5, cz - 4.5, 0.15);

    // إضاءة طبية سينمائية عبر الطوابق الثلاثة
    emergencyLight(ctx, cx, 3.8, cz - 2, 0xc22a1e);
    emergencyLight(ctx, cx - 9, 4.2 + 3.8, cz + 6, 0xd0a860);
    emergencyLight(ctx, cx, 8.4 + 3.8, cz - 5, 0x2fae4e);
    fluoro(ctx, cx, cz - 6.5, 0xd8e8d0, 1.1, 14, 10, 0);
    fluoro(ctx, cx + 10.0, cz - 6.5, 0xe0f0ff, 1.35, 14, 18, 4.2);
    fluoro(ctx, cx - 9.5, cz + 8.5, 0xd0a860, 1.1, 12, 12, 4.2);
    fluoro(ctx, cx, cz - 7.5, 0x70e090, 1.2, 14, 15, 8.4);

    // الالتقاطات والوثائق موزعة بواقعية عبر الطوابق الثلاثة
    noteProp(ctx, "hos_doc3", "doc_3", cx + 12.5, cz - 4.5, 0.82); // الطابق الأرضي: العيادة
    noteProp(ctx, "hos_doc5", "doc_5", cx + 14.4, cz - 6.5, 4.2 + 0.92); // الطابق الثاني: جناح العمليات
    pickupProp(ctx, "hos_blue", "item", cx - 9.5, cz + 9.5, "التقاط بطاقة وصول زرقاء", { item: "keycard_blue", qty: 1 }, 4.2 + 0.92); // الطابق الثاني: مكتب د. ليلى
    pickupProp(ctx, "hos_med1", "item", cx - 14.8, cz + 2.5, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.95);
    pickupProp(ctx, "hos_stick1", "item", cx - 6.5, cz - 6.5, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "hos_stick2", "item", cx + 2.0, cz - 4.5, "التقاط عصا خشبية", { weapon: "crowbar" }, 4.2 + 0.12);
    pickupProp(ctx, "hos_med2", "item", cx + 11.5, cz - 7.5, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.95);
    pickupProp(ctx, "hos_bat", "item", cx + 14.5, cz + 5.5, "التقاط بطارية", { item: "battery", qty: 1 }, 0.95);
    pickupProp(ctx, "hos_band", "item", cx - 7.5, cz - 8.5, "التقاط ضمادتين", { item: "bandage", qty: 2 }, 4.2 + 0.65);
    pickupProp(ctx, "hos_f3_shells", "item", cx, cz - 10.2, "التقاط خرطوش حراسة", { item: "shotgun_ammo", qty: 8 }, 8.4 + 0.95);
    pickupProp(ctx, "hos_f3_med", "item", cx - 9.5, cz + 6.5, "التقاط علبة إسعاف جراحية", { item: "medkit", qty: 1 }, 8.4 + 0.92);

    // الأبواب
    addDoorAt(ctx, "door_hospital", cx, cz - HD / 2, "x", 2.6, "double", 0);
    addDoorAt(ctx, "door_hospital_west", cx - HW / 2, cz, "z", 2.0, "metal", 0);
    addDoorAt(ctx, "door_hospital_clinic", cx + 10, cz - 1, "x", 1.8, "wood", 0);
    addDoorAt(ctx, "door_hospital_er", cx - 10, cz - 1, "x", 1.8, "wood", 0);
    addDoorAt(ctx, "door_hospital_laundry", cx + 9, cz + 3, "x", 1.8, "metal", 0);
    addDoorAt(ctx, "door_hospital_or", cx + 9, cz - 1, "x", 1.8, "metal", 4.2);
    addDoorAt(ctx, "door_hospital_icu", cx - 10, cz - 1, "x", 1.8, "wood", 4.2);
    addDoorAt(ctx, "door_hospital_office", cx - 10, cz + 3.5, "x", 1.6, "wood", 4.2);
    addDoorAt(ctx, "door_hospital_virology", cx, cz - 1.5, "x", 2.0, "metal", 8.4);

    ctx.buildings.push({ x: cx, z: cz, w: HW, d: HD, name: "المستشفى المركزي", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 8, z: cz - 5, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx + 5, z: cz - 8, wander: 5 });
    ctx.spawns.push({ kind: "runner", x: cx + 10, z: cz + 5, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 8, z: cz + 8.5, wander: 3 });
    ctx.spawns.push({ kind: "brute", x: cx, z: cz - 4, wander: 6 });
    ctx.spawns.push({ kind: "spitter", x: cx - 18, z: cz - 1, wander: 8 });

    // سارة — تجلس على مقعد طبي في غرفة الغسيل بالطابق الأرضي، وعند إنقاذها تتجه للميناء وتصعد القارب
    bench(w, cx + 13.5, cz + 10.2, Math.PI);
    const sara = survivorModel("sara");
    sara.position.set(cx + 13.5, 0, cz + 10.2);
    sara.rotation.y = Math.PI * 0.85;
    sara.userData.alwaysVisible = true;
    scene.add(sara);
    ctx.survivors.push({
      id: "sara",
      obj: sara,
      startX: cx + 13.5,
      startY: 0,
      startZ: cz + 10.2,
      startRy: Math.PI * 0.85,
      waypoints: [
        [cx + 9.0, 0, cz + 6.5],
        [cx + 9.0, 0, cz + 1.0],
        [cx, 0, cz - 7.0],
        [cx, 0, cz - 16.0],
        [46, 0, 6],
        [46, 0, 96],
        [2.5, 0, 98],
        [2.5, 0.04, 117.5],
        [2.5, 0.32, 123.4],
        [4.8, 0.32, 125.0],
      ],
      boatPos: [4.8, 0.32, 125.0],
      boatRy: -Math.PI * 0.78,
      state: "idle",
      wpIndex: 0,
      walkTime: 0,
    });
    ctx.interactables.push({ id: "npc_sara", kind: "npc", x: cx + 13.5, z: cz + 10.2, y: 1.0, radius: 2.3, prompt: "التحدث مع سارة", data: { survivor: "sara" }, used: false });
    ctx.triggers.push({ id: "trig_hospital", x: cx, z: cz, radius: 16, once: true });
  }

  // ── 6) مصنع القطع — الواجهة النهرية جنوب غرب (-69,69) — مصنع من طابقين مع شرفة تحكم علوية ──
  {
    const cx = -69, cz = 69;
    const w2 = propCtxOf(ctx, 4.2);
    roomFloor(ctx, cx, cz, 26, 18);
    roomRoof(ctx, cx, cz, 26, 18, "roof", 8.4);
    buildingExteriorTrim(w, cx, cz, 26, 18, 8.4, "concrete");
    entrancePorch(w, cx + 7, cz - 9, 4.6, 2.4, 3.8, "N", "concrete");

    wallWithGaps(ctx, "metal", cx - 13, cz - 9, cx + 13, cz - 9, [
      { at: 6, width: 2.4, sill: 1.4, top: 3.1 },
      { at: 20, width: 2.4 },
    ]);
    realisticDoorFrame(w, cx + 7, 0, cz - 9, 2.4, 2.8, "x", "metal");
    realisticWindow(w, cx - 7, 1.4, cz - 9, 2.4, 1.7, "x", "metal");

    wallWithGaps(ctx, "metal", cx - 13, cz + 9, cx + 13, cz + 9, [
      { at: 7, width: 2.4, sill: 1.4, top: 3.1 },
      { at: 19, width: 2.4, sill: 1.4, top: 3.1 },
    ]);
    realisticWindow(w, cx - 6, 1.4, cz + 9, 2.4, 1.7, "x", "metal");
    realisticWindow(w, cx + 6, 1.4, cz + 9, 2.4, 1.7, "x", "metal");
    wallWithGaps(ctx, "metal", cx - 13, cz - 9, cx - 13, cz + 9);
    wallWithGaps(ctx, "metal", cx + 13, cz - 9, cx + 13, cz + 9);

    // جدران الطابق الثاني للمصنع (شرفة الميزانين الهندسية)
    wallWithGaps(ctx, "metal", cx - 13, cz - 9, cx + 13, cz - 9, [
      { at: 7, width: 2.6, sill: 1.2, top: 3.0 },
      { at: 19, width: 2.6, sill: 1.2, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 6, 1.2, cz - 9, 2.6, 1.8, "x", "metal");
    realisticWindow(w2, cx + 6, 1.2, cz - 9, 2.6, 1.8, "x", "metal");
    wallWithGaps(ctx, "metal", cx - 13, cz + 9, cx + 13, cz + 9, [
      { at: 13, width: 2.6, sill: 1.2, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx, 1.2, cz + 9, 2.6, 1.8, "x", "metal");
    wallWithGaps(ctx, "metal", cx - 13, cz - 9, cx - 13, cz + 9, [], 4.2);
    wallWithGaps(ctx, "metal", cx + 13, cz - 9, cx + 13, cz + 9, [], 4.2);

    // بلاطة شرفة الميزانين العلوية في النصف الشرقي (من cx+1 إلى cx+13) + درج فولاذي للصعود إليها
    addWalkableStairs(ctx, cx + 2.4, 0, cz + 4.2, 2.2, 4.2, 6.4, "-z");
    floorSlabWithHole(ctx, cx + 7, cz, 12, 18, 4.2, cx + 1.1, cx + 3.7, cz + 0.8, cz + 7.6, "concrete");
    railingSection(w2, cx + 1.1, cz - 8.8, cx + 1.1, cz + 0.8, "chrome");
    railingSection(w2, cx + 1.1, cz + 7.6, cx + 1.1, cz + 8.8, "chrome");
    railingSection(w2, cx + 3.7, cz + 0.8, cx + 3.7, cz + 7.6, "chrome");
    controlPanel(w2, cx + 5.5, cz - 6.5, 0);
    serverRack(w2, cx + 11.2, cz - 5.5, -Math.PI / 2);
    desk(w2, cx + 8.5, cz + 4.5, Math.PI, true);
    officeChair(w2, cx + 8.5, cz + 3.2, 0);

    // خطوط إنتاج ثقيلة في الطابق الأرضي
    pressMachine(w, cx - 8, cz - 4, 0);
    pressMachine(w, cx - 2.5, cz - 3, Math.PI / 2);
    conveyor(w, cx - 4, cz + 3, Math.PI / 2, 6);
    controlPanel(w, cx + 1, cz - 6.5, Math.PI);
    controlPanel(w, cx - 12, cz + 2, Math.PI / 2);
    forklift(w, cx + 9, cz + 4, -0.5);
    barrel(w, cx - 11, cz + 6, "greenMetal");
    barrel(w, cx + 11.5, cz - 6.5, "carB", true);
    barrel(w, cx - 4, cz - 7.5, "carA");
    cratesStack(w, cx - 11.5, cz - 6.5);
    cratesStack(w, cx + 6, cz + 7);
    wallPipes(w, cx, 3.4, cz - 8.6, 0, 9);
    wallPipes(w, cx - 12.6, 2.8, cz + 2, Math.PI / 2, 6);
    w.push("hazard", new THREE.BoxGeometry(3.4, 0.03, 1), mat4(cx - 8, 0.05, cz - 1.6));
    w.push("hazard", new THREE.BoxGeometry(3.4, 0.03, 1), mat4(cx - 2.5, 0.05, cz - 0.9));

    // مكتب المشرفين الأرضي (Supervisor Office) — الرقيب
    wallWithGaps(ctx, "concrete", cx + 6, cz - 9, cx + 6, cz - 2, [{ at: 2.5, width: 1.5 }]);
    realisticDoorFrame(w, cx + 6, 0, cz - 6.5, 1.5, 2.4, "z", "metal");
    wallWithGaps(ctx, "concrete", cx + 6, cz - 2, cx + 13, cz - 2, [{ at: 3.5, width: 1.8, sill: 1.1, top: 2.6 }]);
    realisticWindow(w, cx + 9.5, 1.1, cz - 2, 1.8, 1.5, "x", "metal");
    desk(w, cx + 10, cz - 6.5, Math.PI, false);
    officeChair(w, cx + 10, cz - 5.3, 0);
    cabinet(w, cx + 12.2, cz - 8, 0);
    emergencyLight(ctx, cx - 8, 3.6, cz + 6, 0xc22a1e);
    fluoro(ctx, cx - 4, cz + 2, 0xd0a860, 1.1, 12, 12, 0);
    fluoro(ctx, cx + 7, cz - 2, 0xd8e8d0, 1.0, 12, 14, 4.2);
    addFire(ctx, cx - 11, cz - 7, 0.9);
    bloodDecal(ctx, cx + 2, cz - 1, 2.4);
    bloodTrail(ctx, cx - 6, cz, cx - 2, cz + 3);
    coveredBody(w, cx - 3, cz + 1, 0.9);
    corpse(ctx, cx + 8, cz + 4);

    // الالتقاطات
    noteProp(ctx, "fac_doc", "doc_2", cx + 10, cz - 6.5, 0.82);
    pickupProp(ctx, "fac_red", "item", cx - 11.5, cz - 6.5, "التقاط بطاقة وصول حمراء", { item: "keycard_red", qty: 1 }, 0.78);
    pickupProp(ctx, "fac_ammo", "item", cx - 4, cz + 6, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 20 }, 0.14);
    pickupProp(ctx, "fac_stick", "item", cx + 3.5, cz + 5.5, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "fac_band", "item", cx + 5, cz + 6, "التقاط ضمادة", { item: "bandage", qty: 1 }, 0.14);
    pickupProp(ctx, "fac_f2_shells", "item", cx + 8.5, cz + 4.5, "التقاط خرطوش من مكتب التحكم العلوي", { item: "shotgun_ammo", qty: 6 }, 4.2 + 0.92);

    addDoorAt(ctx, "door_factory", cx + 7, cz - 9, "x", 2.4, "double", 0);
    ctx.buildings.push({ x: cx, z: cz, w: 26, d: 18, name: "مصنع القطع", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 6, z: cz, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 6, z: cz + 5, wander: 5 });
    ctx.spawns.push({ kind: "runner", x: cx - 10, z: cz - 5, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 10, z: cz - 5, wander: 3 });
    ctx.spawns.push({ kind: "spitter", x: cx - 6, z: cz + 7, wander: 7 });

    // الرقيب — جاثٍ مصاب في مكتب المشرفين، وعند إنقاذه يتجه للميناء ويصعد القارب
    const soldier = survivorModel("soldier");
    soldier.position.set(cx + 10.5, 0, cz - 7.5);
    soldier.rotation.y = -Math.PI * 0.7;
    soldier.userData.alwaysVisible = true;
    scene.add(soldier);
    ctx.survivors.push({
      id: "soldier",
      obj: soldier,
      startX: cx + 10.5,
      startY: 0,
      startZ: cz - 7.5,
      startRy: -Math.PI * 0.7,
      waypoints: [
        [cx + 7.5, 0, cz - 6.5],
        [cx + 4.5, 0, cz - 6.5],
        [cx + 7.0, 0, cz - 12.0],
        [-46, 0, 56],
        [-46, 0, 96],
        [2.5, 0, 98],
        [2.5, 0.04, 117.5],
        [2.5, 0.32, 123.4],
        [3.8, 0.32, 126.6],
      ],
      boatPos: [3.8, 0.32, 126.6],
      boatRy: Math.PI * 0.88,
      state: "idle",
      wpIndex: 0,
      walkTime: 0,
    });
    ctx.interactables.push({ id: "npc_soldier", kind: "npc", x: cx + 10.5, z: cz - 7.5, y: 1.0, radius: 2.3, prompt: "التحدث مع الرقيب", data: { survivor: "soldier" }, used: false });
    ctx.triggers.push({ id: "trig_factory", x: cx, z: cz, radius: 13, once: true });
  }

  // ── 7) المستودع الغربي (-69,23) — مستودع شحن بغرفة إدارة خلفية ونوافذ حقيقية ──
  {
    const cx = -69, cz = 23;
    roomFloor(ctx, cx, cz, 24, 18);
    roomRoof(ctx, cx, cz, 24, 18);
    buildingExteriorTrim(w, cx, cz, 24, 18, 4.4, "concrete");
    entrancePorch(w, cx, cz - 9, 4.4, 2.2, 3.6, "N", "concrete");

    wallWithGaps(ctx, "metal", cx - 12, cz - 9, cx + 12, cz - 9, [
      { at: 5, width: 2.0, sill: 1.4, top: 3.0 },
      { at: 12, width: 2.4 },
      { at: 19, width: 2.0, sill: 1.4, top: 3.0 },
    ]);
    realisticDoorFrame(w, cx, 0, cz - 9, 2.4, 2.8, "x", "metal");
    realisticWindow(w, cx - 7, 1.4, cz - 9, 2.0, 1.6, "x", "metal");
    realisticWindow(w, cx + 7, 1.4, cz - 9, 2.0, 1.6, "x", "metal");

    wallWithGaps(ctx, "metal", cx - 12, cz + 9, cx + 12, cz + 9, [
      { at: 6, width: 2.0, sill: 1.4, top: 3.0 },
      { at: 18, width: 2.0, sill: 1.4, top: 3.0 },
    ]);
    realisticWindow(w, cx - 6, 1.4, cz + 9, 2.0, 1.6, "x", "metal");
    realisticWindow(w, cx + 6, 1.4, cz + 9, 2.0, 1.6, "x", "metal");
    wallWithGaps(ctx, "metal", cx - 12, cz - 9, cx - 12, cz + 9);
    wallWithGaps(ctx, "metal", cx + 12, cz - 9, cx + 12, cz + 9);

    // غرفة الجرد الخلفية في المستودع (حيث يختبئ عادل)
    wallWithGaps(ctx, "concrete", cx + 5.5, cz + 2.5, cx + 12, cz + 2.5, [{ at: 2.5, width: 1.5 }]);
    realisticDoorFrame(w, cx + 8.0, 0, cz + 2.5, 1.5, 2.4, "x", "wood");
    wallWithGaps(ctx, "concrete", cx + 5.5, cz + 2.5, cx + 5.5, cz + 9, [{ at: 3.2, width: 1.6, sill: 1.2, top: 2.6 }]);
    realisticWindow(w, cx + 5.5, 1.2, cz + 5.7, 1.6, 1.4, "z", "wood");
    desk(w, cx + 10.2, cz + 4.5, 0, true);

    // صفوف الرفوف المرتفعة
    shelfStocked(w, cx - 6.5, cz + 3.5, 0, 7.5, true);
    shelfStocked(w, cx + 0.5, cz + 3.5, 0, 7.5, true);
    shelfStocked(w, cx - 2.5, cz - 4.5, Math.PI / 2, 6.5, true);

    // منصات تخزين pallet
    for (const [px2, pz2, pr] of [[cx + 7, cz - 2, 0.2], [cx - 9, cz - 5, -0.3]] as const) {
      for (let s2 = 0; s2 < 3; s2++) {
        w.push("wood2", new THREE.BoxGeometry(1.2, 0.05, 1.2), mat4(px2 + s2 * 0.04, 0.05 + s2 * 0.16, pz2, { ry: pr + s2 * 0.1 }));
      }
    }
    forklift(w, cx + 8.5, cz - 0.5, 2.6);
    cratesStack(w, cx - 10.0, cz + 6.5);
    cratesStack(w, cx + 9.5, cz - 5.5);
    cratesStack(w, cx + 5.5, cz - 6.5);
    barrel(w, cx - 10.5, cz - 1, "carA");
    barrel(w, cx - 11.2, cz - 1.4, "carA");

    fluoro(ctx, cx, cz, 0xd0a860, 1.1, 14, 8);
    bloodDecal(ctx, cx + 4, cz - 2, 2);
    coveredBody(w, cx + 5, cz - 3, 2.4);

    pickupProp(ctx, "ware_food1", "item", cx - 6.5, cz + 3.5, "التقاط طعام معلب", { item: "food", qty: 2 }, 0.95);
    pickupProp(ctx, "ware_food2", "item", cx + 0.5, cz + 3.5, "التقاط طعام معلب", { item: "food", qty: 1 }, 0.95);
    pickupProp(ctx, "ware_ammo", "item", cx - 2.5, cz - 4.5, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 16 }, 0.95);
    pickupProp(ctx, "ware_stick", "item", cx - 4.5, cz - 6.5, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "ware_bat", "item", cx + 8.5, cz - 4, "التقاط بطاريتين", { item: "battery", qty: 2 }, 0.14);

    addDoorAt(ctx, "door_warehouse", cx, cz - 9, "x", 2.4, "double", 0);
    addDoorAt(ctx, "door_warehouse_office", cx + 8.0, cz + 2.5, "x", 1.5, "wood", 0);
    ctx.buildings.push({ x: cx, z: cz, w: 24, d: 18, name: "المستودع الغربي", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 5, z: cz - 1, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 3, z: cz + 1, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx - 8.5, z: cz + 6, wander: 3 });

    // عادل في الغرفة الخلفية للمستودع، وعند إنقاذه يتجه للميناء ويصعد القارب
    const adel = survivorModel("adel");
    adel.position.set(cx + 9.5, 0, cz + 6.5);
    adel.rotation.y = Math.PI * 0.8;
    adel.userData.alwaysVisible = true;
    scene.add(adel);
    ctx.survivors.push({
      id: "adel",
      obj: adel,
      startX: cx + 9.5,
      startY: 0,
      startZ: cz + 6.5,
      startRy: Math.PI * 0.8,
      waypoints: [
        [cx + 8.0, 0, cz + 4.2],
        [cx + 8.0, 0, cz - 1.0],
        [cx, 0, cz - 5.0],
        [cx, 0, cz - 12.5],
        [-46, 0, 10],
        [-46, 0, 96],
        [2.5, 0, 98],
        [2.5, 0.04, 117.5],
        [2.5, 0.32, 123.4],
        [0.8, 0.32, 126.2],
      ],
      boatPos: [0.8, 0.32, 126.2],
      boatRy: Math.PI * 0.82,
      state: "idle",
      wpIndex: 0,
      walkTime: 0,
    });
    ctx.interactables.push({ id: "npc_adel", kind: "npc", x: cx + 9.5, z: cz + 6.5, y: 1.0, radius: 2.3, prompt: "التحدث مع عادل", data: { survivor: "adel" }, used: false });
    ctx.triggers.push({ id: "trig_warehouse", x: cx, z: cz, radius: 12, once: true });
  }

  // ── 8) محطة الوقود ومتجر التموينات — الركن الجنوبي الشرقي (69,69) ──
  {
    const cx = 69, cz = 69;
    // مظلة المضخات
    addBox(ctx, "concrete", cx, 5.2, cz, 15, 0.4, 11, false);
    [[-6.5, -4.5], [6.5, -4.5], [-6.5, 4.5], [6.5, 4.5]].forEach(([ox, oz]) => {
      addBox(ctx, "metal", cx + ox, 0, cz + oz, 0.5, 5.2, 0.5);
    });

    // مضخات وقود حديثة بمؤشرات مضيئة
    for (const sx of [-3.5, 3.5]) {
      addBox(ctx, "metal", cx + sx, 0, cz, 1.2, 1.6, 0.85);
      w.push("screenGlowAmber", new THREE.PlaneGeometry(0.75, 0.45), mat4(cx + sx, 1.95, cz, { rx: -0.35 }));
      w.push("chrome", new THREE.TorusGeometry(0.35, 0.03, 6, 12, Math.PI), mat4(cx + sx + 0.6, 1.1, cz, { ry: Math.PI / 2 }));
      w.push("rubber", new THREE.CylinderGeometry(0.025, 0.025, 0.95, 6), mat4(cx + sx + 0.6, 1.15, cz + 0.32, { rx: 0.4 }));
    }

    // متجر المحطة الصغير الواقعي (Convenience Store)
    roomFloor(ctx, cx, cz + 10, 12, 10);
    w.push("tile", new THREE.BoxGeometry(11.6, 0.04, 9.6), mat4(cx, 0.06, cz + 10));
    roomRoof(ctx, cx, cz + 10, 12, 10);
    buildingExteriorTrim(w, cx, cz + 10, 12, 10, 4.2, "concrete");

    wallWithGaps(ctx, "brick", cx - 6, cz + 5, cx + 6, cz + 5, [
      { at: 3.5, width: 2.2, sill: 1.0, top: 2.8 },
      { at: 8.5, width: 1.8 },
    ]);
    realisticDoorFrame(w, cx + 2.5, 0, cz + 5, 1.8, 2.5, "x", "wood");
    realisticWindow(w, cx - 2.5, 1.0, cz + 5, 2.2, 1.8, "x", "wood");

    wallWithGaps(ctx, "brick", cx - 6, cz + 15, cx + 6, cz + 15);
    wallWithGaps(ctx, "brick", cx - 6, cz + 5, cx - 6, cz + 15, [{ at: 5, width: 1.8, sill: 1.1, top: 2.8 }]);
    realisticWindow(w, cx - 6, 1.1, cz + 10, 1.8, 1.7, "z", "wood");
    wallWithGaps(ctx, "brick", cx + 6, cz + 5, cx + 6, cz + 15);

    shopShelf(w, cx + 4.2, cz + 12.5, Math.PI / 2, 3.4);
    shopShelf(w, cx - 1, cz + 13.8, 0, 3.0);
    counter(w, cx - 3.8, cz + 8.2, Math.PI / 2, 2.4);
    fridge(w, cx - 4.8, cz + 13.0, Math.PI / 2, true);
    w.push("screenGlow", new THREE.BoxGeometry(0.65, 1.3, 0.02), mat4(cx - 5.1, 0.9, cz + 13.0, { ry: Math.PI / 2 }));
    vending(w, cx - 6.8, cz + 4.5, 0.3);

    fluoro(ctx, cx, cz + 10, 0xd0a860, 1.1, 11, 6);
    addFire(ctx, cx - 5.5, cz - 2, 1.3);
    car(w, cx + 1, cz - 6.5, 0.4, "sedan", rnd());
    bloodDecal(ctx, cx, cz + 2, 1.8);

    pickupProp(ctx, "gas_fuel", "item", cx + 4.2, cz + 12.5, "التقاط جالون وقود", { item: "fuel", qty: 1 }, 0.14);
    pickupProp(ctx, "gas_stick", "item", cx + 1.5, cz + 8.5, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "gas_food", "item", cx - 3.8, cz + 8.2, "التقاط طعام معلب", { item: "food", qty: 1 }, 1.2);
    pickupProp(ctx, "gas_band", "item", cx - 0.5, cz + 13.8, "التقاط ضمادة", { item: "bandage", qty: 1 }, 0.9);

    addDoorAt(ctx, "door_gas", cx + 2.5, cz + 5, "x", 1.8, "wood");
    ctx.buildings.push({ x: cx, z: cz, w: 16, d: 22, name: "محطة الوقود", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 4, z: cz - 4, wander: 5 });
    ctx.spawns.push({ kind: "spitter", x: cx + 8, z: cz - 5, wander: 7 });
    ctx.spawns.push({ kind: "walker", x: cx + 2, z: cz + 13, wander: 2 });
    ctx.triggers.push({ id: "trig_gas", x: cx, z: cz, radius: 10, once: true });
  }

  // ── 9) مجمع كيبريس الإداري والعلمي (1) — الركن الشمالي الغربي (-69,-69) — مبنى ضخم من 3 طوابق بحجم المستشفى ──
  // يضم: ردهة أمنية، مكاتب موظفين، قاعات خوادم متعددة، مكتب الإدارة الرئيسي في الطابق الثالث، ومدخلاً داخلياً يقود إلى المختبر تحت الأرض
  {
    const cx = -69, cz = -69;
    const CW = 32, CD = 26;
    const w2 = propCtxOf(ctx, 4.2);
    const w3 = propCtxOf(ctx, 8.4);

    roomFloor(ctx, cx, cz, CW, CD);
    w.push("tile", new THREE.BoxGeometry(CW - 0.4, 0.04, CD - 0.4), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, CW, CD, "roof", 12.6);
    buildingExteriorTrim(w, cx, cz, CW, CD, 12.6, "concrete");

    // لافتات المجمع الكبرى المضيئة وأروقة الدخول (المدخل الشرقي الرئيسي + المدخل الجنوبي)
    const compSignE = shopSign(cx + CW / 2 + 0.25, 11.4, cz, Math.PI / 2, "مجمع كيبريس للأبحاث والإدارة — KYPRIS COMPLEX");
    compSignE.userData.noHit = true;
    scene.add(compSignE);
    const compSignS = shopSign(cx, 11.4, cz + CD / 2 + 0.25, Math.PI, "مؤسسة كيبريس للأبحاث الحيوية — KYPRIS CORP");
    compSignS.userData.noHit = true;
    scene.add(compSignS);

    entrancePorch(w, cx + CW / 2, cz, 7.6, 3.6, 4.0, "E", "concrete");
    entrancePorch(w, cx, cz + CD / 2, 7.6, 3.6, 4.0, "S", "concrete");

    // ──────────────── الطابق الأرضي (y = 0..4.2): بهو الاستقبال، مكاتب الموظفين، غرفة الخوادم الأرضية، ومدخل المختبر الداخلي ────────────────
    // الجدار الشمالي الخارجي
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - CD / 2, cx + CW / 2, cz - CD / 2, [
      { at: 6, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 26, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticWindow(w, cx - 10, 1.2, cz - CD / 2, 2.2, 1.8, "x", "metal");
    realisticWindow(w, cx + 10, 1.2, cz - CD / 2, 2.2, 1.8, "x", "metal");

    // الجدار الجنوبي الخارجي (يضم المدخل الجنوبي المزدوج)
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz + CD / 2, cx + CW / 2, cz + CD / 2, [
      { at: 6, width: 2.2, sill: 1.2, top: 3.0 },
      { at: CW / 2, width: 2.6 },
      { at: CW - 6, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticDoorFrame(w, cx, 0, cz + CD / 2, 2.6, 2.6, "x", "metal");
    realisticWindow(w, cx - 10, 1.2, cz + CD / 2, 2.2, 1.8, "x", "metal");
    realisticWindow(w, cx + 10, 1.2, cz + CD / 2, 2.2, 1.8, "x", "metal");

    // الجدار الغربي الخارجي
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - CD / 2, cx - CW / 2, cz + CD / 2, [
      { at: 6, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 13, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 20, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticWindow(w, cx - CW / 2, 1.2, cz - 7, 2.2, 1.8, "z", "metal");
    realisticWindow(w, cx - CW / 2, 1.2, cz, 2.2, 1.8, "z", "metal");
    realisticWindow(w, cx - CW / 2, 1.2, cz + 7, 2.2, 1.8, "z", "metal");

    // الجدار الشرقي الخارجي (يضم المدخل الشرقي الرئيسي المزدوج)
    wallWithGaps(ctx, "concrete", cx + CW / 2, cz - CD / 2, cx + CW / 2, cz + CD / 2, [
      { at: 6, width: 2.2, sill: 1.2, top: 3.0 },
      { at: 13, width: 2.6 },
      { at: 20, width: 2.2, sill: 1.2, top: 3.0 },
    ]);
    realisticWindow(w, cx + CW / 2, 1.2, cz - 7, 2.2, 1.8, "z", "metal");
    realisticDoorFrame(w, cx + CW / 2, 0, cz, 2.6, 2.6, "z", "metal");
    realisticWindow(w, cx + CW / 2, 1.2, cz + 7, 2.2, 1.8, "z", "metal");

    // 1. بهو الاستقبال ونقطة التفتيش الأمنية الداخلية (Main Security Atrium)
    turnstile(w, cx + 11.2, cz - 1.5, Math.PI / 2);
    turnstile(w, cx + 11.2, cz + 1.5, Math.PI / 2);
    counter(w, cx + 7.2, cz - 2.2, -Math.PI / 2, 3.4);
    officeChair(w, cx + 8.4, cz - 2.2, Math.PI / 2);
    desk(w, cx + 9.2, cz + 5.2, 0, true);
    officeChair(w, cx + 9.2, cz + 3.9, Math.PI);
    bench(w, cx + 13.2, cz + 8.5, Math.PI);
    bench(w, cx + 7.5, cz + 10.5, Math.PI);
    elevatorDoors(w, cx + 5.8, 0, cz + 12.6, "x");
    wallPicture(w, cx + 11.0, 1.8, cz + 12.6, 2.2, 1.2, "x", "map");

    // 2. جناح مكاتب الموظفين والأرشيف الإداري الأرضي (Ground Floor Staff Offices — الجناح الغربي الجنوبي)
    wallWithGaps(ctx, "concrete", cx - 4.5, cz - 4.5, cx - 4.5, cz + CD / 2, [
      { at: 4.0, width: 2.2, sill: 1.1, top: 2.8 },
      { at: 10.5, width: 1.8 },
    ]);
    realisticWindow(w, cx - 4.5, 1.1, cz - 0.5, 2.2, 1.7, "z", "metal");
    realisticDoorFrame(w, cx - 4.5, 0, cz + 6.0, 1.8, 2.5, "z", "wood");
    w.push("woodFloor", new THREE.BoxGeometry(11.1, 0.045, 17.1), mat4(cx - 10.2, 0.03, cz + 4.2));
    desk(w, cx - 12.5, cz - 1.2, 0, true);
    officeChair(w, cx - 12.5, cz - 2.5, Math.PI);
    desk(w, cx - 8.2, cz - 1.2, 0, true);
    officeChair(w, cx - 8.2, cz - 2.5, Math.PI);
    desk(w, cx - 12.5, cz + 4.8, Math.PI, true);
    officeChair(w, cx - 12.5, cz + 6.1, 0);
    desk(w, cx - 8.2, cz + 9.2, Math.PI, true);
    officeChair(w, cx - 8.2, cz + 10.5, 0);
    bookshelfFull(w, cx - 14.8, cz + 1.8, Math.PI / 2, 2.6, 501);
    cabinet(w, cx - 12.5, cz + 11.8, Math.PI, "metal");
    cabinet(w, cx - 10.5, cz + 11.8, Math.PI, "metal");
    vending(w, cx - 6.2, cz + 11.6, Math.PI);
    deadPlant(w, cx - 6.0, cz - 3.2);

    // 3. قاعة الخوادم والشبكات الأرضية (Ground Floor Server Room — الركن الشمالي الشرقي)
    wallWithGaps(ctx, "concrete", cx + 4.5, cz - 4.5, cx + CW / 2, cz - 4.5, [
      { at: 5.5, width: 1.8 },
      { at: 9.2, width: 2.0, sill: 1.1, top: 2.8 },
    ]);
    realisticDoorFrame(w, cx + 10.0, 0, cz - 4.5, 1.8, 2.5, "x", "metal");
    realisticWindow(w, cx + 13.7, 1.1, cz - 4.5, 2.0, 1.7, "x", "metal");
    wallWithGaps(ctx, "concrete", cx + 4.5, cz - CD / 2, cx + 4.5, cz - 4.5);
    w.push("labFloor", new THREE.BoxGeometry(11.1, 0.045, 8.1), mat4(cx + 10.2, 0.03, cz - 8.7));
    for (const sz of [cz - 11.2, cz - 8.8, cz - 6.4]) {
      serverRack(w, cx + 14.4, sz, -Math.PI / 2);
      serverRack(w, cx + 6.2, sz, Math.PI / 2);
    }
    controlPanel(w, cx + 10.2, cz - 11.6, 0);
    wallPipes(w, cx + 15.5, 3.2, cz - 8.8, -Math.PI / 2, 7);

    // 4. المدخل الداخلي المدرع المؤدي إلى المختبر تحت الأرض (Internal Lab Bunker Vault — الجناح الشمالي الأوسط والغربي)
    // حاجز أمني يفصل البهو عن قاعة بوابة المختبر مع رواق مفتوح عريض (4.4م)
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - 4.5, cx + 4.5, cz - 4.5, [
      { at: 5.0, width: 2.2, sill: 1.1, top: 2.8 },
      { at: 14.0, width: 4.4 },
    ]);
    realisticWindow(w, cx - 11.0, 1.1, cz - 4.5, 2.2, 1.7, "x", "metal");
    realisticDoorFrame(w, cx - 2.0, 0, cz - 4.5, 4.4, 3.2, "x", "metal");
    w.push("labFloor", new THREE.BoxGeometry(20.1, 0.045, 8.1), mat4(cx - 5.7, 0.03, cz - 8.7));
    w.push("hazard", new THREE.BoxGeometry(4.8, 0.05, 0.55), mat4(cx - 2.0, 0.04, cz - 6.8));

    const bunkerSign = shopSign(cx - 2.0, 3.55, cz - 4.15, Math.PI, "مدخل المختبر تحت الأرض — القطاع B4");
    bunkerSign.userData.noHit = true;
    scene.add(bunkerSign);

    // جدار الاحتواء الفولاذي الداخلي عند cz - 8.8 الذي تفتح فيه بوابة المختبر المدرعة (عند cx - 2.0, cz - 8.8)
    wallWithGaps(ctx, "metal", cx - CW / 2, cz - 8.8, cx + 4.5, cz - 8.8, [{ at: 14.0, width: 4.2 }]);
    elevatorDoors(w, cx - 2.0, 0, cz - 12.6, "x");
    bioIncubator(w, cx - 6.5, cz - 11.0);
    bioIncubator(w, cx + 2.2, cz - 11.0);
    shelfStocked(w, cx - 14.6, cz - 6.6, Math.PI / 2, 3.0, true);
    cratesStack(w, cx - 11.5, cz - 11.2);

    // قارئا بطاقات التصريح المزدوج على جانبي البوابة الفولاذية داخل المبنى
    for (const sx of [-2.65, 2.65]) {
      addBox(ctx, "labMetal", cx - 2.0 + sx, 0, cz - 8.2, 0.55, 1.45, 0.45);
      w.push(sx < 0 ? "screenGlow" : "redEmissive", new THREE.BoxGeometry(0.32, 0.22, 0.02), mat4(cx - 2.0 + sx, 1.18, cz - 7.95));
    }

    // بوابة المختبر الفولاذية الضخمة داخل الطابق الأرضي للمجمع (عند cx - 2.0, cz - 8.8)
    const doorGroup = new THREE.Group();
    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 3.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x3a3f42, roughness: 0.45, metalness: 0.75, emissive: 0x1a0505, emissiveIntensity: 0.5 }),
    );
    doorMesh.position.y = 1.7;
    const doorStripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.28, 0.44),
      new THREE.MeshStandardMaterial({ color: 0xc28a1e, roughness: 0.6 }),
    );
    doorStripe.position.y = 1.7;
    doorGroup.add(doorMesh, doorStripe);
    doorGroup.position.set(cx - 2.0, 0, cz - 8.8);
    scene.add(doorGroup);
    doorGroupRef = doorGroup;
    ctx.colliders.push({ minX: cx - 4.1, maxX: cx + 0.1, minZ: cz - 9.1, maxZ: cz - 8.5, minY: 0, maxY: 3.8 });
    addFlickerLight(ctx, cx - 2.0, 3.6, cz - 7.5, 0xc22a1e, 1.3, 11, 2);
    ctx.interactables.push({
      id: "lab_door",
      kind: "gate",
      x: cx - 2.0,
      z: cz - 8.8,
      y: 1.2,
      radius: 2.8,
      prompt: "بوابة المختبر تحت الأرض — بطاقتا وصول",
      used: false,
    });

    // الدرج المركزي الأول: من الطابق الأرضي (0) إلى الطابق الثاني (4.2)
    // يمتد من cz+0.0 إلى cz+7.0 وعرضه من cx-2.2 إلى cx+0.6
    addWalkableStairs(ctx, cx - 0.8, 0, cz + 3.5, 2.8, 4.2, 7.0, "+z");

    // ──────────────── الطابق الثاني (y = 4.2..8.4): مكاتب الأقسام الإدارية وقاعات الخوادم الرئيسية ────────────────
    floorSlabWithHole(ctx, cx, cz, CW, CD, 4.2, cx - 2.3, cx + 3.7, cz - 0.1, cz + 7.1, "tile");
    railingSection(w2, cx - 2.3, cz - 0.1, cx - 2.3, cz + 7.1, "chrome");
    railingSection(w2, cx - 2.3, cz - 0.1, cx + 0.7, cz - 0.1, "chrome");
    railingSection(w2, cx + 3.7, cz - 0.1, cx + 3.7, cz + 7.1, "chrome");
    elevatorDoors(w2, cx + 5.8, 0, cz + 12.6, "x");

    // الجدران الخارجية للطابق الثاني مع نوافذ زجاجية
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - CD / 2, cx + CW / 2, cz - CD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 16, width: 2.6, sill: 1.1, top: 3.0 },
      { at: 26, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 10, 1.1, cz - CD / 2, 2.2, 1.9, "x", "metal");
    realisticWindow(w2, cx, 1.1, cz - CD / 2, 2.6, 1.9, "x", "metal");
    realisticWindow(w2, cx + 10, 1.1, cz - CD / 2, 2.2, 1.9, "x", "metal");

    wallWithGaps(ctx, "concrete", cx - CW / 2, cz + CD / 2, cx + CW / 2, cz + CD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 16, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 26, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - 10, 1.1, cz + CD / 2, 2.2, 1.9, "x", "metal");
    realisticWindow(w2, cx, 1.1, cz + CD / 2, 2.2, 1.9, "x", "metal");
    realisticWindow(w2, cx + 10, 1.1, cz + CD / 2, 2.2, 1.9, "x", "metal");

    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - CD / 2, cx - CW / 2, cz + CD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 20, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx - CW / 2, 1.1, cz - 7, 2.2, 1.9, "z", "metal");
    realisticWindow(w2, cx - CW / 2, 1.1, cz + 7, 2.2, 1.9, "z", "metal");

    wallWithGaps(ctx, "concrete", cx + CW / 2, cz - CD / 2, cx + CW / 2, cz + CD / 2, [
      { at: 6, width: 2.2, sill: 1.1, top: 3.0 },
      { at: 20, width: 2.2, sill: 1.1, top: 3.0 },
    ], 4.2);
    realisticWindow(w2, cx + CW / 2, 1.1, cz - 7, 2.2, 1.9, "z", "metal");
    realisticWindow(w2, cx + CW / 2, 1.1, cz + 7, 2.2, 1.9, "z", "metal");

    // 1. الجناح الغربي للطابق الثاني: مكاتب الأقسام الإدارية والباحثين (Corporate & Research Offices)
    wallWithGaps(ctx, "concrete", cx - 4.5, cz - CD / 2, cx - 4.5, cz + CD / 2, [
      { at: 6.5, width: 1.8 },
      { at: 13.0, width: 2.4, sill: 1.1, top: 2.8 },
      { at: 19.5, width: 1.8 },
    ], 4.2);
    realisticDoorFrame(w2, cx - 4.5, 0, cz - 6.5, 1.8, 2.5, "z", "wood");
    realisticWindow(w2, cx - 4.5, 1.1, cz, 2.4, 1.7, "z", "wood");
    realisticDoorFrame(w2, cx - 4.5, 0, cz + 6.5, 1.8, 2.5, "z", "wood");
    // قاطع داخلي بفتحة ممر بين مكاتب الشمال ومكاتب الجنوب
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz, cx - 4.5, cz, [{ at: 5.8, width: 2.0 }], 4.2);
    realisticDoorFrame(w2, cx - 10.2, 0, cz, 2.0, 2.5, "x", "wood");
    w2.push("woodFloor", new THREE.BoxGeometry(11.1, 0.045, 25.4), mat4(cx - 10.2, 0.03, cz));

    // تأثيث مكاتب الشمال والجنوب في الطابق الثاني (6 مكاتب مجهزة + خزائن ومكتبات)
    desk(w2, cx - 12.5, cz - 9.2, 0, true);
    officeChair(w2, cx - 12.5, cz - 10.5, Math.PI);
    desk(w2, cx - 8.0, cz - 9.2, 0, true);
    officeChair(w2, cx - 8.0, cz - 10.5, Math.PI);
    desk(w2, cx - 12.5, cz - 4.0, Math.PI, true);
    officeChair(w2, cx - 12.5, cz - 2.7, 0);
    bookshelfFull(w2, cx - 14.8, cz - 6.5, Math.PI / 2, 2.8, 502);
    cabinet(w2, cx - 7.5, cz - 12.0, 0, "wood2");

    desk(w2, cx - 12.5, cz + 4.2, 0, true);
    officeChair(w2, cx - 12.5, cz + 2.9, Math.PI);
    desk(w2, cx - 8.0, cz + 4.2, 0, true);
    officeChair(w2, cx - 8.0, cz + 2.9, Math.PI);
    desk(w2, cx - 12.5, cz + 9.2, Math.PI, true);
    officeChair(w2, cx - 12.5, cz + 10.5, 0);
    sofa(w2, cx - 7.8, cz + 9.8, Math.PI, 2.1);
    coffeeTable(w2, cx - 7.8, cz + 8.0, 0);
    bookshelfFull(w2, cx - 14.8, cz + 7.2, Math.PI / 2, 2.8, 503);
    wallPicture(w2, cx - 10.2, 1.75, cz + 12.6, 2.2, 1.2, "x", "art");

    // 2. الجناح الشرقي للطابق الثاني: مركز الخوادم الرئيسي (Main Data Center & Server Hall)
    wallWithGaps(ctx, "concrete", cx + 5.5, cz - CD / 2, cx + 5.5, cz + CD / 2, [
      { at: 6.5, width: 1.8 },
      { at: 13.0, width: 2.4, sill: 1.1, top: 2.8 },
      { at: 19.5, width: 1.8 },
    ], 4.2);
    realisticDoorFrame(w2, cx + 5.5, 0, cz - 6.5, 1.8, 2.5, "z", "metal");
    realisticWindow(w2, cx + 5.5, 1.1, cz, 2.4, 1.7, "z", "metal");
    realisticDoorFrame(w2, cx + 5.5, 0, cz + 6.5, 1.8, 2.5, "z", "metal");
    w2.push("labFloor", new THREE.BoxGeometry(10.1, 0.045, 25.4), mat4(cx + 10.7, 0.03, cz));

    for (const sz of [cz - 10.2, cz - 6.8, cz - 3.4, cz + 3.4, cz + 6.8, cz + 10.2]) {
      serverRack(w2, cx + 14.4, sz, -Math.PI / 2);
      serverRack(w2, cx + 7.4, sz, Math.PI / 2);
    }
    controlPanel(w2, cx + 10.8, cz - 11.6, 0);
    controlPanel(w2, cx + 10.8, cz, 0);
    controlPanel(w2, cx + 10.8, cz + 11.6, Math.PI);
    wallPipes(w2, cx + 15.5, 3.2, cz, -Math.PI / 2, 18);

    // 3. مكتب التنسيق الأمني شمال البهو في الطابق الثاني
    wallWithGaps(ctx, "concrete", cx - 4.5, cz - 5.5, cx + 5.5, cz - 5.5, [{ at: 5.0, width: 1.8 }], 4.2);
    realisticDoorFrame(w2, cx + 0.5, 0, cz - 5.5, 1.8, 2.5, "x", "metal");
    desk(w2, cx + 0.5, cz - 9.8, Math.PI, true);
    officeChair(w2, cx + 0.5, cz - 8.5, 0);
    lockerRow(w2, cx - 3.2, cz - 11.8, 0, 3);

    // الدرج المركزي الثاني: من الطابق الثاني (4.2) إلى الطابق الثالث (8.4)
    // يمتد من cz+7.0 نزولاً بالاتجاه -z إلى cz+0.0 وعرضه من cx+0.9 إلى cx+3.5
    addWalkableStairs(ctx, cx + 2.2, 4.2, cz + 3.5, 2.6, 4.2, 7.0, "-z");

    // ──────────────── الطابق الثالث (y = 8.4..12.6): مكتب الإدارة الرئيسي في الأعلى، قاعة مجلس الإدارة، وخوادم القيادة ────────────────
    floorSlabWithHole(ctx, cx, cz, CW, CD, 8.4, cx + 0.8, cx + 3.7, cz - 0.1, cz + 7.1, "tile");
    railingSection(w3, cx + 0.8, cz - 0.1, cx + 0.8, cz + 7.1, "chrome");
    railingSection(w3, cx + 3.7, cz - 0.1, cx + 3.7, cz + 7.1, "chrome");
    railingSection(w3, cx + 0.8, cz + 7.1, cx + 3.7, cz + 7.1, "chrome");
    elevatorDoors(w3, cx + 5.8, 0, cz + 12.6, "x");

    // الجدران الخارجية للطابق الثالث مع نوافذ بانورامية
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - CD / 2, cx + CW / 2, cz - CD / 2, [
      { at: 6, width: 2.4, sill: 1.0, top: 3.0 },
      { at: 16, width: 2.8, sill: 1.0, top: 3.0 },
      { at: 26, width: 2.4, sill: 1.0, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx - 10, 1.0, cz - CD / 2, 2.4, 2.0, "x", "wood");
    realisticWindow(w3, cx, 1.0, cz - CD / 2, 2.8, 2.0, "x", "wood");
    realisticWindow(w3, cx + 10, 1.0, cz - CD / 2, 2.4, 2.0, "x", "metal");
    curtainPair(w3, cx - 10, 1.0, cz - CD / 2 + 0.35, 2.4, 2.0, "x");
    curtainPair(w3, cx, 1.0, cz - CD / 2 + 0.35, 2.8, 2.0, "x");

    wallWithGaps(ctx, "concrete", cx - CW / 2, cz + CD / 2, cx + CW / 2, cz + CD / 2, [
      { at: 8, width: 2.4, sill: 1.0, top: 3.0 },
      { at: 24, width: 2.4, sill: 1.0, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx - 8, 1.0, cz + CD / 2, 2.4, 2.0, "x", "wood");
    realisticWindow(w3, cx + 8, 1.0, cz + CD / 2, 2.4, 2.0, "x", "metal");

    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - CD / 2, cx - CW / 2, cz + CD / 2, [
      { at: 6, width: 2.4, sill: 1.0, top: 3.0 },
      { at: 20, width: 2.4, sill: 1.0, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx - CW / 2, 1.0, cz - 7, 2.4, 2.0, "z", "wood");
    realisticWindow(w3, cx - CW / 2, 1.0, cz + 7, 2.4, 2.0, "z", "wood");
    curtainPair(w3, cx - CW / 2 + 0.35, 1.0, cz - 7, 2.4, 2.0, "z");

    wallWithGaps(ctx, "concrete", cx + CW / 2, cz - CD / 2, cx + CW / 2, cz + CD / 2, [
      { at: 6, width: 2.4, sill: 1.0, top: 3.0 },
      { at: 20, width: 2.4, sill: 1.0, top: 3.0 },
    ], 8.4);
    realisticWindow(w3, cx + CW / 2, 1.0, cz - 7, 2.4, 2.0, "z", "metal");
    realisticWindow(w3, cx + CW / 2, 1.0, cz + 7, 2.4, 2.0, "z", "metal");

    // 1. مكتب الإدارة الرئيسي في الأعلى (Main Executive Administration Office — الجناح الشمالي البانورامي للطابق الثالث)
    wallWithGaps(ctx, "concrete", cx - CW / 2, cz - 2.5, cx + 5.5, cz - 2.5, [
      { at: 6.0, width: 2.4, sill: 1.1, top: 2.8 },
      { at: 14.5, width: 2.2 },
      { at: 19.0, width: 2.0, sill: 1.1, top: 2.8 },
    ], 8.4);
    realisticWindow(w3, cx - 10.0, 1.1, cz - 2.5, 2.4, 1.7, "x", "wood");
    realisticDoorFrame(w3, cx - 1.5, 0, cz - 2.5, 2.2, 2.55, "x", "wood");
    realisticWindow(w3, cx + 3.0, 1.1, cz - 2.5, 2.0, 1.7, "x", "wood");

    const adminSign = shopSign(cx - 1.5, 8.4 + 3.35, cz - 2.15, Math.PI, "مكتب الإدارة الرئيسي — EXECUTIVE DIRECTOR");
    adminSign.userData.noHit = true;
    scene.add(adminSign);

    w3.push("woodFloor", new THREE.BoxGeometry(21.1, 0.045, 10.1), mat4(cx - 5.2, 0.03, cz - 7.7));
    // المكتب الرئاسي الفاخر لمدير مؤسسة كيبريس في صدر القاعة
    desk(w3, cx - 1.5, cz - 9.8, Math.PI, true);
    officeChair(w3, cx - 1.5, cz - 8.4, 0);
    microscope(w3, cx - 0.3, 0.85, cz - 9.8);
    bookshelfFull(w3, cx - 6.2, cz - 12.1, 0, 3.2, 504);
    bookshelfFull(w3, cx + 2.8, cz - 12.1, 0, 2.8, 505);
    // جناح الضيافة التنفيذي في مكتب الإدارة الرئيسي
    sofa(w3, cx - 11.2, cz - 9.6, 0, 2.4);
    sofa(w3, cx - 11.2, cz - 5.6, Math.PI, 2.4);
    coffeeTable(w3, cx - 11.2, cz - 7.6, 0);
    cabinet(w3, cx - 14.8, cz - 11.2, Math.PI / 2, "wood2");
    wallPicture(w3, cx - 11.2, 1.8, cz - 12.6, 2.4, 1.3, "x", "art");
    wallPicture(w3, cx + 5.1, 1.8, cz - 7.5, 2.2, 1.2, "z", "map");

    // خزانة حفظ التقدم في مكتب الإدارة الرئيسي بالطابق الثالث
    addBox(ctx, "metal", cx - 14.8, 8.4, cz - 4.2, 0.85, 2.2, 1.1);
    ctx.interactables.push({
      id: "complex_safe",
      kind: "checkpoint",
      x: cx - 14.8,
      z: cz - 4.2,
      y: 9.4,
      radius: 2.2,
      prompt: "خزانة الإدارة العليا — حفظ التقدم",
      used: false,
    });

    // 2. قاعة اجتماعات مجلس الإدارة ومكاتب المستشارين (Executive Boardroom — جنوب غرب الطابق الثالث)
    wallWithGaps(ctx, "concrete", cx - 2.5, cz - 2.5, cx - 2.5, cz + CD / 2, [
      { at: 4.5, width: 2.2, sill: 1.1, top: 2.8 },
      { at: 11.5, width: 1.8 },
    ], 8.4);
    realisticWindow(w3, cx - 2.5, 1.1, cz + 2.0, 2.2, 1.7, "z", "wood");
    realisticDoorFrame(w3, cx - 2.5, 0, cz + 9.0, 1.8, 2.5, "z", "wood");
    w3.push("woodFloor", new THREE.BoxGeometry(13.1, 0.045, 15.1), mat4(cx - 9.2, 0.03, cz + 5.2));
    diningTable(w3, cx - 9.5, cz + 2.2, Math.PI / 2);
    diningTable(w3, cx - 9.5, cz + 4.2, Math.PI / 2);
    desk(w3, cx - 12.8, cz + 9.8, Math.PI, true);
    officeChair(w3, cx - 12.8, cz + 11.1, 0);
    desk(w3, cx - 6.8, cz + 9.8, Math.PI, true);
    officeChair(w3, cx - 6.8, cz + 11.1, 0);
    bookshelfFull(w3, cx - 14.8, cz + 3.2, Math.PI / 2, 3.0, 506);

    // 3. غرفة خوادم القيادة العليا (Executive Core Server Vault — الجناح الشرقي للطابق الثالث)
    wallWithGaps(ctx, "concrete", cx + 5.5, cz - CD / 2, cx + 5.5, cz + CD / 2, [
      { at: 6.0, width: 2.2, sill: 1.1, top: 2.8 },
      { at: 12.2, width: 1.8 },
      { at: 19.5, width: 2.2, sill: 1.1, top: 2.8 },
    ], 8.4);
    realisticWindow(w3, cx + 5.5, 1.1, cz - 7.0, 2.2, 1.7, "z", "metal");
    realisticDoorFrame(w3, cx + 5.5, 0, cz - 0.8, 1.8, 2.5, "z", "metal");
    realisticWindow(w3, cx + 5.5, 1.1, cz + 6.5, 2.2, 1.7, "z", "metal");
    w3.push("labFloor", new THREE.BoxGeometry(10.1, 0.045, 25.4), mat4(cx + 10.7, 0.03, cz));
    for (const sz of [cz - 9.5, cz - 5.5, cz + 4.5, cz + 8.5]) {
      serverRack(w3, cx + 14.4, sz, -Math.PI / 2);
      serverRack(w3, cx + 7.4, sz, Math.PI / 2);
    }
    bioIncubator(w3, cx + 10.8, cz - 8.5);
    controlPanel(w3, cx + 10.8, cz + 11.2, Math.PI);

    // إضاءة الطوابق الثلاثة في المجمع وآثار الصراع
    emergencyLight(ctx, cx + 8, 3.8, cz, 0xc22a1e);
    emergencyLight(ctx, cx, 4.2 + 3.8, cz - 3, 0xd0a860);
    emergencyLight(ctx, cx - 1.5, 8.4 + 3.8, cz - 6, 0x2fae4e);
    fluoro(ctx, cx + 8.5, cz + 3.5, 0xd0a860, 1.15, 14, 9, 0);
    fluoro(ctx, cx - 10.2, cz + 3.5, 0xd8e8d0, 1.05, 12, 11, 0);
    fluoro(ctx, cx - 10.2, cz - 5.5, 0xd0a860, 1.1, 13, 10, 4.2);
    fluoro(ctx, cx + 10.8, cz, 0x70e090, 1.2, 14, 14, 4.2);
    fluoro(ctx, cx - 4.5, cz - 7.5, 0xd0a860, 1.25, 14, 8, 8.4);
    fluoro(ctx, cx + 10.8, cz - 2.0, 0x70e090, 1.1, 13, 12, 8.4);

    coveredBody(w, cx + 4.5, cz + 5.5, 0.8);
    bloodDecal(ctx, cx + 4.5, cz + 5.0, 2.1, 0);
    bloodDecal(ctx, cx - 9.5, cz + 2.0, 1.8, 4.2);
    bloodDecal(ctx, cx - 3.5, cz - 7.5, 2.0, 8.4);

    // الالتقاطات الموزعة عبر طوابق المجمع الثلاثة (مكاتب، خوادم، ومكتب الإدارة الرئيسي في الأعلى)
    pickupProp(ctx, "metro_ammo", "item", cx + 9.2, cz + 5.2, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 14 }, 0.88);
    pickupProp(ctx, "metro_stick", "item", cx - 8.2, cz + 9.2, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "complex_f1_bat", "item", cx + 10.2, cz - 11.4, "التقاط بطارية من غرفة الخوادم", { item: "battery", qty: 1 }, 0.92);
    pickupProp(ctx, "complex_f2_ammo", "item", cx - 12.5, cz - 9.2, "التقاط ذخيرة مسدس من المكاتب", { item: "pistol_ammo", qty: 16 }, 4.2 + 0.88);
    pickupProp(ctx, "complex_f2_band", "item", cx - 7.8, cz + 8.0, "التقاط ضمادتين", { item: "bandage", qty: 2 }, 4.2 + 0.55);
    pickupProp(ctx, "complex_f2_shells", "item", cx + 10.8, cz, "التقاط خرطوش من قاعة الخوادم", { item: "shotgun_ammo", qty: 6 }, 4.2 + 0.92);
    noteProp(ctx, "complex_admin_doc", "doc_1", cx - 1.5, cz - 9.8, 8.4 + 0.82);
    pickupProp(ctx, "complex_f3_med", "item", cx - 11.2, cz - 7.6, "التقاط علبة إسعاف من مكتب الإدارة الرئيسي", { item: "medkit", qty: 1 }, 8.4 + 0.55);
    pickupProp(ctx, "complex_f3_shells", "item", cx - 2.6, cz - 9.8, "التقاط خرطوش من مكتب الإدارة الرئيسي", { item: "shotgun_ammo", qty: 8 }, 8.4 + 0.88);
    pickupProp(ctx, "complex_f3_bat", "item", cx + 10.8, cz + 11.0, "التقاط بطارية من خوادم الإدارة العليا", { item: "battery", qty: 1 }, 8.4 + 0.92);

    // أبواب المجمع عبر الطوابق الثلاثة
    addDoorAt(ctx, "door_complex_east", cx + CW / 2, cz, "z", 2.6, "double", 0);
    addDoorAt(ctx, "door_complex_south", cx, cz + CD / 2, "x", 2.6, "double", 0);
    addDoorAt(ctx, "door_complex_f1_offices", cx - 4.5, cz + 6.0, "z", 1.8, "wood", 0);
    addDoorAt(ctx, "door_complex_f1_servers", cx + 10.0, cz - 4.5, "x", 1.8, "metal", 0);
    addDoorAt(ctx, "door_complex_f2_office_n", cx - 4.5, cz - 6.5, "z", 1.8, "wood", 4.2);
    addDoorAt(ctx, "door_complex_f2_office_s", cx - 4.5, cz + 6.5, "z", 1.8, "wood", 4.2);
    addDoorAt(ctx, "door_complex_f2_server_n", cx + 5.5, cz - 6.5, "z", 1.8, "metal", 4.2);
    addDoorAt(ctx, "door_complex_f2_server_s", cx + 5.5, cz + 6.5, "z", 1.8, "metal", 4.2);
    addDoorAt(ctx, "door_complex_f2_sec", cx + 0.5, cz - 5.5, "x", 1.8, "metal", 4.2);
    addDoorAt(ctx, "door_complex_admin", cx - 1.5, cz - 2.5, "x", 2.2, "double", 8.4);
    addDoorAt(ctx, "door_complex_f3_board", cx - 2.5, cz + 9.0, "z", 1.8, "wood", 8.4);
    addDoorAt(ctx, "door_complex_f3_servers", cx + 5.5, cz - 0.8, "z", 1.8, "metal", 8.4);

    ctx.buildings.push({ x: cx, z: cz, w: CW, d: CD, name: "مجمع كيبريس — المختبر", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx + 6, z: cz + 4, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx - 10, z: cz + 4, wander: 4 });
    ctx.spawns.push({ kind: "runner", x: cx + 20, z: cz - 6, wander: 7 });
    ctx.spawns.push({ kind: "spitter", x: cx + 4, z: cz + 18, wander: 8 });
    ctx.triggers.push({ id: "trig_metro", x: cx + 18, z: cz, radius: 16, once: true });
  }

  // ═══════════ ميناء بلاك ووتر (7) — الجنوب على النهر ═══════════
  const gateX = 0, gateZ = 100;
  {
    // رصيف الميناء الخشبي-الإسمنتي على ضفة النهر (يمتد حتى حافة الضفة z = 118)
    const dock = new THREE.Mesh(new THREE.PlaneGeometry(200, 24), mats.concrete);
    dock.rotation.x = -Math.PI / 2;
    dock.position.set(0, 0.02, 106);
    dock.userData.alwaysVisible = true;
    dock.userData.noHit = true;
    scene.add(dock);

    // مياه نهر بلاك ووتر — تبدأ مباشرة من حافة الرصيف (z = 117.5) وتمتد جنوباً
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 96),
      new THREE.MeshStandardMaterial({ color: 0x09161d, roughness: 0.16, metalness: 0.72 }),
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -0.35, 165);
    river.userData.alwaysVisible = true;
    river.userData.noHit = true;
    scene.add(river);

    // حاجز الرصيف البحري على طول الضفة (z = 118) مع فتحة ممر صعود القارب عند x = 0.4..4.6
    addBox(ctx, "concrete", -60, 0, 118, 120.8, 1.35, 1.2);
    addBox(ctx, "concrete", 62.3, 0, 118, 115.4, 1.35, 1.2);
    // أعمدة ربط السفن (Bollards) على طول الرصيف وعند مدخل الجسر
    for (let mx = -80; mx <= 80; mx += 16) {
      if (Math.abs(mx - 2.5) < 4) continue;
      w.push("metal", new THREE.CylinderGeometry(0.18, 0.22, 0.75, 8), mat4(mx, 0.38, 116.8));
    }
    addBox(ctx, "concrete", 0.0, 0, 118, 0.7, 1.6, 1.4);
    addBox(ctx, "concrete", 5.0, 0, 118, 0.7, 1.6, 1.4);
    w.push("screenGlow", new THREE.SphereGeometry(0.14, 8, 8), mat4(0.0, 1.72, 118));
    w.push("screenGlow", new THREE.SphereGeometry(0.14, 8, 8), mat4(5.0, 1.72, 118));

    // بوابة الميناء الشمالية + المولد الكهربائي
    const barrierGrp = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1, 3.4, 0.8), mats.metal);
    b1.position.set(-5, 1.7, 0);
    const b2 = b1.clone();
    b2.position.x = 5;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.4, 0.3), mats.metal);
    bar.position.y = 2.4;
    barrierGrp.add(b1, b2, bar);
    barrierGrp.position.set(gateX, 0, gateZ);
    scene.add(barrierGrp);
    barrierRef = barrierGrp;
    ctx.colliders.push({ minX: gateX - 6, maxX: gateX + 6, minZ: gateZ - 0.6, maxZ: gateZ + 0.6 });
    controlPanel(w, gateX - 8, gateZ + 3, 0);
    ctx.interactables.push({ id: "gate_gen", kind: "generator", x: gateX - 8, z: gateZ + 4.0, radius: 2.4, prompt: "تشغيل المولد", used: false });

    // ── ممر الصعود الخشبي-الفولاذي (Boarding Gangway) من حافة الرصيف (z=117.4) إلى القارب (z=123.2) ──
    const gangwayX = 2.5;
    w.push("wood2", new THREE.BoxGeometry(2.8, 0.10, 6.2), mat4(gangwayX, 0.18, 120.3, { rx: -0.05 }));
    for (let i = 0; i < 11; i++) {
      const gz = 117.6 + i * 0.54;
      const gy = 0.05 + (i / 10) * 0.27;
      w.push("woodFloor", new THREE.BoxGeometry(2.65, 0.04, 0.42), mat4(gangwayX, gy, gz));
    }
    // درابزين ممر الصعود على الجانبين لمنع السقوط في النهر
    railingSection(w, gangwayX - 1.38, 117.5, gangwayX - 1.38, 123.2, "metal", true);
    railingSection(w, gangwayX + 1.38, 117.5, gangwayX + 1.38, 123.2, "metal", true);
    ctx.stairs.push({
      minX: gangwayX - 1.35,
      maxX: gangwayX + 1.35,
      minZ: 117.2,
      maxZ: 123.2,
      yBottom: 0,
      yTop: 0.32,
      dir: "+z",
    });
    // بلاطة سطح القارب القابلة للمشي عليها (يستقر عليها اللاعب والناجون عند الصعود)
    ctx.floors.push({
      minX: -4.2,
      maxX: 9.2,
      minZ: 122.8,
      maxZ: 128.0,
      y: 0.32,
    });
    // حواجز غير مرئية تحيط بسطح القارب لمنع السقوط في الماء بعد الصعود
    ctx.colliders.push({ minX: -4.4, maxX: 9.4, minZ: 127.9, maxZ: 128.3, minY: 0, maxY: 3 });
    ctx.colliders.push({ minX: -4.4, maxX: -4.0, minZ: 122.8, maxZ: 128.2, minY: 0, maxY: 3 });
    ctx.colliders.push({ minX: 9.0, maxX: 9.4, minZ: 122.8, maxZ: 128.2, minY: 0, maxY: 3 });
    ctx.colliders.push({ minX: -4.4, maxX: gangwayX - 1.4, minZ: 122.7, maxZ: 123.1, minY: 0, maxY: 3 });
    ctx.colliders.push({ minX: gangwayX + 1.4, maxX: 9.4, minZ: 122.7, maxZ: 123.1, minY: 0, maxY: 3 });

    // ── قارب الإخلاء البحري المتقن (يرسو في مياه النهر خارج الرصيف عند x=2.5, z=125.5) ──
    const boat = new THREE.Group();
    const hullDark = new THREE.MeshStandardMaterial({ color: 0x1b2631, roughness: 0.45, metalness: 0.65 });
    const hullRed = new THREE.MeshStandardMaterial({ color: 0x781e18, roughness: 0.6, metalness: 0.35 });
    const deckWood = new THREE.MeshStandardMaterial({ color: 0x4e3b28, roughness: 0.82 });
    const cabinWhite = new THREE.MeshStandardMaterial({ color: 0xd0d6d8, roughness: 0.4, metalness: 0.25 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xb8c2c8, roughness: 0.25, metalness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88b8d0,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.48,
    });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.9 });
    const glowGreen = new THREE.MeshStandardMaterial({ color: 0x103820, emissive: 0x2fae4e, emissiveIntensity: 1.8 });
    const glowAmber = new THREE.MeshStandardMaterial({ color: 0x382410, emissive: 0xe8a030, emissiveIntensity: 1.8 });

    // 1) الغاطس المائي والبدن الرئيسي الفولاذي (Hull & Waterline)
    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.65, 4.8), hullRed);
    lowerHull.position.set(0, -0.18, 0);
    const mainHull = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.85, 5.2), hullDark);
    mainHull.position.set(0, 0.42, 0);
    // مقدمة السفينة المدببة (V-Shaped Bow Prow باتجاه الشرق +X)
    const bowGeo = new THREE.ConeGeometry(3.68, 3.8, 4);
    bowGeo.rotateZ(-Math.PI / 2);
    bowGeo.rotateX(Math.PI / 4);
    const bowMesh = new THREE.Mesh(bowGeo, hullDark);
    bowMesh.scale.set(1, 0.34, 1);
    bowMesh.position.set(8.2, 0.35, 0);
    // سطح السفينة الخشبي الرئيسي (Main Deck عند y = 0.32)
    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.08, 4.9), deckWood);
    deckMesh.position.set(0, 0.82, 0);
    boat.add(lowerHull, mainHull, bowMesh, deckMesh);

    // 2) الحواف الجانبية (Gunwales) وإطارات الحماية المطاطية (Fenders) على جانبي القارب
    const gunwaleBack = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.42, 0.18), hullDark);
    gunwaleBack.position.set(0, 1.04, 2.52);
    const gunwaleStern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 5.2), hullDark);
    gunwaleStern.position.set(-6.7, 1.04, 0);
    // الجدار الأمامي باتجاه الرصيف مع فتحة صعود واسعة في المنتصف
    const gunwaleFrontL = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.42, 0.18), hullDark);
    gunwaleFrontL.position.set(-4.7, 1.04, -2.52);
    const gunwaleFrontR = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.42, 0.18), hullDark);
    gunwaleFrontR.position.set(4.2, 1.04, -2.52);
    boat.add(gunwaleBack, gunwaleStern, gunwaleFrontL, gunwaleFrontR);

    for (let fx = -5.2; fx <= 5.2; fx += 2.6) {
      for (const fz of [-2.65, 2.65]) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.11, 8, 14), rubberMat);
        tire.position.set(fx, 0.55, fz);
        boat.add(tire);
      }
    }

    // 3) درابزين الكروم البحري حول السطح
    const railTopBack = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 13.2, 8), chromeMat);
    railTopBack.rotation.z = Math.PI / 2;
    railTopBack.position.set(0, 1.62, 2.50);
    boat.add(railTopBack);
    for (let rx = -6.4; rx <= 6.4; rx += 1.6) {
      const postB = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), chromeMat);
      postB.position.set(rx, 1.32, 2.50);
      boat.add(postB);
      if (rx < -1.8 || rx > 1.8) {
        const postF = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), chromeMat);
        postF.position.set(rx, 1.32, -2.50);
        boat.add(postF);
      }
    }

    // 4) مقصورة القيادة البحرية (Pilot Wheelhouse Cabin) في القسم الغربي من القارب
    const cabinBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.25, 3.6), cabinWhite);
    cabinBase.position.set(-3.2, 1.45, 0);
    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 3.9), cabinWhite);
    cabinRoof.position.set(-3.1, 2.92, 0);
    // أعمدة المقصورة والزجاج الأمامي والجانبي الشفاف
    for (const [cx2, cz2] of [[-5.2, -1.7], [-1.2, -1.7], [-5.2, 1.7], [-1.2, 1.7]] as const) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.16), cabinWhite);
      pillar.position.set(cx2, 2.45, cz2);
      boat.add(pillar);
    }
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 3.3), glassMat);
    windshield.position.set(-1.12, 2.45, 0);
    const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.82, 0.06), glassMat);
    sideGlassL.position.set(-3.2, 2.45, -1.72);
    const sideGlassR = sideGlassL.clone();
    sideGlassR.position.z = 1.72;
    // لوحة قيادة ورادار مضيء داخل المقصورة
    const helmConsole = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 1.8), hullDark);
    helmConsole.position.set(-1.65, 2.05, 0);
    const radarScreen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.55), glowGreen);
    radarScreen.position.set(-1.98, 2.25, -0.35);
    const sonarScreen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.45), glowAmber);
    sonarScreen.position.set(-1.98, 2.25, 0.35);
    boat.add(cabinBase, cabinRoof, windshield, sideGlassL, sideGlassR, helmConsole, radarScreen, sonarScreen);

    // 5) برج الرادار والهوائيات وكشاف البحث البحري فوق سطح المقصورة
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.6, 8), chromeMat);
    mast.position.set(-3.0, 3.75, 0);
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 1.35), cabinWhite);
    radarBar.position.set(-3.0, 4.55, 0);
    const searchLight = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.35, 10), chromeMat);
    searchLight.rotation.z = Math.PI / 2;
    searchLight.position.set(-0.95, 3.12, 0);
    const searchLens = new THREE.Mesh(new THREE.CircleGeometry(0.20, 10), glowAmber);
    searchLens.rotation.y = Math.PI / 2;
    searchLens.position.set(-0.76, 3.12, 0);
    boat.add(mast, radarBar, searchLight, searchLens);

    // 6) أطواق النجاة ومقاعد الناجين على سطح القارب والمحركات الخلفية المزدوجة
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0xd9381e, roughness: 0.5 });
    for (const bz of [-1.83, 1.83]) {
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.075, 8, 16), buoyMat);
      buoy.position.set(-3.2, 1.55, bz);
      boat.add(buoy);
    }
    // مقاعد خشبية على سطح القارب يجلس/يقف بجانبها الناجون الذين أنقذهم اللاعب
    const benchPort = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.38, 0.55), deckWood);
    benchPort.position.set(2.8, 1.02, 1.95);
    const benchBow = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 2.8), deckWood);
    benchBow.position.set(5.8, 1.02, 0);
    // محركان بحريان خلفيان (Twin Outboard Engines)
    for (const ez of [-1.1, 1.1]) {
      const engineBox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.62), hullDark);
      engineBox.position.set(-7.15, 0.85, ez);
      boat.add(engineBox);
    }
    boat.add(benchPort, benchBow);

    boat.position.set(gangwayX, -0.50, 125.5);
    boat.userData.alwaysVisible = true;
    boat.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData.noHit = true;
    });
    scene.add(boat);
    boatRef = boat;

    const boatLight = new THREE.PointLight(0xe8f0d8, 0.8, 28, 1.5);
    boatLight.position.set(gangwayX, 4.2, 124.5);
    scene.add(boatLight);
    boatLightRef = boatLight;
    ctx.interactables.push({
      id: "extraction",
      kind: "exit",
      x: gangwayX,
      z: 124.2,
      y: 1.32,
      radius: 3.8,
      prompt: "الصعود إلى قارب الإخلاء والنجاة",
      used: false,
    });
    // حاويات شحن انتظرت إخلاءً لم يأتِ
    const contColors = ["carA", "carB", "greenMetal", "carC"];
    for (let i = 0; i < 8; i++) {
      const cxx = -30 + rnd() * 60;
      const czz = 104 + rnd() * 8;
      const cw = 2 + rnd() * 2;
      const chh = 1.6 + rnd() * 1.8;
      addBox(ctx, contColors[Math.floor(rnd() * contColors.length)], cxx, 0, czz, cw, chh, cw);
      if (rnd() < 0.4) addBox(ctx, contColors[Math.floor(rnd() * contColors.length)], cxx + 0.2, chh, czz + 0.1, cw * 0.9, chh * 0.8, cw * 0.9, false);
    }
    // تحصينات عسكرية
    sandbagWall(w, gateX - 9, gateZ - 1, 0.15, 3.6);
    sandbagWall(w, gateX + 9.5, gateZ - 0.6, -0.1, 3.2);
    barrier(w, gateX - 16, gateZ + 1, 0.1);
    barrier(w, gateX + 17, gateZ + 1.2, -0.15);
    car(w, 12, 106, 0.35, "truck", rnd());
    pickupProp(ctx, "harbor_ammo", "item", gateX - 14, gateZ + 4, "التقاط خرطوش", { item: "shotgun_ammo", qty: 6 }, 0.14);
    pickupProp(ctx, "harbor_stick", "item", gateX + 6.5, gateZ + 5.0, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "harbor_med", "item", gateX + 16, gateZ + 2, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.14);
    emergencyLight(ctx, gateX, 4, gateZ - 6, 0x2fae4e);
    coveredBody(w, gateX - 5, gateZ - 6, 1.2);
    bloodDecal(ctx, gateX + 2, gateZ - 5, 2.2);
    ctx.buildings.push({ x: gateX, z: gateZ + 8, w: 60, d: 16, name: "ميناء بلاك ووتر", poi: true });
    ctx.triggers.push({ id: "trig_harbor", x: gateX, z: gateZ, radius: 26, once: true });

    // محطة النهر — كوخ صغير بأبواب ونوافذ حقيقية على الرصيف
    const hx = 20, hz = 97;
    roomFloor(ctx, hx, hz, 10, 8);
    w.push("woodFloor", new THREE.BoxGeometry(9.6, 0.04, 7.6), mat4(hx, 0.06, hz));
    roomRoof(ctx, hx, hz, 10, 8);
    buildingExteriorTrim(w, hx, hz, 10, 8, 4.2, "brick");
    wallWithGaps(ctx, "brick", hx - 5, hz - 4, hx + 5, hz - 4, [{ at: 5, width: 1.8, sill: 1.1, top: 2.8 }]);
    realisticWindow(w, hx, 1.1, hz - 4, 1.8, 1.7, "x", "wood");
    wallWithGaps(ctx, "brick", hx - 5, hz + 4, hx + 5, hz + 4, [{ at: 5, width: 1.5 }]);
    realisticDoorFrame(w, hx, 0, hz + 4, 1.5, 2.4, "x", "wood");
    wallWithGaps(ctx, "brick", hx - 5, hz - 4, hx - 5, hz + 4);
    wallWithGaps(ctx, "brick", hx + 5, hz - 4, hx + 5, hz + 4, [{ at: 4, width: 1.6, sill: 1.1, top: 2.8 }]);
    realisticWindow(w, hx + 5, 1.1, hz, 1.6, 1.7, "z", "wood");
    counter(w, hx + 3, hz - 2, -Math.PI / 2, 2);
    shelfStocked(w, hx - 4.2, hz + 1, Math.PI / 2, 2.2, true);
    vending(w, hx + 4.2, hz + 3, Math.PI);
    corpse(ctx, hx - 1, hz - 2);
    fluoro(ctx, hx, hz, 0xd0a860, 1, 10, 5);
    pickupProp(ctx, "river_food", "item", hx - 4, hz + 1.2, "التقاط طعام معلب", { item: "food", qty: 2 }, 0.95);
    pickupProp(ctx, "river_ammo", "item", hx + 3, hz - 1.4, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 10 }, 0.14);
    addDoorAt(ctx, "door_riverstation", hx, hz + 4, "x", 1.5, "wood");
    ctx.buildings.push({ x: hx, z: hz, w: 10, d: 8, name: "محطة النهر" });
    ctx.spawns.push({ kind: "walker", x: hx - 6, z: hz + 2, wander: 5 });
  }

  // ── مقبرة المدينة الغربية — على طريق المختبر ──
  {
    const gx = -106, gz = 18;
    w.push("sidewalk", new THREE.BoxGeometry(15, 0.1, 50), mat4(gx, 0.05, gz));
    // سور حجري منخفض بفتحة شرقية
    addBox(ctx, "concrete", gx, 0, gz - 25, 15.4, 1.2, 0.4);
    addBox(ctx, "concrete", gx, 0, gz + 25, 15.4, 1.2, 0.4);
    addBox(ctx, "concrete", gx - 7.6, 0, gz, 0.4, 1.2, 50);
    addBox(ctx, "concrete", gx + 7.6, 0, gz - 16, 0.4, 1.2, 17.5);
    addBox(ctx, "concrete", gx + 7.6, 0, gz + 16, 0.4, 1.2, 17.5);
    // صفوف القبور: شواهد وصلبان، بعضها مائل
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 6; col++) {
        const gx2 = gx - 5.5 + col * 2.2;
        const gz2 = gz - 20 + row * 2.9 + (col % 2) * 0.4;
        if ((row * 6 + col) % 11 === 0) continue; // قبر فارغ
        const topple = (row * 6 + col) % 7 === 0;
        w.push("concrete", new THREE.BoxGeometry(0.55, 0.85, 0.12), mat4(gx2, topple ? 0.2 : 0.42, gz2, { ry: (rnd() - 0.5) * 0.2, rz: topple ? 1.35 : 0 }));
        if ((row + col) % 3 === 0) {
          w.push("concrete", new THREE.BoxGeometry(0.12, 0.5, 0.12), mat4(gx2, 1.05, gz2));
          w.push("concrete", new THREE.BoxGeometry(0.4, 0.1, 0.1), mat4(gx2, 1.15, gz2));
        }
      }
    }
    deadTree(w, gx - 5, gz - 22);
    deadTree(w, gx + 5, gz + 8);
    deadTree(w, gx, gz + 22);
    corpse(ctx, gx + 3, gz - 10);
    bloodDecal(ctx, gx - 2, gz + 4, 1.6);
    addFlickerLight(ctx, gx + 6, 3.2, gz, 0xe8a850, 0.8, 12, 1.1);
    lampPost(w, gx + 6.6, gz, -Math.PI / 2, true);
    ctx.spawns.push({ kind: "walker", x: gx, z: gz + 12, wander: 7 });
    ctx.spawns.push({ kind: "walker", x: gx - 3, z: gz - 14, wander: 6 });
  }

  // ═══════════ المختبر تحت الأرض (x=600) — تصميم هندسي منظم من 3 قطاعات متصلة ═══════════
  const LX = 600, LZ = 0;
  const labBossGate = { mesh: null as unknown as THREE.Mesh, colliderId: "lab_arena_gate" };
  let corePos = new THREE.Vector3(LX, 1, LZ - 31);
  {
    const cx = LX, cz = LZ;

    // ── القطاع 1: ردهة الاستقبال وممر الخوادم والأبحاث الحيوية (z = +23 إلى z = -8، عرض 12م) ──
    roomFloor(ctx, cx, cz + 7.5, 12, 31, "labFloor");
    roomRoof(ctx, cx, cz + 7.5, 12, 31, "labRoof", 4.4);
    // الجدار الجنوبي عند المصعد (z = +23) + الجداران الجانبيان للممر (x = cx ± 6)
    wallWithGaps(ctx, "metal", cx - 6, cz + 23, cx + 6, cz + 23);
    wallWithGaps(ctx, "metal", cx - 6, cz - 8, cx - 6, cz + 23);
    wallWithGaps(ctx, "metal", cx + 6, cz - 8, cx + 6, cz + 23);
    elevatorDoors(w, cx, 0, cz + 22.75, "x");

    // محطة أرشيف د. جون على يسار المدخل (حيث توجد الوثيقة النهائية doc_6 فوق المكتب بوضوح)
    desk(w, cx - 3.6, cz + 19.5, 0, true);
    officeChair(w, cx - 3.6, cz + 18.2, Math.PI);
    bookshelfFull(w, cx - 5.4, cz + 19.5, Math.PI / 2, 2.2, 606);
    // محطة إسعاف أولي على يمين المدخل
    desk(w, cx + 3.6, cz + 19.5, 0, false);
    defibrillatorCart(w, cx + 5.0, cz + 19.5, -Math.PI / 2);

    // صفوف منظمة من خزائن الخوادم وكبسولات الحجر البيولوجي على جانبي الممر (مع ممر مركزي واسع 7م)
    for (let i = 0; i < 4; i++) {
      const sz = cz + 13.5 - i * 5.2;
      serverRack(w, cx - 5.1, sz, Math.PI / 2);
      serverRack(w, cx + 5.1, sz, -Math.PI / 2);
      if (i % 2 === 1) {
        bioIncubator(w, cx - 4.8, sz - 2.4);
        bioIncubator(w, cx + 4.8, sz - 2.4);
      }
      if (i % 2 === 0) {
        addFlickerLight(ctx, cx, 3.8, sz, 0x38b868, 1.1, 12, 4 + i);
      }
    }
    wallPipes(w, cx + 5.6, 3.4, cz + 6, Math.PI / 2, 16);
    wallPipes(w, cx - 5.6, 3.4, cz + 6, -Math.PI / 2, 16);
    realisticDoorFrame(w, cx, 0, cz - 8, 6.4, 3.8, "x", "metal");

    // بوابة ساحة الحارس الأوتوماتيكية عند z = -8
    const gateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 3.8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2c3033, metalness: 0.7, roughness: 0.5 }),
    );
    gateMesh.position.set(cx, 1.9, cz - 8);
    gateMesh.visible = false;
    scene.add(gateMesh);
    labBossGate.mesh = gateMesh;

    // ── القطاع 2: قاعة الاحتواء الكبرى — ساحة الحارس (z = -8 إلى z = -24، عرض 22م) ──
    roomFloor(ctx, cx, cz - 16, 22, 16, "labFloor");
    roomRoof(ctx, cx, cz - 16, 22, 16, "labRoof", 4.6);
    // جدران ربط الممر بالساحة عند z = -8
    wallWithGaps(ctx, "metal", cx - 11, cz - 8, cx - 6, cz - 8);
    wallWithGaps(ctx, "metal", cx + 6, cz - 8, cx + 11, cz - 8);
    // الجداران الجانبيان للساحة (x = cx ± 11)
    wallWithGaps(ctx, "metal", cx - 11, cz - 24, cx - 11, cz - 8);
    wallWithGaps(ctx, "metal", cx + 11, cz - 24, cx + 11, cz - 8);
    // الجدار الفاصل عند z = -24 مع بوابة مركزية عريضة مفتوحة (عرضها 6.4م) تؤدي مباشرة إلى قاعة النواة!
    wallWithGaps(ctx, "metal", cx - 11, cz - 24, cx + 11, cz - 24, [{ at: 11, width: 6.4 }]);
    realisticDoorFrame(w, cx, 0, cz - 24, 6.4, 3.8, "x", "metal");

    // أربعة أعمدة احتواء متناظرة داخل الساحة للتغطية التكتيكية أثناء قتال الزعيم
    for (const [ox, oz] of [[-5.5, -12], [5.5, -12], [-5.5, -20], [5.5, -20]] as const) {
      addBox(ctx, "labMetal", cx + ox, 0, cz + oz, 1.2, 4.4, 1.2);
      w.push("hazard", new THREE.BoxGeometry(1.26, 0.25, 1.26), mat4(cx + ox, 0.2, cz + oz));
    }
    controlPanel(w, cx - 8.8, cz - 16, Math.PI / 2);
    controlPanel(w, cx + 8.8, cz - 16, -Math.PI / 2);
    emergencyLight(ctx, cx, 4.1, cz - 16, 0xc22a1e);

    // ── القطاع 3: قدس النواة — غرفة الذكاء الاصطناعي «كيميرا» (z = -24 إلى z = -37، عرض 16م) ──
    roomFloor(ctx, cx, cz - 30.5, 16, 13, "labFloor");
    roomRoof(ctx, cx, cz - 30.5, 16, 13, "labRoof", 4.8);
    wallWithGaps(ctx, "metal", cx - 8, cz - 37, cx + 8, cz - 37);
    wallWithGaps(ctx, "metal", cx - 8, cz - 37, cx - 8, cz - 24);
    wallWithGaps(ctx, "metal", cx + 8, cz - 37, cx + 8, cz - 24);

    // مصفوفة الحواسيب العملاقة المحيطة بالنواة
    for (const sz of [cz - 27.5, cz - 31.0, cz - 34.5]) {
      serverRack(w, cx - 6.8, sz, Math.PI / 2);
      serverRack(w, cx + 6.8, sz, -Math.PI / 2);
    }
    controlPanel(w, cx - 3.6, cz - 34.8, 0);
    controlPanel(w, cx + 3.6, cz - 34.8, 0);

    // منصة المفاعل المركزية ومجسم النواة النابض
    w.push("labMetal", new THREE.CylinderGeometry(2.6, 3.0, 0.24, 16), mat4(cx, 0.12, cz - 31));
    w.push("screenGlow", new THREE.TorusGeometry(2.4, 0.05, 8, 32), mat4(cx, 0.25, cz - 31, { rx: Math.PI / 2 }));
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 1),
      new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive: 0xff3020, emissiveIntensity: 1.6, roughness: 0.3 }),
    );
    core.position.set(cx, 1.85, cz - 31);
    core.userData.noHit = true;
    scene.add(core);
    addFlickerLight(ctx, cx, 2.4, cz - 31, 0xff3020, 3, 18, 3);
    corePos = new THREE.Vector3(cx, 1, cz - 31);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 8, 32), mats.metal);
    ring.position.set(cx, 1.85, cz - 31);
    ring.userData.noHit = true;
    scene.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.05, 8, 32), mats.metal);
    ring2.position.set(cx, 1.85, cz - 31);
    ring2.rotation.x = Math.PI / 3;
    ring2.userData.noHit = true;
    scene.add(ring2);

    ctx.interactables.push({ id: "core", kind: "core", x: cx, z: cz - 31, radius: 2.8, prompt: "النواة — كيميرا", used: false });
    noteProp(ctx, "lab_doc", "doc_6", cx - 3.6, cz + 19.5, 0.80);
    pickupProp(ctx, "lab_med", "item", cx + 3.6, cz + 19.5, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.80);
    pickupProp(ctx, "lab_stick", "item", cx + 3.8, cz + 15.0, "التقاط عصا خشبية", { weapon: "crowbar" }, 0.12);
    pickupProp(ctx, "lab_ammo", "item", cx - 8.2, cz - 16, "التقاط خرطوش", { item: "shotgun_ammo", qty: 8 }, 0.14);
    pickupProp(ctx, "lab_bat", "item", cx + 8.2, cz - 16, "التقاط بطارية", { item: "battery", qty: 1 }, 0.14);
    ctx.interactables.push({ id: "lab_exit", kind: "exit", x: cx, z: cz + 22, radius: 2.4, prompt: "الصعود إلى السطح", data: { labExit: true }, used: false });
    ctx.buildings.push({ x: cx, z: cz - 15, w: 22, d: 60, name: "المختبر — تحت الأرض", poi: true });
    ctx.spawns.push({ kind: "boss", x: cx, z: cz - 16, wander: 6 });
  }

  // ── دمج الهندسة الساكنة ──
  const propTextures = makePropTextures();
  const propMats = makePropMaterials(propTextures);
  // لهب/دخان (مواد شفافة مضيئة)
  propMats.fireCone = new THREE.MeshBasicMaterial({ color: 0xe86830, transparent: true, opacity: 0.82, depthWrite: false });
  propMats.fireCore = new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.9, depthWrite: false });
  propMats.smoke = new THREE.MeshStandardMaterial({ color: 0x141414, transparent: true, opacity: 0.35, roughness: 1 });
  propMats.cork = new THREE.MeshStandardMaterial({ color: 0x6a4e30, roughness: 0.95 });
  propMats.facadeTower = new THREE.MeshStandardMaterial({
    map: t.facade, emissiveMap: t.facadeEmissive, emissive: new THREE.Color(0x8aa0b8),
    emissiveIntensity: 0.55, color: new THREE.Color(0x9aa4ac), roughness: 0.6, metalness: 0.25,
  });
  propMats.facadeOld = new THREE.MeshStandardMaterial({
    map: t.brick, color: new THREE.Color(0xcbb9a2), roughness: 0.95,
  });

  const bucketMats: Record<string, THREE.Material> = {
    brick: mats.brick,
    concrete: mats.concrete,
    metal: mats.metal,
    wood: mats.wood,
    paper: mats.paper,
    rubble: mats.rubble,
    facade: mats.facade,
    dark: mats.dark,
    floorIn: new THREE.MeshStandardMaterial({ color: 0x2a2825, roughness: 0.9 }),
    roof: mats.concrete,
    labFloor: new THREE.MeshStandardMaterial({ color: 0x23282a, roughness: 0.6, metalness: 0.3 }),
    labRoof: mats.metal,
    labMetal: new THREE.MeshStandardMaterial({ color: 0x2e3438, roughness: 0.45, metalness: 0.7 }),
    ...propMats,
  };
  const chunks = mergePropBuckets(
    scene,
    ctx.staticGeos,
    bucketMats,
    new Set(["glassDark", "glassWindow", "paint", "water", "lampGlow", "floorIn", "roof", "labFloor", "fireCone", "fireCore", "smoke"]),
  );

  // جمع كافة الكائنات الموضعية في المشهد لإلغاء تحميلها خلف الضباب
  const managedSet = new Set<THREE.Object3D>(preChildren);
  for (const c of chunks) managedSet.add(c.group);
  for (const p of ctx.pickups) managedSet.add(p.obj);
  for (const d of ctx.doors) managedSet.add(d.def.group);
  if (labBossGate.mesh) managedSet.add(labBossGate.mesh);

  const cullables: { obj: THREE.Object3D; x: number; z: number; r: number }[] = [];
  for (const child of scene.children) {
    if (managedSet.has(child) || child.userData.alwaysVisible) continue;
    cullables.push({
      obj: child,
      x: child.position.x,
      z: child.position.z,
      r: 8,
    });
  }

  return {
    colliders: ctx.colliders,
    dynamicColliders: new Map<string, Collider>(),
    stairs: ctx.stairs,
    floors: ctx.floors,
    virtualLights: ctx.virtualLights,
    pois: ctx.buildings.filter((b) => b.poi).map((b) => ({ id: b.name!, x: b.x, z: b.z, name: b.name!, r: 16 })),
    spawns: ctx.spawns,
    interactables: ctx.interactables,
    triggers: ctx.triggers,
    buildings: ctx.buildings,
    roads: roadXs
      .flatMap((x) => [{ x, z: 0, w: 10, d: 240 }])
      .concat(roadZs.map((z) => ({ x: 0, z, w: 240, d: 10 }))),
    blockedRoads: ctx.blockedRoads,
    fireLights: ctx.fireLights,
    flickerLights: ctx.flickerLights,
    labBossGate,
    labDoor: { group: doorGroupRef!, open: false },
    corePedestal: corePos,
    gateBarrier: { group: barrierRef!, open: false },
    boat: boatRef!,
    boatLight: boatLightRef!,
    clockHands: clockHandsRef,
    pickups: ctx.pickups,
    doors: ctx.doors,
    survivors: ctx.survivors,
    chunks,
    cullables,
  };
}

// مرجع عرافات الساعة
const clockHandsRef: THREE.Object3D[] = [];

type CarVariantLike = "sedan" | "wreck" | "taxi" | "police" | "ambulance" | "van" | "truck";

function debrisPile(ctx: BuildCtx, x: number, z: number, w2: number, d: number) {
  // تحديد اتجاه الشارع تلقائياً ليمتد الحاجز الخرساني والركام عبر عرض الشارع بالكامل دون مكعبات طائرة
  const isHorizontalRoad = [0, 46, -46, 92, -92].includes(z) && ![0, 46, -46, 92, -92].includes(x);
  const ry = isHorizontalRoad ? Math.PI / 2 : 0;
  streetDebrisBarricade(propCtxOf(ctx), x, z, ry, x * 31 + z * 17);
  ctx.colliders.push({ minX: x - w2 / 2, maxX: x + w2 / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  ctx.blockedRoads.push({ x, z, w: w2 + 2, d: d + 2 });
}

function machineProp(ctx: BuildCtx, x: number, z: number, w2 = 2.4, h = 2.6, d = 1.8) {
  const p = propCtxOf(ctx);
  // آلة غسيل صناعية بيضاء بباب زجاجي دائري
  p.push("white", new THREE.BoxGeometry(1, 1, 1), mat4(x, h / 2, z, { sx: w2, sy: h, sz: d }));
  p.push("glassDark", new THREE.CylinderGeometry(Math.min(w2, d) * 0.3, Math.min(w2, d) * 0.3, 0.04, 14), mat4(x, h * 0.55, z + d / 2 + 0.01, { rx: Math.PI / 2 }));
  p.push("plastic", new THREE.BoxGeometry(w2 * 0.5, 0.15, 0.06), mat4(x, h * 0.85, z + d / 2 + 0.02));
  ctx.colliders.push({ minX: x - w2 / 2, maxX: x + w2 / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}

export function zoneAt(x: number, z: number): string {
  // المواقع وفق خريطة شادو هافن: المختبر شمال غرب، السكن شمال، الساحة بالمنتصف،
  // المستودع غرب، متجر الأسلحة جنوبها، البرج شمال شرق، المستشفى جنوب شرق،
  // المصنع جنوب غرب، الميناء جنوباً على النهر، المقبرة غرباً
  const pois: [number, number, string, number][] = [
    [-23, -69, "apartments", 16],
    [-23, 23, "gunshop", 12],
    [23, -23, "police", 16],
    [69, -69, "tower", 14],
    [69, 23, "hospital", 20],
    [-69, 69, "factory", 18],
    [-69, 23, "warehouse", 16],
    [69, 69, "gas", 14],
    [-69, -69, "metro", 28],
    [-23, -23, "plaza", 16],
    [-106, 18, "cemetery", 14],
    [600, -15, "lab", 40],
    [0, 104, "harbor", 30],
  ];
  for (const [px, pz, id, r] of pois) {
    if (Math.hypot(x - px, z - pz) < r) return ZONES[id] ?? id;
  }
  return ZONES.mainStreet;
}
