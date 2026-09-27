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
} from "./props";

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
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

export interface WorldData {
  colliders: Collider[];
  dynamicColliders: Map<string, Collider>;
  pois: Poi[];
  spawns: SpawnPoint[];
  interactables: Interactable[];
  triggers: Trigger[];
  buildings: { x: number; z: number; w: number; d: number; name?: string; poi?: boolean }[];
  roads: { x: number; z: number; w: number; d: number; blocked?: boolean }[];
  blockedRoads: { x: number; z: number; w: number; d: number }[];
  fireLights: { light: THREE.PointLight; base: number }[];
  flickerLights: { light: THREE.PointLight; base: number; speed: number }[];
  labBossGate: { mesh: THREE.Mesh; colliderId: string };
  labDoor: { group: THREE.Group; open: boolean };
  corePedestal: THREE.Vector3;
  gateBarrier: { group: THREE.Group; open: boolean };
  boat: THREE.Group;
  boatLight: THREE.PointLight;
  clockHands: THREE.Object3D[];
  pickups: { id: string; obj: THREE.Group }[];
  doors: WorldDoor[];
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
}

function pushStatic(ctx: BuildCtx, bucket: string, geo: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const g = geo.clone();
  g.applyMatrix4(matrix);
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
    });
  }
}

/** جدار مع فتحات للأبواب: gaps = [{at, width}] مواقع على طول الجدار */
function wallWithGaps(
  ctx: BuildCtx,
  bucket: string,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  gaps: { at: number; width: number }[] = [],
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
      addBox(ctx, bucket, sx, 0, cz, segLen, WALL_H, T);
    } else {
      const sz = z1 + (z2 > z1 ? mid : -mid);
      addBox(ctx, bucket, cx, 0, sz, T, WALL_H, segLen);
    }
  }
  for (const g of sorted) {
    const gapLen = g.width;
    const mid = g.at;
    if (horiz) {
      const sx = x1 + (x2 > x1 ? mid : -mid);
      addBox(ctx, bucket, sx, 2.6, cz, gapLen, WALL_H - 2.6, T, false);
    } else {
      const sz = z1 + (z2 > z1 ? mid : -mid);
      addBox(ctx, bucket, cx, 2.6, sz, T, WALL_H - 2.6, gapLen, false);
    }
  }
}

function roomFloor(ctx: BuildCtx, x: number, z: number, w: number, d: number, bucket = "floorIn") {
  addBox(ctx, bucket, x, 0.02, z, w, 0.06, d, false);
}

function roomRoof(ctx: BuildCtx, x: number, z: number, w: number, d: number, bucket = "roof") {
  addBox(ctx, bucket, x, WALL_H, z, w, 0.35, d, false);
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
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  ctx.scene.add(l);
  ctx.flickerLights.push({ light: l, base: intensity, speed });
  return l;
}

/** مصباح فلورسنت سقفي — هيئة + ضوء */
function fluoro(ctx: BuildCtx, x: number, z: number, color = 0xd0a860, intensity = 1.1, dist = 12, speed = 7) {
  const p = propCtxOf(ctx);
  p.push("white", new THREE.BoxGeometry(1.3, 0.07, 0.32), mat4(x, 3.95, z));
  p.push("screenGlow", new THREE.BoxGeometry(1.14, 0.03, 0.22), mat4(x, 3.9, z));
  addFlickerLight(ctx, x, 3.55, z, color, intensity, dist, speed);
}

function addFire(ctx: BuildCtx, x: number, z: number, scale = 1) {
  const l = new THREE.PointLight(0xd4562a, 3.4 * scale, 16 * scale, 1.7);
  l.position.set(x, 1 + scale, z);
  ctx.scene.add(l);
  ctx.fireLights.push({ light: l, base: 3.4 * scale });
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

function bloodDecal(ctx: BuildCtx, x: number, z: number, s = 1.4) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), ctx.mats.blood);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.random() * Math.PI;
  m.position.set(x, 0.035, z);
  m.userData.noHit = true;
  ctx.scene.add(m);
}

/** أثر زحف دموي (خط) */
function bloodTrail(ctx: BuildCtx, x1: number, z1: number, x2: number, z2: number) {
  const steps = Math.max(3, Math.floor(Math.hypot(x2 - x1, z2 - z1) / 0.8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    bloodDecal(ctx, x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.3, z1 + (z2 - z1) * t + (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.5);
  }
}

function corpse(ctx: BuildCtx, x: number, z: number) {
  coveredBody(propCtxOf(ctx), x, z, Math.random() * Math.PI * 2);
  bloodDecal(ctx, x, z, 1.9);
}

function emergencyLight(ctx: BuildCtx, x: number, y: number, z: number, color: number) {
  const l = new THREE.PointLight(color, 1.4, 12, 1.8);
  l.position.set(x, y, z);
  ctx.scene.add(l);
  ctx.flickerLights.push({ light: l, base: 1.4, speed: 1.2 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), color === 0xc22a1e ? ctx.mats.redLight : ctx.mats.amberLight);
  m.position.set(x, y, z);
  m.userData.noHit = true;
  ctx.scene.add(m);
}

// ── محول PropCtx ──
function propCtxOf(ctx: BuildCtx): PropCtx {
  return {
    push: (bucket, geo, m) => pushStatic(ctx, bucket, geo, m),
    collider: (minX, maxX, minZ, maxZ) => ctx.colliders.push({ minX, maxX, minZ, maxZ }),
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
  ctx.interactables.push({ id, kind, x, z, radius: 1.9, prompt, data, used: false });
}

function noteProp(ctx: BuildCtx, id: string, docId: string, x: number, z: number, y = 0.82) {
  pickupProp(ctx, id, "note", x, z, "قراءة الوثيقة", { docId }, y);
}

/** باب حقيقي بمفصلة + تفاعل */
function addDoorAt(
  ctx: BuildCtx,
  id: string,
  cx: number,
  cz: number,
  orient: "x" | "z",
  width: number,
  style: "wood" | "metal" | "double" = "wood",
) {
  const def = makeDoor(width, style);
  if (orient === "x") {
    def.group.position.set(cx - width / 2, 0, cz);
    def.group.rotation.y = 0;
  } else {
    def.group.position.set(cx, 0, cz - width / 2);
    def.group.rotation.y = -Math.PI / 2;
  }
  def.group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.userData.doorMesh = id;
  });
  ctx.scene.add(def.group);
  const half = width / 2 + 0.08;
  const collider: Collider =
    orient === "x"
      ? { minX: cx - half, maxX: cx + half, minZ: cz - 0.14, maxZ: cz + 0.14 }
      : { minX: cx - 0.14, maxX: cx + 0.14, minZ: cz - half, maxZ: cz + half };
  ctx.doors.push({ id, def, collider, open: false });
  ctx.interactables.push({
    id,
    kind: "door",
    x: cx,
    z: cz,
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
  };
  const w = propCtxOf(ctx);
  const rnd = seededRandom(20260114);

  // ── الأرضية والطرق ──
  // الأرضية تنتهي عند ضفة النهر جنوباً (z=118) — النهر بعدها
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 244), mats.asphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -4);
  scene.add(ground);

  const roadXs = [-92, -46, 0, 46, 92];
  const roadZs = [-92, -46, 0, 46, 92];
  for (const x of roadXs) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(10, 236), mats.asphalt);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.01, 0);
    scene.add(r);
  }
  for (const z of roadZs) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(236, 10), mats.asphalt);
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0.015, z);
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

  // ── أحياء خلفية بطابع مميز لكل منطقة ──
  // خريطة شادو هافن: مجمع المختبر شمال غرب، السكن شمال، الساحة بالمنتصف،
  // المستودع غرب، متجر الأسلحة جنوب الساحة، البرج شمال شرق، المستشفى جنوب شرق
  const usedBlocks = new Set([
    "-69,-69", "-23,-69", "69,-69", "23,-23", "-23,-23", "-23,23", "-69,23", "-69,69", "69,23", "69,69",
  ]);
  for (const bx of blockCs) {
    for (const bz of blockCs) {
      if (usedBlocks.has(`${bx},${bz}`)) continue;
      const downtown = bx > 0 && bz < 0;
      const commercial = bz > 0;
      if (commercial && bx !== 69) {
        // حي تجاري: مبنيان متجاوران بلافتات مضيئة ومظلات
        const h1 = 8 + rnd() * 4;
        const h2 = 7 + rnd() * 5;
        addBox(ctx, "facade", bx - 7.5, 0, bz, 15, h1, 26);
        addBox(ctx, "facade", bx + 8, 0, bz + 2, 14, h2, 22);
        ctx.colliders.push({ minX: bx - 15.5, maxX: bx, minZ: bz - 13.5, maxZ: bz + 13.5 });
        ctx.colliders.push({ minX: bx + 0.5, maxX: bx + 15.5, minZ: bz - 9.5, maxZ: bz + 13.5 });
        ctx.buildings.push({ x: bx - 7.5, z: bz, w: 15, d: 26 });
        ctx.buildings.push({ x: bx + 8, z: bz + 2, w: 14, d: 22 });
        // خزانات ومكيفات على السطح
        w.push("metal", new THREE.CylinderGeometry(1.1, 1.1, 2, 10), mat4(bx - 10, h1 + 1, bz + 6));
        w.push("metal", new THREE.BoxGeometry(1.4, 0.9, 1.1), mat4(bx + 10, h2 + 0.45, bz - 2, { ry: 0.4 }));
        // مظلات قماشية فوق الواجهات
        w.push("fabric2", new THREE.BoxGeometry(8, 0.08, 1.6), mat4(bx - 7.5, 3.4, bz - 13.6, { rx: 0.25 }));
        w.push("fabric2", new THREE.BoxGeometry(7, 0.08, 1.6), mat4(bx + 8, 3.3, bz - 11.7, { rx: 0.25, ry: 0.06 }));
        // لافتات عربية مضيئة
        const s1 = shopSign(bx - 7.5, 4.4, bz - 13.2, Math.PI, ["صيدلية النور", "بقالة الأمانة", "مكتبة الأمل"][Math.floor(rnd() * 3)]);
        const s2 = shopSign(bx + 8, 4.2, bz - 11.2, Math.PI, ["مقهى الشرق", "مصورات المدينة", "حلاق الشارع"][Math.floor(rnd() * 3)]);
        s1.userData.noHit = true;
        s2.userData.noHit = true;
        scene.add(s1, s2);
      } else if (downtown) {
        // وسط المدينة: أبراج أعلى بواجهة داكنة
        const hgt = 20 + rnd() * 12;
        addBox(ctx, "facadeTower", bx, 0, bz, 26, hgt, 26);
        ctx.buildings.push({ x: bx, z: bz, w: 26, d: 26 });
        ctx.colliders.push({ minX: bx - 14, maxX: bx + 14, minZ: bz - 14, maxZ: bz + 14 });
        // هوائي سطح
        w.push("metal", new THREE.CylinderGeometry(0.08, 0.12, 5, 6), mat4(bx + 4, hgt + 2.5, bz - 4));
        w.push("redEmissive", new THREE.SphereGeometry(0.14, 6, 6), mat4(bx + 4, hgt + 5, bz - 4));
      } else {
        // سكني: مبانٍ متوسطة بتنويع
        const wdt = 24 + rnd() * 4;
        const dpt = 24 + rnd() * 4;
        const hgt = 9 + rnd() * 10;
        addBox(ctx, rnd() < 0.5 ? "facadeOld" : "facade", bx, 0, bz, wdt, hgt, dpt);
        ctx.buildings.push({ x: bx, z: bz, w: wdt, d: dpt });
        ctx.colliders.push({ minX: bx - wdt / 2 - 1, maxX: bx + wdt / 2 + 1, minZ: bz - dpt / 2 - 1, maxZ: bz + dpt / 2 + 1 });
        w.push("metal", new THREE.CylinderGeometry(0.9, 0.9, 1.8, 10), mat4(bx + wdt / 4, hgt + 0.9, bz - dpt / 4));
        if (rnd() < 0.6) w.push("metal", new THREE.BoxGeometry(1.3, 0.8, 1), mat4(bx - wdt / 4, hgt + 0.4, bz + dpt / 4, { ry: 0.3 }));
        if (rnd() < 0.4) {
          // مبنى منهار الزاوية
          w.push("rubble", new THREE.BoxGeometry(8, 3, 6), mat4(bx + wdt / 2 - 2, 1.5, bz + dpt / 2 + 2.5, { ry: 0.5, rz: 0.12 }));
          debrisPile(ctx, bx + wdt / 2 + 2, bz + dpt / 2 + 4, 7, 6);
        }
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

  // ── سيارات: مواقف + حوادث ──
  const cars: [number, number, number, CarVariantLike][] = [
    [3.4, -60, 0, "sedan"], [-3.4, -55, Math.PI, "taxi"], [3.4, -30, 0.06, "wreck"],
    [-3.6, 10, 0, "sedan"], [3.4, 45, Math.PI, "sedan"], [-3.4, 70, 0.04, "van"],
    [-45, 3.4, Math.PI / 2, "sedan"], [-60, -3.4, Math.PI / 2 + 0.05, "wreck"],
    [25, 3.4, Math.PI / 2, "taxi"], [55, -3.4, Math.PI / 2, "sedan"], [80, 3.4, Math.PI / 2 + 0.03, "van"],
    [48.4, -60, 0, "sedan"], [43.6, -25, Math.PI, "sedan"], [48.4, 15, 0.05, "wreck"], [43.6, 60, Math.PI, "sedan"],
    [-25, -48.4, 0, "van"], [20, -43.6, Math.PI + 0.05, "sedan"], [-60, -43.6, 0, "sedan"], [70, -48.4, 0.03, "sedan"],
    [-20, 48.4, Math.PI, "sedan"], [30, 43.6, 0, "wreck"], [70, 43.6, 0.04, "van"], [-70, 43.6, 0, "sedan"],
    [-48.4, 60, Math.PI, "taxi"], [-43.6, -60, 0, "sedan"], [-48.4, 15, Math.PI + 0.04, "sedan"],
    [0, 0, 0.7, "wreck"], [-46, 46, 2.2, "sedan"], [46, -46, 1.1, "van"], [0, -23, 2.8, "sedan"],
    [65, -35, 0.15, "police"], [-15, 15, 1.6, "ambulance"],
  ];
  for (const [cx, cz, cr, variant] of cars) {
    car(w, cx, cz, cr, variant, rnd());
  }
  // حافلة محترقة تسد الشارع الرئيسي
  busWreck(w, 0, -40, 0.3);
  // حرائق سيارات (ضوءان فقط حفاظاً على الأداء)
  addFire(ctx, 0.8, 0.8, 0.75);
  addFire(ctx, 48.4, 14.2, 0.7);

  // جثث مغطاة وآثار دماء
  const corpseSpots: [number, number][] = [
    [30, 30], [-30, -30], [50, 8], [-8, 50], [15, -55], [-55, 15], [80, -10], [-80, 10],
    [26, 62], [-60, -60], [40, -26], [-26, 40],
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
    const bbTex = canvasTex(256, 128, (c) => {
      c.fillStyle = "#171310";
      c.fillRect(0, 0, 256, 128);
      c.fillStyle = "#7a1a12";
      c.font = "bold 34px Cairo, Arial";
      c.textAlign = "center";
      c.fillText("كيبريس", 128, 52);
      c.fillStyle = "#8a7a4a";
      c.font = "22px Cairo, Arial";
      c.fillText("مستقبلٌ آمن… وعدٌ صادق", 128, 92);
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(20 + Math.random() * 100, 0, 40, 128);
    });
    const bb = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 3.1),
      new THREE.MeshStandardMaterial({ map: bbTex, roughness: 0.8, emissive: 0x333333, emissiveIntensity: 0.25 }),
    );
    bb.position.set(16.5, 5.6, 56.85);
    bb.rotation.y = Math.PI;
    bb.userData.noHit = true;
    scene.add(bb);
  }

  // ═══════════ المباني القابلة للدخول ═══════════

  // ── 1) شقة جون (البداية) في حي شادو هافن السكني (-23,-69) ──
  {
    const cx = -23, cz = -69;
    roomFloor(ctx, cx, cz, 16, 12);
    w.push("woodFloor", new THREE.BoxGeometry(15.6, 0.04, 11.6), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, 16, 12);
    wallWithGaps(ctx, "brick", cx - 8, cz - 6, cx + 8, cz - 6);
    // الباب في الجدار الجنوبي — يطل على شارع جريف والمدينة
    wallWithGaps(ctx, "brick", cx - 8, cz + 6, cx + 8, cz + 6, [{ at: 12, width: 1.6 }]);
    wallWithGaps(ctx, "brick", cx - 8, cz - 6, cx - 8, cz + 6);
    wallWithGaps(ctx, "brick", cx + 8, cz - 6, cx + 8, cz + 6, [{ at: 3, width: 2.6 }]);
    // جدار داخلي للحمام
    wallWithGaps(ctx, "wallpaper", cx + 5, cz - 6, cx + 5, cz - 3, [{ at: 1.2, width: 1.2 }]);
    w.push("wallpaper", new THREE.BoxGeometry(3, 4.2, 0.3), mat4(cx + 6.5, 2.1, cz - 6 + T / 2));
    addBox(ctx, "white", cx + 7, 0, cz - 4.8, 0.5, 0.75, 0.6); // مرحاض
    addBox(ctx, "white", cx + 6, 0, cz - 4.6, 0.55, 0.9, 0.45); // مغسلة
    // فتحة سقف (ضوء قمر)
    const holeLight = new THREE.SpotLight(0x8a93a8, 40, 20, 0.5, 0.6, 1.5);
    holeLight.position.set(cx + 4, 9, cz);
    holeLight.target.position.set(cx + 4, 0, cz);
    scene.add(holeLight, holeLight.target);
    // الأثاث
    kitchenCounter(w, cx - 6.8, cz + 2, Math.PI / 2, 2.6);
    fridge(w, cx - 6.8, cz + 4.2, Math.PI / 2, true);
    sofa(w, cx + 1, cz + 4.6, Math.PI, 2.1);
    tvSet(w, cx + 1, cz - 4.9, 0);
    coffeeTable(w, cx + 1, cz + 2.2, 0);
    desk(w, cx + 2, cz + 3, 0, true);
    bed(w, cx - 4, cz + 2, 0.2);
    shelfStocked(w, cx + 6.8, cz + 1.5, -Math.PI / 2, 2.4, true);
    cabinet(w, cx - 6, cz - 3.5, Math.PI / 2);
    deadPlant(w, cx - 3, cz + 4.8);
    deadPlant(w, cx + 5.5, cz - 2.5);
    coveredBody(w, cx + 4.5, cz + 1.5, 0.7);
    bloodDecal(ctx, cx + 3, cz - 1, 2);
    bloodDecal(ctx, cx - 2, cz + 3.5, 1.5);
    // الخزانة + نقطة حفظ
    addBox(ctx, "metal", cx - 6.5, 0, cz - 5, 1.4, 2.2, 0.7);
    ctx.interactables.push({ id: "apt_safe", kind: "checkpoint", x: cx - 6.5, z: cz - 4.4, radius: 2, prompt: "خزانة الحفظ — حفظ التقدم", used: false });
    fluoro(ctx, cx, cz, 0xd0a860, 1.1, 11, 7);
    // الالتقاطات
    noteProp(ctx, "apt_rec", "doc_1", cx + 2, cz + 3);
    pickupProp(ctx, "apt_battery", "item", cx - 6.6, cz + 1.2, "التقاط بطارية", { item: "battery", qty: 1 }, 1.0);
    pickupProp(ctx, "apt_band", "item", cx + 6, cz - 4.6, "التقاط ضمادة", { item: "bandage", qty: 1 }, 0.95);
    // الباب
    addDoorAt(ctx, "door_apt", cx + 4, cz + 6, "x", 1.6, "wood");
    ctx.buildings.push({ x: cx, z: cz, w: 16, d: 12, name: "شقتك", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 2, z: cz + 12, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 14, z: cz + 14, wander: 8 });
    ctx.triggers.push({ id: "trig_apartment_exit", x: cx, z: cz + 10, radius: 5, once: true });
  }

  // ── 2) متجر الأسلحة (5) — جنوب الساحة الرئيسية (-23,23) ──
  {
    const cx = -23, cz = 23;
    roomFloor(ctx, cx, cz, 14, 12);
    w.push("woodFloor", new THREE.BoxGeometry(13.6, 0.04, 11.6), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, 14, 12);
    wallWithGaps(ctx, "brick", cx - 7, cz - 6, cx + 7, cz - 6, [{ at: 7, width: 1.7 }]);
    wallWithGaps(ctx, "brick", cx - 7, cz + 6, cx + 7, cz + 6);
    wallWithGaps(ctx, "brick", cx - 7, cz - 6, cx - 7, cz + 6);
    wallWithGaps(ctx, "brick", cx + 7, cz - 6, cx + 7, cz + 6);
    counter(w, cx + 1, cz - 3, 0, 2.6);
    gunRack(w, cx, cz + 5.5, Math.PI);
    shelfStocked(w, cx + 5.6, cz + 1, Math.PI / 2, 2.6, true);
    w.push("glassDark", new THREE.BoxGeometry(1.9, 0.06, 0.8), mat4(cx - 3, 1.18, cz + 2));
    counter(w, cx - 3, cz + 2, Math.PI / 2, 1.8);
    // لوحة target على الجدار الغربي
    w.push("medRed", new THREE.PlaneGeometry(0.7, 0.9), mat4(cx - 6.7, 1.9, cz - 2, { ry: Math.PI / 2 }));
    cratesStack(w, cx - 5.5, cz + 4.5);
    barrel(w, cx + 5.5, cz - 4.5, "greenMetal");
    bloodDecal(ctx, cx - 2, cz + 2, 2.2);
    fluoro(ctx, cx, cz, 0xd0a860, 1.2, 11, 11);
    pickupProp(ctx, "gun_pistol", "item", cx + 1, cz - 3, "التقاط مسدس الخدمة", { weapon: "pistol" }, 1.25);
    pickupProp(ctx, "gun_ammo1", "item", cx - 0.5, cz - 3.2, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 24 }, 1.25);
    pickupProp(ctx, "gun_shotgun", "item", cx + 5.4, cz + 0.4, "التقاط بندقية الصيد", { weapon: "shotgun" }, 0.95);
    pickupProp(ctx, "gun_shells", "item", cx + 5.8, cz + 1.8, "التقاط خرطوش", { item: "shotgun_ammo", qty: 8 }, 0.95);
    addDoorAt(ctx, "door_gunshop", cx, cz - 6, "x", 1.7, "wood");
    ctx.buildings.push({ x: cx, z: cz, w: 14, d: 12, name: "متجر الأسلحة", poi: true });
    ctx.spawns.push({ kind: "runner", x: cx + 2, z: cz + 2, wander: 3 });
    ctx.triggers.push({ id: "trig_gunshop", x: cx, z: cz, radius: 9, once: true });
  }

  // ── 3) مركز الشرطة (23,-23) — شرق الساحة الرئيسية ──
  {
    const cx = 23, cz = -23;
    roomFloor(ctx, cx, cz, 20, 16);
    w.push("tile", new THREE.BoxGeometry(19.6, 0.04, 15.6), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, 20, 16);
    wallWithGaps(ctx, "concrete", cx - 10, cz - 8, cx + 10, cz - 8);
    wallWithGaps(ctx, "concrete", cx - 10, cz + 8, cx + 10, cz + 8);
    // الباب الرئيسي على الجدار الغربي — يطل على الشارع الرئيسي والساحة
    wallWithGaps(ctx, "concrete", cx - 10, cz - 8, cx - 10, cz + 8, [{ at: 5, width: 1.8 }]);
    wallWithGaps(ctx, "concrete", cx + 10, cz - 8, cx + 10, cz + 8);
    // قسم داخلي: مكتب
    wallWithGaps(ctx, "concrete", cx + 2, cz + 2, cx + 10, cz + 2, [{ at: 3, width: 1.5 }]);
    // غرفة الأدلة (جنوب غربي)
    wallWithGaps(ctx, "concrete", cx - 3, cz + 2, cx - 3, cz + 8, [{ at: 2.5, width: 1.4 }]);
    wallWithGaps(ctx, "concrete", cx - 10, cz + 2, cx - 3, cz + 2);
    // مكاتب + كراسٍ
    desk(w, cx - 5, cz - 3, 0, true);
    officeChair(w, cx - 5, cz - 1.8, Math.PI);
    desk(w, cx + 5, cz - 3, Math.PI, true);
    officeChair(w, cx + 5, cz - 1.8, 0);
    desk(w, cx + 6, cz + 5, Math.PI, false);
    desk(w, cx - 1, cz - 5.5, 0, true);
    officeChair(w, cx - 1, cz - 4.3, Math.PI);
    // زنزانة (شمال شرقي): قضبان
    for (let bx2 = cx + 7; bx2 <= cx + 9.8; bx2 += 0.28) {
      w.push("chrome", new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6), mat4(bx2, 1.6, cz + 5));
    }
    w.push("chrome", new THREE.CylinderGeometry(0.035, 0.035, 2.9, 6), mat4(cx + 7, 1.6, cz + 6.6, { rx: Math.PI / 2 }));
    addBox(ctx, "metal", cx + 8.8, 0, cz + 7, 1.9, 0.5, 0.9); // سرير الزنزانة
    ctx.colliders.push({ minX: cx + 6.8, maxX: cx + 10, minZ: cz + 4.8, maxZ: cz + 5.2 });
    // لوحة إعلانات
    w.push("cork", new THREE.PlaneGeometry(2.2, 1.4), mat4(cx - 9.7, 2, cz - 2, { ry: Math.PI / 2 }));
    for (let i = 0; i < 5; i++) {
      w.push("paper", new THREE.BoxGeometry(0.02, 0.3, 0.22), mat4(cx - 9.62, 1.7 + (i % 2) * 0.55, cz - 2.7 + i * 0.32, { ry: (rnd() - 0.5) * 0.2 }));
    }
    // خزانة الأسلحة في غرفة الأدلة
    lockerRow(w, cx - 6.5, cz + 6.8, 0, 4);
    shelfStocked(w, cx - 8.5, cz + 4.5, Math.PI / 2, 2, true);
    bloodDecal(ctx, cx, cz, 2.6);
    coveredBody(w, cx - 3, cz - 1, 1.1);
    bodyBag(w, cx + 3, cz + 6.5, 0.5);
    emergencyLight(ctx, cx, 3.6, cz - 4, 0xc22a1e);
    fluoro(ctx, cx - 3, cz + 3, 0xd0a860, 1, 12, 13);
    // الالتقاطات
    noteProp(ctx, "pol_doc", "doc_4", cx - 5, cz - 3);
    pickupProp(ctx, "pol_key", "item", cx + 6, cz + 5, "التقاط مفتاح برج الإذاعة", { item: "key_tower", qty: 1 }, 0.92);
    pickupProp(ctx, "pol_ammo", "item", cx + 5, cz - 3, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 24 }, 0.92);
    pickupProp(ctx, "pol_med", "item", cx - 8.4, cz + 4.4, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.95);
    pickupProp(ctx, "pol_shells", "item", cx - 2, cz + 6, "التقاط خرطوش", { item: "shotgun_ammo", qty: 6 }, 0.14);
    // مفتاح خزانة الأسلحة (مهمة جانبية)
    pickupProp(ctx, "pol_lockerkey", "item", cx - 1, cz - 5.5, "التقاط مفتاح خزانة الأسلحة", { item: "key_locker", qty: 1 }, 0.92);
    ctx.interactables.push({ id: "pol_locker", kind: "item", x: cx - 6.5, z: cz + 5.6, radius: 2, prompt: "خزانة الأسلحة — تحتاج مفتاح الترسانة", data: { locker: true }, used: false });
    // الأبواب
    addDoorAt(ctx, "door_police", cx - 10, cz - 3, "z", 1.8, "metal");
    addDoorAt(ctx, "door_police_evidence", cx - 3, cz + 4.5, "z", 1.4, "metal");
    ctx.buildings.push({ x: cx, z: cz, w: 20, d: 16, name: "مركز الشرطة", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 6, z: cz, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx + 3, z: cz - 5, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx + 14, z: cz + 12, wander: 8 });
    ctx.triggers.push({ id: "trig_police", x: cx, z: cz, radius: 12, once: true });
  }

  // ── 4) برج الإذاعة (6) — الركن الشمالي الشرقي (69,-69) ──
  {
    const cx = 69, cz = -69;
    roomFloor(ctx, cx, cz, 12, 10);
    roomRoof(ctx, cx, cz, 12, 10);
    wallWithGaps(ctx, "metal", cx - 6, cz - 5, cx + 6, cz - 5, [{ at: 3, width: 1.5 }]);
    wallWithGaps(ctx, "metal", cx - 6, cz + 5, cx + 6, cz + 5);
    wallWithGaps(ctx, "metal", cx - 6, cz - 5, cx - 6, cz + 5);
    wallWithGaps(ctx, "metal", cx + 6, cz - 5, cx + 6, cz + 5);
    // البرج نفسه
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.6, 34, 6, 1, true), mats.metal);
    tower.position.set(cx, 17, cz + 8);
    scene.add(tower);
    tower.userData.noHit = true;
    ctx.colliders.push({ minX: cx - 1.4, maxX: cx + 1.4, minZ: cz + 6.6, maxZ: cz + 9.4 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), mats.redLight);
    beacon.position.set(cx, 34.4, cz + 8);
    beacon.userData.noHit = true;
    scene.add(beacon);
    const beaconLight = new THREE.PointLight(0xc22a1e, 2, 20, 2);
    beaconLight.position.set(cx, 34, cz + 8);
    scene.add(beaconLight);
    ctx.flickerLights.push({ light: beaconLight, base: 2, speed: 0.7 });
    // خوادم وأجهزة
    serverRack(w, cx - 5.2, cz - 2, Math.PI / 2);
    serverRack(w, cx - 5.2, cz + 0.6, Math.PI / 2);
    serverRack(w, cx - 5.2, cz + 3.2, Math.PI / 2);
    desk(w, cx - 2, cz - 3.4, 0, true);
    controlPanel(w, cx + 2, cz - 3.4, 0);
    counter(w, cx + 4.5, cz + 3, -Math.PI / 2, 2.2);
    wallPipes(w, cx, 3.2, cz - 4.7, 0, 6);
    // كونسول البث
    addBox(ctx, "metal", cx + 2, 0, cz - 1.4, 1.6, 1.1, 0.7);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), mats.greenLight);
    screen.position.set(cx + 2, 1.5, cz - 1.02);
    screen.userData.noHit = true;
    scene.add(screen);
    ctx.interactables.push({ id: "tower_console", kind: "console", x: cx + 2, z: cz - 0.6, radius: 2, prompt: "البث — نداء استغاثة", used: false });
    fluoro(ctx, cx, cz, 0x6ac070, 0.9, 10, 5);
    addDoorAt(ctx, "door_tower", cx - 3, cz - 5, "x", 1.5, "metal");
    ctx.buildings.push({ x: cx, z: cz, w: 12, d: 10, name: "برج الإذاعة", poi: true });
    ctx.spawns.push({ kind: "runner", x: cx + 2, z: cz + 2, wander: 4 });
    ctx.spawns.push({ kind: "walker", x: cx - 10, z: cz + 10, wander: 8 });
    ctx.triggers.push({ id: "trig_tower", x: cx, z: cz, radius: 10, once: true });
  }

  // ── 5) المستشفى المركزي (8) — الجنوب الشرقي (69,23) — الأكبر ──
  {
    const cx = 69, cz = 23;
    roomFloor(ctx, cx, cz, 28, 22);
    w.push("tile", new THREE.BoxGeometry(27.6, 0.04, 21.6), mat4(cx, 0.06, cz));
    roomRoof(ctx, cx, cz, 28, 22);
    wallWithGaps(ctx, "concrete", cx - 14, cz - 11, cx + 14, cz - 11, [{ at: 14, width: 2 }]);
    wallWithGaps(ctx, "concrete", cx - 14, cz + 11, cx + 14, cz + 11);
    wallWithGaps(ctx, "concrete", cx - 14, cz - 11, cx - 14, cz + 11, [{ at: 11, width: 1.7 }]);
    wallWithGaps(ctx, "concrete", cx + 14, cz - 11, cx + 14, cz + 11);
    wallWithGaps(ctx, "concrete", cx - 14, cz - 2, cx - 4, cz - 2, [{ at: 5, width: 1.6 }]);
    wallWithGaps(ctx, "concrete", cx + 4, cz - 2, cx + 14, cz - 2, [{ at: 5, width: 1.6 }]);
    wallWithGaps(ctx, "concrete", cx - 4, cz - 2, cx - 4, cz - 11);
    wallWithGaps(ctx, "concrete", cx + 4, cz - 2, cx + 4, cz - 11, [{ at: 4.5, width: 1.5 }]);
    wallWithGaps(ctx, "concrete", cx - 12, cz + 3, cx - 4, cz + 3, [{ at: 4, width: 1.5 }]);
    // استقبال + انتظار
    counter(w, cx, cz - 6.5, 0, 2.8);
    officeChair(w, cx, cz - 5.3, Math.PI);
    bench(w, cx - 8, cz - 8.5, 0);
    bench(w, cx - 4.5, cz - 8.5, 0);
    // كرسي متحرك
    w.push("rubber", new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), mat4(cx - 6, 0.3, cz - 7.5, { rz: Math.PI / 2 }));
    w.push("rubber", new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), mat4(cx - 4.9, 0.3, cz - 7.5, { rz: Math.PI / 2 }));
    w.push("chrome", new THREE.BoxGeometry(0.6, 0.05, 0.55), mat4(cx - 5.45, 0.55, cz - 7.5));
    w.push("fabric", new THREE.BoxGeometry(0.55, 0.6, 0.05), mat4(cx - 5.45, 0.85, cz - 7.75, { rx: -0.15 }));
    // أسرّة المستشفى (نقالات)
    for (let i = 0; i < 4; i++) gurney(w, cx - 10 + i * 2.6, cz + 7, 0, i !== 1);
    for (let i = 0; i < 3; i++) gurney(w, cx + 6 + i * 2.6, cz + 6, 0.1, i === 1);
    ivStand(w, cx - 11.2, cz + 7);
    ivStand(w, cx - 8.6, cz + 7.4);
    ivStand(w, cx + 4.8, cz + 6);
    ivStand(w, cx + 10, cz + 6.3);
    bodyBag(w, cx - 7.4, cz + 6.1, 0.05);
    // عيادة (شرقاً)
    shelfStocked(w, cx + 9, cz - 7, 0, 4, true);
    desk(w, cx + 10, cz - 5, Math.PI / 2, true);
    cabinet(w, cx + 12.8, cz - 9, 0, "medWhite");
    // مكتب المدير
    desk(w, cx - 8, cz + 6.5, Math.PI, true);
    officeChair(w, cx - 8, cz + 5.2, 0);
    shelfStocked(w, cx - 12.5, cz + 7, Math.PI / 2, 2.2, false);
    cabinet(w, cx - 11, cz + 9.6, Math.PI, "wood2");
    coveredBody(w, cx - 6, cz + 8, 2.1);
    // غسيل الملابس (شرقاً) — سارة
    wallWithGaps(ctx, "concrete", cx + 6, cz + 3, cx + 14, cz + 3);
    machineProp(ctx, cx + 8, cz + 8.5, 1.8, 2, 1.6);
    machineProp(ctx, cx + 11, cz + 8.5, 1.8, 2, 1.6);
    counter(w, cx + 13, cz + 5, Math.PI / 2, 2);
    // دماء
    for (let i = 0; i < 7; i++) bloodDecal(ctx, cx - 12 + rnd() * 24, cz - 9 + rnd() * 18, 2 + rnd() * 2);
    bloodTrail(ctx, cx - 2, cz - 11, cx - 6, cz - 4);
    corpse(ctx, cx + 3, cz - 6);
    coveredBody(w, cx + 12, cz + 1.5, 0.4);
    emergencyLight(ctx, cx, 3.7, cz, 0xc22a1e);
    emergencyLight(ctx, cx - 8, 3.6, cz + 6, 0xd0a860);
    fluoro(ctx, cx + 8, cz - 6, 0xd0a860, 1.1, 13, 15);
    fluoro(ctx, cx - 1, cz - 7, 0xd8e8d0, 0.8, 10, 9);
    // الالتقاطات
    noteProp(ctx, "hos_doc3", "doc_3", cx + 10, cz - 5);
    noteProp(ctx, "hos_doc5", "doc_5", cx - 8, cz + 6.5);
    pickupProp(ctx, "hos_blue", "item", cx - 8.6, cz + 6.9, "التقاط بطاقة وصول زرقاء", { item: "keycard_blue", qty: 1 }, 0.92);
    pickupProp(ctx, "hos_med1", "item", cx - 12.4, cz - 8, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.95);
    pickupProp(ctx, "hos_med2", "item", cx + 9.2, cz - 7, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.95);
    pickupProp(ctx, "hos_bat", "item", cx + 2, cz + 8, "التقاط بطارية", { item: "battery", qty: 1 }, 1.0);
    pickupProp(ctx, "hos_band", "item", cx - 5, cz - 6, "التقاط ضمادتين", { item: "bandage", qty: 2 }, 0.62);
    // الأبواب
    addDoorAt(ctx, "door_hospital", cx, cz - 11, "x", 2, "double");
    addDoorAt(ctx, "door_hospital_west", cx - 14, cz, "z", 1.7, "metal");
    addDoorAt(ctx, "door_hospital_clinic", cx + 4, cz - 6.5, "z", 1.5, "wood");
    addDoorAt(ctx, "door_hospital_office", cx - 8, cz + 3, "x", 1.5, "wood");
    ctx.buildings.push({ x: cx, z: cz, w: 28, d: 22, name: "المستشفى المركزي", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 8, z: cz - 5, wander: 5 });
    ctx.spawns.push({ kind: "walker", x: cx + 5, z: cz - 8, wander: 5 });
    ctx.spawns.push({ kind: "runner", x: cx + 10, z: cz + 5, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 8, z: cz + 8.5, wander: 3 });
    ctx.spawns.push({ kind: "brute", x: cx, z: cz + 3, wander: 7 });
    ctx.spawns.push({ kind: "spitter", x: cx - 18, z: cz - 1, wander: 8 });
    // سارة — نموذج بشري يجلس على حافة الغسالة
    const sara = survivorModel("sara");
    sara.position.set(cx + 12.5, 1.98, cz + 9);
    sara.rotation.y = Math.PI * 0.85;
    scene.add(sara);
    ctx.interactables.push({ id: "npc_sara", kind: "npc", x: cx + 12.5, z: cz + 9, radius: 2.2, prompt: "التحدث مع سارة", data: { survivor: "sara" }, used: false });
    ctx.triggers.push({ id: "trig_hospital", x: cx, z: cz, radius: 14, once: true });
  }

  // ── 6) مصنع القطع — الواجهة النهرية جنوب غرب (-69,69) ──
  {
    const cx = -69, cz = 69;
    roomFloor(ctx, cx, cz, 26, 18);
    wallWithGaps(ctx, "metal", cx - 13, cz - 9, cx + 13, cz - 9, [{ at: 20, width: 2 }]);
    wallWithGaps(ctx, "metal", cx - 13, cz + 9, cx + 13, cz + 9);
    wallWithGaps(ctx, "metal", cx - 13, cz - 9, cx - 13, cz + 9);
    wallWithGaps(ctx, "metal", cx + 13, cz - 9, cx + 13, cz + 9);
    roomRoof(ctx, cx - 6, cz, 14, 18);
    pressMachine(w, cx - 8, cz - 4, 0);
    pressMachine(w, cx + 5, cz - 3, Math.PI / 2);
    conveyor(w, cx - 1, cz + 3, Math.PI / 2, 6);
    controlPanel(w, cx + 1, cz - 6.5, Math.PI);
    controlPanel(w, cx - 12, cz + 2, Math.PI / 2);
    forklift(w, cx + 9, cz + 4, -0.5);
    barrel(w, cx - 11, cz + 6, "greenMetal");
    barrel(w, cx + 11.5, cz - 6.5, "carB", true);
    barrel(w, cx - 4, cz - 7.5, "carA");
    cratesStack(w, cx - 11.5, cz - 6.5);
    cratesStack(w, cx + 3, cz + 7);
    wallPipes(w, cx, 3.4, cz - 8.6, 0, 9);
    wallPipes(w, cx - 12.6, 2.8, cz + 2, Math.PI / 2, 6);
    w.push("hazard", new THREE.BoxGeometry(3.4, 0.03, 1), mat4(cx - 8, 0.05, cz - 1.6));
    w.push("hazard", new THREE.BoxGeometry(3.4, 0.03, 1), mat4(cx + 5, 0.05, cz - 0.9));
    // مكتب المشرفين (زاوية شمال شرق) — الرقيب
    wallWithGaps(ctx, "concrete", cx + 6, cz - 9, cx + 6, cz - 2, [{ at: 2.5, width: 1.4 }]);
    wallWithGaps(ctx, "concrete", cx + 6, cz - 2, cx + 13, cz - 2);
    desk(w, cx + 10, cz - 6.5, Math.PI, false);
    officeChair(w, cx + 10, cz - 5.3, 0);
    cabinet(w, cx + 12.2, cz - 8, 0);
    emergencyLight(ctx, cx - 8, 3.6, cz + 6, 0xc22a1e);
    fluoro(ctx, cx + 2, cz + 2, 0xd0a860, 1, 12, 12);
    addFire(ctx, cx - 11, cz - 7, 0.9);
    bloodDecal(ctx, cx + 2, cz - 1, 2.4);
    bloodTrail(ctx, cx - 6, cz, cx - 2, cz + 3);
    coveredBody(w, cx - 3, cz + 1, 0.9);
    corpse(ctx, cx + 8, cz + 4);
    // الالتقاطات
    noteProp(ctx, "fac_doc", "doc_2", cx + 10, cz - 6.5);
    pickupProp(ctx, "fac_red", "item", cx - 11.5, cz - 6.5, "التقاط بطاقة وصول حمراء", { item: "keycard_red", qty: 1 }, 0.78);
    pickupProp(ctx, "fac_ammo", "item", cx - 4, cz + 6, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 20 }, 0.14);
    pickupProp(ctx, "fac_band", "item", cx + 5, cz + 6, "التقاط ضمادة", { item: "bandage", qty: 1 }, 0.14);
    addDoorAt(ctx, "door_factory", cx + 7, cz - 9, "x", 2, "double");
    ctx.buildings.push({ x: cx, z: cz, w: 26, d: 18, name: "مصنع القطع", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 6, z: cz, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 3, z: cz + 5, wander: 6 });
    ctx.spawns.push({ kind: "runner", x: cx - 10, z: cz - 5, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 10, z: cz - 5, wander: 3 });
    ctx.spawns.push({ kind: "spitter", x: cx - 6, z: cz + 7, wander: 7 });
    // الرقيب — جاثٍ مصاب
    const soldier = survivorModel("soldier");
    soldier.position.set(cx + 10.5, 0, cz - 7.5);
    soldier.rotation.y = -Math.PI * 0.7;
    scene.add(soldier);
    ctx.interactables.push({ id: "npc_soldier", kind: "npc", x: cx + 10.5, z: cz - 7.5, radius: 2.2, prompt: "التحدث مع الرقيب", data: { survivor: "soldier" }, used: false });
    ctx.triggers.push({ id: "trig_factory", x: cx, z: cz, radius: 13, once: true });
  }

  // ── 7) المستودع الغربي (-69,23) ──
  {
    const cx = -69, cz = 23;
    roomFloor(ctx, cx, cz, 22, 16);
    roomRoof(ctx, cx, cz, 22, 16);
    wallWithGaps(ctx, "metal", cx - 11, cz - 8, cx + 11, cz - 8, [{ at: 11, width: 2.2 }]);
    wallWithGaps(ctx, "metal", cx - 11, cz + 8, cx + 11, cz + 8);
    wallWithGaps(ctx, "metal", cx - 11, cz - 8, cx - 11, cz + 8);
    wallWithGaps(ctx, "metal", cx + 11, cz - 8, cx + 11, cz + 8);
    shelfStocked(w, cx - 6, cz + 3, 0, 7, true);
    shelfStocked(w, cx + 2, cz + 3, 0, 7, true);
    shelfStocked(w, cx - 2, cz - 4, Math.PI / 2, 6, true);
    // منصات pallet
    for (const [px2, pz2, pr] of [[cx + 7, cz - 2, 0.2], [cx - 9, cz - 5, -0.3]] as const) {
      for (let s2 = 0; s2 < 3; s2++) {
        w.push("wood2", new THREE.BoxGeometry(1.2, 0.05, 1.2), mat4(px2 + s2 * 0.04, 0.05 + s2 * 0.16, pz2, { ry: pr + s2 * 0.1 }));
      }
    }
    forklift(w, cx + 7.5, cz + 2, 2.6);
    cratesStack(w, cx - 9.5, cz + 6);
    cratesStack(w, cx + 9, cz - 5.5);
    cratesStack(w, cx + 5, cz - 6.5);
    barrel(w, cx - 10, cz - 1, "carA");
    barrel(w, cx - 10.9, cz - 1.4, "carA");
    // شرائح قماش متدلية
    w.push("fabric", new THREE.BoxGeometry(1.4, 2.2, 0.06), mat4(cx + 4, 3.1, cz - 6.9, { rz: 0.06 }));
    w.push("fabric", new THREE.BoxGeometry(1.2, 1.9, 0.06), mat4(cx - 5, 3.2, cz + 7.9, { rz: -0.08 }));
    fluoro(ctx, cx, cz, 0xd0a860, 1.1, 13, 8);
    bloodDecal(ctx, cx + 4, cz - 2, 2);
    coveredBody(w, cx + 5, cz - 3, 2.4);
    pickupProp(ctx, "ware_food1", "item", cx - 6, cz + 3, "التقاط طعام معلب", { item: "food", qty: 2 }, 0.95);
    pickupProp(ctx, "ware_food2", "item", cx + 2, cz + 3, "التقاط طعام معلب", { item: "food", qty: 1 }, 0.95);
    pickupProp(ctx, "ware_ammo", "item", cx - 2, cz - 4, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 16 }, 0.95);
    pickupProp(ctx, "ware_bat", "item", cx + 8, cz - 4, "التقاط بطاريتين", { item: "battery", qty: 2 }, 0.14);
    addDoorAt(ctx, "door_warehouse", cx, cz - 8, "x", 2.2, "double");
    ctx.buildings.push({ x: cx, z: cz, w: 22, d: 16, name: "المستودع الغربي", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 5, z: cz - 1, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 6, z: cz + 2, wander: 6 });
    ctx.spawns.push({ kind: "walker", x: cx + 8.5, z: cz + 6, wander: 2 });
    // عادل في الغرفة الخلفية
    const adel = survivorModel("adel");
    adel.position.set(cx + 9, 0, cz + 6);
    adel.rotation.y = Math.PI * 0.8;
    scene.add(adel);
    ctx.interactables.push({ id: "npc_adel", kind: "npc", x: cx + 9, z: cz + 6, radius: 2.2, prompt: "التحدث مع عادل", data: { survivor: "adel" }, used: false });
    ctx.triggers.push({ id: "trig_warehouse", x: cx, z: cz, radius: 12, once: true });
  }

  // ── 8) محطة الوقود — الركن الجنوبي الشرقي (69,69) ──
  {
    const cx = 69, cz = 69;
    addBox(ctx, "concrete", cx, 5.2, cz, 14, 0.4, 10, false);
    [[-6, -4], [6, -4], [-6, 4], [6, 4]].forEach(([ox, oz]) => {
      addBox(ctx, "metal", cx + ox, 0, cz + oz, 0.5, 5.2, 0.5);
    });
    // مضختان مفصلان
    for (const sx of [-3, 3]) {
      addBox(ctx, "metal", cx + sx, 0, cz, 1.1, 1.5, 0.8);
      w.push("screenGlowAmber", new THREE.PlaneGeometry(0.7, 0.4), mat4(cx + sx, 1.95, cz, { rx: -0.35 }));
      w.push("chrome", new THREE.TorusGeometry(0.35, 0.03, 6, 12, Math.PI), mat4(cx + sx + 0.55, 1.1, cz, { ry: Math.PI / 2 }));
      w.push("rubber", new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), mat4(cx + sx + 0.55, 1.15, cz + 0.32, { rx: 0.4 }));
    }
    // متجر صغير
    roomFloor(ctx, cx, cz + 10, 10, 8);
    w.push("tile", new THREE.BoxGeometry(9.6, 0.04, 7.6), mat4(cx, 0.06, cz + 10));
    roomRoof(ctx, cx, cz + 10, 10, 8);
    wallWithGaps(ctx, "brick", cx - 5, cz + 6, cx + 5, cz + 6, [{ at: 5, width: 1.5 }]);
    wallWithGaps(ctx, "brick", cx - 5, cz + 14, cx + 5, cz + 14);
    wallWithGaps(ctx, "brick", cx - 5, cz + 6, cx - 5, cz + 14);
    wallWithGaps(ctx, "brick", cx + 5, cz + 6, cx + 5, cz + 14);
    shopShelf(w, cx + 3.4, cz + 12, Math.PI / 2, 3.2);
    shopShelf(w, cx - 1, cz + 13.2, 0, 2.8);
    counter(w, cx - 3.2, cz + 8.6, Math.PI / 2, 2.2);
    fridge(w, cx - 4.2, cz + 12.5, Math.PI / 2, true);
    w.push("screenGlow", new THREE.BoxGeometry(0.6, 1.2, 0.02), mat4(cx - 4.5, 0.9, cz + 12.5, { ry: Math.PI / 2 }));
    vending(w, cx - 6.2, cz + 5.2, 0.3);
    fluoro(ctx, cx, cz + 10, 0xd0a860, 1, 10, 6);
    addFire(ctx, cx - 5, cz - 2, 1.3);
    car(w, cx + 1, cz - 6, 0.4, "sedan", rnd());
    bloodDecal(ctx, cx, cz + 2, 1.8);
    pickupProp(ctx, "gas_fuel", "item", cx + 3.4, cz + 12, "التقاط جالون وقود", { item: "fuel", qty: 1 }, 0.14);
    pickupProp(ctx, "gas_food", "item", cx - 3.2, cz + 8.6, "التقاط طعام معلب", { item: "food", qty: 1 }, 1.2);
    pickupProp(ctx, "gas_band", "item", cx - 0.5, cz + 13.2, "التقاط ضمادة", { item: "bandage", qty: 1 }, 0.9);
    addDoorAt(ctx, "door_gas", cx, cz + 6, "x", 1.5, "wood");
    ctx.buildings.push({ x: cx, z: cz, w: 14, d: 20, name: "محطة الوقود", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 4, z: cz - 4, wander: 5 });
    ctx.spawns.push({ kind: "spitter", x: cx + 8, z: cz - 5, wander: 7 });
    ctx.spawns.push({ kind: "walker", x: cx + 2, z: cz + 13, wander: 2 });
    ctx.triggers.push({ id: "trig_gas", x: cx, z: cz, radius: 10, once: true });
  }

  // ── 9) مجمع كيبريس المسوّر (1) — الركن الشمالي الغربي (-69,-69) ──
  // سور محيطي ببوابة شرقية، داخل السور: نقطة تفتيش + مبنى المدخل ببوابة المختبر الضخمة
  {
    const cx = -69, cz = -69;
    // أرضية إسمنتية للمجمع
    w.push("concrete", new THREE.BoxGeometry(43, 0.08, 43), mat4(cx, 0.04, cz));
    // السور المحيطي (فتحة بوابة على الجدار الشرقي باتجاه طريق المختبر)
    wallWithGaps(ctx, "concrete", cx - 22, cz - 22, cx + 22, cz - 22);
    wallWithGaps(ctx, "concrete", cx - 22, cz + 22, cx + 22, cz + 22);
    wallWithGaps(ctx, "concrete", cx - 22, cz - 22, cx - 22, cz + 22);
    wallWithGaps(ctx, "concrete", cx + 22, cz - 22, cx + 22, cz + 22, [{ at: 22, width: 6 }]);
    // أعمدة البوابة + مظلة ولوحة الشركة
    addBox(ctx, "concrete", cx + 22, 0, cz - 3.6, 1.2, 5.4, 1.2);
    addBox(ctx, "concrete", cx + 22, 0, cz + 3.6, 1.2, 5.4, 1.2);
    addBox(ctx, "metal", cx + 22, 5.4, cz, 1.4, 0.5, 8.6, false);
    const gateSign = shopSign(cx + 22, 4.6, cz, -Math.PI / 2, "كيبريس — مجمع الأبحاث");
    gateSign.userData.noHit = true;
    scene.add(gateSign);
    // دعامة بوابة معدنية مفتوحة (مثنية)
    w.push("metal", new THREE.BoxGeometry(0.25, 3.2, 2.6), mat4(cx + 21.4, 1.6, cz + 5.2, { ry: 0.9, rz: 0.08 }));
    // مبنى الأبحاث الرئيسي (صلب) — شمال المجمع
    addBox(ctx, "facadeTower", cx - 6, 0, cz - 15, 22, 14, 11);
    ctx.colliders.push({ minX: cx - 17, maxX: cx + 5, minZ: cz - 20.5, maxZ: cz - 9.5 });
    ctx.buildings.push({ x: cx - 6, z: cz - 15, w: 22, d: 11 });
    w.push("metal", new THREE.CylinderGeometry(0.1, 0.16, 6, 6), mat4(cx - 12, 17, cz - 17));
    w.push("redEmissive", new THREE.SphereGeometry(0.16, 6, 6), mat4(cx - 12, 20, cz - 17));
    // مولد الطاقة (صلب) + مدخنة — جنوب غرب
    addBox(ctx, "metal", cx - 14, 0, cz + 14, 12, 7, 10);
    ctx.colliders.push({ minX: cx - 20, maxX: cx - 8, minZ: cz + 9, maxZ: cz + 19 });
    ctx.buildings.push({ x: cx - 14, z: cz + 14, w: 12, d: 10 });
    w.push("metal", new THREE.CylinderGeometry(0.9, 1.2, 12, 10), mat4(cx - 17, 6, cz + 17));
    wallPipes(w, cx - 8, 2.8, cz + 9.2, 0, 7);
    // نقطة التفتيش: مظلة بأعمدة داخل البوابة
    w.push("tile", new THREE.BoxGeometry(12, 0.06, 9), mat4(cx, 0.05, cz + 1));
    [[-5.4, -3.6], [5.4, -3.6], [-5.4, 3.6], [5.4, 3.6]].forEach(([ox, oz]) => {
      addBox(ctx, "concrete", cx + ox, 0, cz + 1 + oz, 0.6, 4.4, 0.6);
    });
    addBox(ctx, "concrete", cx, 4.4, cz + 1, 12.2, 0.5, 8.8, false);
    turnstile(w, cx - 1.6, cz + 2.2, 0);
    turnstile(w, cx, cz + 2.2, 0);
    turnstile(w, cx + 1.6, cz + 2.2, 0);
    // آلات بصمة
    addBox(ctx, "carB", cx + 3.4, 0, cz + 3.8, 0.7, 1.6, 0.5);
    w.push("screenGlowAmber", new THREE.PlaneGeometry(0.45, 0.35), mat4(cx + 3.4, 1.15, cz + 3.53, { rx: -0.15 }));
    addBox(ctx, "carB", cx - 3.4, 0, cz + 3.8, 0.7, 1.6, 0.5);
    w.push("screenGlowAmber", new THREE.PlaneGeometry(0.45, 0.35), mat4(cx - 3.4, 1.15, cz + 3.53, { rx: -0.15 }));
    bench(w, cx + 4.6, cz - 1.2, -Math.PI / 2);
    trashBin(w, cx - 5.6, cz - 1.4);
    // باب المختبر الضخم (شمال نقطة التفتيش)
    const doorGroup = new THREE.Group();
    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 3.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x3a3f42, roughness: 0.5, metalness: 0.7, emissive: 0x1a0505, emissiveIntensity: 0.6 }),
    );
    doorMesh.position.y = 1.7;
    doorGroup.add(doorMesh);
    doorGroup.position.set(cx, 0, cz - 3.2);
    scene.add(doorGroup);
    doorGroupRef = doorGroup;
    ctx.colliders.push({ minX: cx - 2.1, maxX: cx + 2.1, minZ: cz - 3.5, maxZ: cz - 2.9 });
    const doorLightL = new THREE.PointLight(0xc22a1e, 1.2, 8, 2);
    doorLightL.position.set(cx - 2.6, 3.2, cz - 3.2);
    scene.add(doorLightL);
    ctx.flickerLights.push({ light: doorLightL, base: 1.2, speed: 2 });
    ctx.interactables.push({ id: "lab_door", kind: "gate", x: cx, z: cz - 3.2, radius: 2.6, prompt: "بوابة المختبر — بطاقتا وصول", used: false });
    // فوضى الإخلاء داخل المجمع
    cratesStack(w, cx - 10, cz + 4);
    cratesStack(w, cx + 9, cz + 8);
    barrel(w, cx - 12, cz + 6, "greenMetal");
    barrel(w, cx + 13, cz - 6, "carA", true);
    car(w, cx - 3, cz + 12, 0.5, "truck", rnd());
    sandbagWall(w, cx + 16, cz + 2, 0.1, 3);
    addFire(ctx, cx + 9, cz - 2, 0.9);
    corpse(ctx, cx - 6, cz + 4);
    coveredBody(w, cx + 6, cz - 6, 1.4);
    bloodDecal(ctx, cx + 2, cz - 5, 2.2);
    bloodTrail(ctx, cx + 6, cz - 6, cx + 12, cz - 2);
    emergencyLight(ctx, cx + 22, 3.4, cz, 0xc22a1e);
    addFlickerLight(ctx, cx - 6, 4.6, cz + 6, 0xd0a860, 1, 14, 3.4);
    pickupProp(ctx, "metro_ammo", "item", cx - 3.5, cz + 4, "التقاط ذخيرة مسدس", { item: "pistol_ammo", qty: 14 }, 0.14);
    ctx.buildings.push({ x: cx, z: cz, w: 46, d: 46, name: "مجمع كيبريس — المختبر", poi: true });
    ctx.spawns.push({ kind: "walker", x: cx - 8, z: cz + 6, wander: 6 });
    ctx.spawns.push({ kind: "runner", x: cx + 10, z: cz - 6, wander: 7 });
    ctx.spawns.push({ kind: "walker", x: cx + 26, z: cz, wander: 8 });
    ctx.spawns.push({ kind: "spitter", x: cx + 30, z: cz + 12, wander: 9 });
    ctx.triggers.push({ id: "trig_metro", x: cx + 24, z: cz, radius: 15, once: true });
  }

  // ═══════════ ميناء بلاك ووتر (7) — الجنوب على النهر ═══════════
  const gateX = 0, gateZ = 100;
  {
    // رصيف خشبي-إسمنتي على ضفة النهر
    const dock = new THREE.Mesh(new THREE.PlaneGeometry(200, 26), mats.concrete);
    dock.rotation.x = -Math.PI / 2;
    dock.position.set(0, 0.02, 108);
    scene.add(dock);
    // مياه نهر بلاك ووتر — جنوب السد
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 90),
      new THREE.MeshStandardMaterial({ color: 0x0b151a, roughness: 0.18, metalness: 0.65 }),
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -0.42, 163);
    scene.add(river);
    river.userData.noHit = true;
    // حاجز رصيف منخفض على طول الضفة — متصل كي لا يسقط اللاعب في النهر
    addBox(ctx, "concrete", -63, 0, 118, 110, 1.5, 1.4);
    addBox(ctx, "concrete", 0, 0, 118, 16, 1.5, 1.4);
    addBox(ctx, "concrete", 63, 0, 118, 110, 1.5, 1.4);
    // عمود إنارة رصيف + حلقات ربط
    for (let mx = -80; mx <= 80; mx += 16) {
      w.push("metal", new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), mat4(mx, 0.35, 116.6));
    }
    // بوابة الميناء + المولد
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
    addBox(ctx, "metal", gateX - 8, 0, gateZ + 3, 1.8, 1.4, 1.2);
    ctx.interactables.push({ id: "gate_gen", kind: "generator", x: gateX - 8, z: gateZ + 4.2, radius: 2.2, prompt: "تشغيل المولد", used: false });
    // قارب الإخلاء يترقب وسط النهر عند المرْسى
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, 3), mats.metal);
    hull.position.y = 0.5;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.2), mats.metal);
    cabin.position.set(-1.4, 1.9, 0);
    boat.add(hull, cabin);
    boat.position.set(gateX + 4, 0, 114);
    scene.add(boat);
    boatRef = boat;
    const boatLight = new THREE.PointLight(0xe8f0d8, 0, 24, 1.6);
    boatLight.position.set(gateX + 4, 4, 114);
    scene.add(boatLight);
    boatLightRef = boatLight;
    ctx.interactables.push({ id: "extraction", kind: "exit", x: gateX + 4, z: 112, radius: 3.4, prompt: "الصعود إلى قارب الإخلاء", used: false });
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
    pickupProp(ctx, "harbor_med", "item", gateX + 16, gateZ + 2, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.14);
    emergencyLight(ctx, gateX, 4, gateZ - 6, 0x2fae4e);
    coveredBody(w, gateX - 5, gateZ - 6, 1.2);
    bloodDecal(ctx, gateX + 2, gateZ - 5, 2.2);
    ctx.buildings.push({ x: gateX, z: gateZ + 8, w: 60, d: 16, name: "ميناء بلاك ووتر", poi: true });
    ctx.triggers.push({ id: "trig_harbor", x: gateX, z: gateZ, radius: 26, once: true });

    // محطة النهر — كوخ صغير بأبواب حقيقية على الرصيف
    const hx = 20, hz = 97;
    roomFloor(ctx, hx, hz, 10, 8);
    w.push("woodFloor", new THREE.BoxGeometry(9.6, 0.04, 7.6), mat4(hx, 0.06, hz));
    roomRoof(ctx, hx, hz, 10, 8);
    wallWithGaps(ctx, "brick", hx - 5, hz - 4, hx + 5, hz - 4);
    wallWithGaps(ctx, "brick", hx - 5, hz + 4, hx + 5, hz + 4, [{ at: 5, width: 1.5 }]);
    wallWithGaps(ctx, "brick", hx - 5, hz - 4, hx - 5, hz + 4);
    wallWithGaps(ctx, "brick", hx + 5, hz - 4, hx + 5, hz + 4, [{ at: 4, width: 1.4 }]);
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

  // ═══════════ المختبر تحت الأرض (x=600) ═══════════
  const LX = 600, LZ = 0;
  let labBossGate = { mesh: null as unknown as THREE.Mesh, colliderId: "lab_arena_gate" };
  let corePos = new THREE.Vector3(LX, 1, LZ - 26);
  {
    const cx = LX, cz = LZ;
    roomFloor(ctx, cx, cz, 8, 46, "labFloor");
    roomRoof(ctx, cx, cz, 8, 46, "labRoof");
    wallWithGaps(ctx, "metal", cx - 4, cz - 23, cx + 4, cz - 23);
    wallWithGaps(ctx, "metal", cx - 4, cz + 23, cx + 4, cz + 23, [{ at: 4, width: 1.6 }]);
    wallWithGaps(ctx, "metal", cx - 4, cz - 23, cx - 4, cz + 23);
    wallWithGaps(ctx, "metal", cx + 4, cz - 23, cx + 4, cz + 23);
    for (let i = 0; i < 6; i++) {
      const sz = cz + 18 - i * 6.4;
      addBox(ctx, "labMetal", cx - 3.2, 0, sz, 0.9, 2.4, 1.4);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.16), mats.greenLight);
      g.position.set(cx - 2.72, 1.8, sz);
      g.userData.noHit = true;
      scene.add(g);
      if (i % 2 === 0) {
        const gl = new THREE.PointLight(0x2fae4e, 0.5, 4.5, 2);
        gl.position.set(cx - 2.4, 1.9, sz);
        scene.add(gl);
        ctx.flickerLights.push({ light: gl, base: 0.5, speed: 4 + i });
      }
      const g2 = g.clone();
      g2.position.x = cx + 2.72;
      scene.add(g2);
    }
    wallPipes(w, cx + 3.6, 3.3, cz + 8, Math.PI / 2, 10);
    cratesStack(w, cx - 2.5, cz + 12);
    cratesStack(w, cx + 2.8, cz - 2);
    bodyBag(w, cx + 2.5, cz - 21, 0.4);
    // بوابة ساحة الحارس
    const gateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 3.8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2c3033, metalness: 0.7, roughness: 0.5 }),
    );
    gateMesh.position.set(cx, 1.9, cz - 8);
    gateMesh.visible = false;
    scene.add(gateMesh);
    labBossGate.mesh = gateMesh;
    // ساحة الحارس
    roomFloor(ctx, cx, cz - 15, 18, 16, "labFloor");
    addBox(ctx, "labMetal", cx - 8.8, 0, cz - 15, 0.7, 4.2, 16, true);
    addBox(ctx, "labMetal", cx + 8.8, 0, cz - 15, 0.7, 4.2, 16, true);
    addBox(ctx, "labMetal", cx - 8.4, 0, cz - 22.6, 17, 4.2, 0.7, true);
    [[-4, -18], [4, -12], [-3, -11], [5, -19]].forEach(([ox, oz]) => {
      addBox(ctx, "labMetal", cx + ox, 0, cz + oz, 1.1, 4.2, 1.1);
    });
    emergencyLight(ctx, cx, 3.6, cz - 15, 0xc22a1e);
    // قاعة النواة
    roomFloor(ctx, cx, cz - 30, 14, 12, "labFloor");
    addBox(ctx, "labMetal", cx - 6.8, 0, cz - 30, 0.7, 4.6, 12, true);
    addBox(ctx, "labMetal", cx + 6.8, 0, cz - 30, 0.7, 4.6, 12, true);
    addBox(ctx, "labMetal", cx - 6.4, 0, cz - 35.6, 14, 4.6, 0.7, true);
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 1),
      new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive: 0xff3020, emissiveIntensity: 1.6, roughness: 0.3 }),
    );
    core.position.set(cx, 1.7, cz - 31);
    core.userData.noHit = true;
    scene.add(core);
    const coreLight = new THREE.PointLight(0xff3020, 3, 16, 1.6);
    coreLight.position.set(cx, 2.2, cz - 31);
    scene.add(coreLight);
    ctx.flickerLights.push({ light: coreLight, base: 3, speed: 3 });
    corePos = new THREE.Vector3(cx, 1, cz - 31);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 32), mats.metal);
    ring.position.set(cx, 1.7, cz - 31);
    ring.userData.noHit = true;
    scene.add(ring);
    ctx.interactables.push({ id: "core", kind: "core", x: cx, z: cz - 31, radius: 2.6, prompt: "النواة — كيميرا", used: false });
    noteProp(ctx, "lab_doc", "doc_6", cx - 2, cz + 20, 0.12);
    pickupProp(ctx, "lab_med", "item", cx + 2, cz + 20, "التقاط علبة إسعاف", { item: "medkit", qty: 1 }, 0.14);
    pickupProp(ctx, "lab_ammo", "item", cx - 2, cz - 19, "التقاط خرطوش", { item: "shotgun_ammo", qty: 8 }, 0.14);
    pickupProp(ctx, "lab_bat", "item", cx + 2, cz - 19, "التقاط بطارية", { item: "battery", qty: 1 }, 0.14);
    ctx.interactables.push({ id: "lab_exit", kind: "exit", x: cx, z: cz + 22, radius: 2.2, prompt: "الصعود إلى السطح", data: { labExit: true }, used: false });
    ctx.buildings.push({ x: cx, z: cz - 15, w: 20, d: 46, name: "المختبر — تحت الأرض", poi: true });
    ctx.spawns.push({ kind: "boss", x: cx, z: cz - 15, wander: 6 });
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
  mergePropBuckets(
    scene,
    ctx.staticGeos,
    bucketMats,
    new Set(["glassDark", "paint", "water", "lampGlow", "floorIn", "roof", "labFloor", "fireCone", "fireCore", "smoke"]),
  );

  return {
    colliders: ctx.colliders,
    dynamicColliders: new Map<string, Collider>(),
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
  };
}

// مرجع عرافات الساعة
const clockHandsRef: THREE.Object3D[] = [];

type CarVariantLike = "sedan" | "wreck" | "taxi" | "police" | "ambulance" | "van" | "truck";

function debrisPile(ctx: BuildCtx, x: number, z: number, w2: number, d: number) {
  const rnd2 = seededRandom(Math.floor((x * 31 + z * 17) | 0) || 7);
  const rndLocal = (a: number, b: number) => a + rnd2() * (b - a);
  for (let i = 0; i < Math.floor((w2 * d) / 6); i++) {
    const bw = rndLocal(1.2, 3.6);
    const bh = rndLocal(0.6, 2.4);
    const bd = rndLocal(1.2, 3.4);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x + rndLocal(-w2 / 2.2, w2 / 2.2), bh / 2 + rndLocal(0, 0.8), z + rndLocal(-d / 2.2, d / 2.2)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rndLocal(-0.2, 0.2), rndLocal(0, Math.PI), rndLocal(-0.2, 0.2))),
      new THREE.Vector3(bw, bh, bd),
    );
    pushStatic(ctx, "rubble", new THREE.BoxGeometry(1, 1, 1), m);
  }
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
