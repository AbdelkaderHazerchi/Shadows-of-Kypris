"use client";

// ─────────────────────────────────────────────────────────────
// محرك ظلال كيبريس — GameEngine
// Three.js + PointerLock + قتال + قصة + نهايات + حفظ
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import { audio } from "./audio";
import { setEngine } from "./engineRef";
import { EnemyManager, collideCircle, type Enemy } from "./enemies";
import { buildWorld, zoneAt, type Collider, type WorldData, type Interactable } from "./world";
import { clearCheckpoint, loadCheckpoint, saveCheckpoint, unlockEnding } from "./save";
import { useGame } from "./state";
import {
  AI_REACTIONS,
  ITEMS,
  MESSAGES,
  OBJECTIVE_BY_ID,
  SURVIVOR_BY_ID,
  WEAPONS,
  ZONES,
  translateInteractPrompt,
} from "./content";
import { setSurvivorPose, type DoorDef } from "./props";
import type { EndingId, Lang, MapSnapshot, WeaponId } from "./types";

// ── grain/vignette shader ──
const HorrorShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uDamage: { value: 0 },
    uThreat: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uDamage;
    uniform float uThreat;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      // تشويش خفيف
      float grain = rand(uv * vec2(1024.0 + mod(uTime * 60.0, 100.0), 768.0)) * 0.055;
      // انحراف لوني خفيف عند الحواف
      vec2 dir = uv - 0.5;
      float d2 = dot(dir, dir);
      vec2 off = dir * d2 * 0.012;
      float r = texture2D(tDiffuse, uv - off).r;
      vec4 c = texture2D(tDiffuse, uv);
      float b = texture2D(tDiffuse, uv + off).b;
      vec3 col = vec3(r, c.g, b);
      col += grain - 0.027;
      // فينيت
      float vig = smoothstep(0.95, 0.32, length(dir) * 1.32);
      col *= mix(0.32, 1.0, vig);
      // حواف حمراء عند الخطر/الجرح
      float edge = smoothstep(0.55, 1.0, length(dir) * 1.6);
      col += vec3(0.28, 0.015, 0.01) * edge * (uDamage * 1.4 + uThreat * 0.35);
      col = mix(col, vec3(0.25, 0.02, 0.02), uDamage * 0.35 * edge);
      gl_FragColor = vec4(col, c.a);
    }
  `,
};

const PLAYER_R = 0.42;
const EYE_H = 1.66;
const CROUCH_EYE_H = 0.88;

/** باب تفاعلي من العالم — contract 5-b (WorldData.doors) */
interface DoorEntry {
  id: string;
  def: DoorDef;
  collider: Collider;
  open: boolean;
}
/** عنصر التقاط من العالم — contract 5-b (WorldData.pickups) */
interface PickupEntry {
  id: string;
  obj: THREE.Group;
}

interface BloodParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private horrorPass: ShaderPass | null = null;
  private world: WorldData | null = null;
  private enemies: EnemyManager | null = null;
  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private rafId = 0;
  private disposed = false;
  private runStarted = false;
  private staticMeshes: THREE.Mesh[] = [];

  // player
  private pos = new THREE.Vector3(69, EYE_H, 70);
  private floorY = 0;
  private vel = new THREE.Vector3();
  private lastCullX = -99999;
  private lastCullZ = -99999;
  private lightPool: THREE.PointLight[] = [];
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private mouseDown = false;
  private lastShot = 0;
  private reloadT = 0;
  private swingT = 0;
  private walkPhase = 0;
  private footT = 0;
  private staminaLock = 0;
  private secAcc = 0;
  private zoneT = 0;
  // إحساس اللاعب (5-c)
  private shake = 0;
  private chargeShakeT = 0;
  private fireT = 0;
  private running = false;
  private crouching = false;
  private crouchToggle = false;
  private isHidden = false;
  private curEyeH = EYE_H;
  private bobAmp = 0;
  private swayVX = 0;
  private swayVY = 0;
  private sprintDip = 0;
  private lastHudStamina = 100;
  private lastSyncedLang: Lang | null = null;

  // flashlight
  private flashlight!: THREE.SpotLight;
  private flashTarget!: THREE.Object3D;
  private flickerT = 0;

  // viewmodel
  private vmGroup!: THREE.Group;
  private vmPistol!: THREE.Group;
  private vmShotgun!: THREE.Group;
  private vmCrowbar!: THREE.Group;
  private vmRecoil = 0;
  private vmSlide: THREE.Group | null = null;
  private vmSlideBaseZ = 0;
  private slideKick = 0;
  private vmPump: THREE.Group | null = null;
  private vmPumpBaseZ = 0;
  private pumpAnim = 0;
  private muzzle!: THREE.PointLight;
  private muzzleT = 0;
  private muzzleFlash!: THREE.Mesh;
  private laser: THREE.Line | null = null;

  // fx
  private blood: BloodParticle[] = [];
  private ash: THREE.Points | null = null;

  // story
  private poiFound = new Set<string>();
  private pendingSave: ReturnType<typeof loadCheckpoint> = null;
  private radioChain = 0;
  private waveSpawnT = 0;
  private waveN = 0;
  private extractionReady = false;
  private bossGateClosed = false;
  private bossGateCollider = { minX: 596.8, maxX: 603.2, minZ: -8.4, maxZ: -7.6 };
  private labDoorColliderIdx = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initThree();
    this.bindInput();
    setEngine({ ...this.api, dispose: () => this.dispose() });
    this.loop();
  }

  // ══════════ init ══════════
  private initThree() {
    const w = () => this.canvas.clientWidth || window.innerWidth;
    const h = () => this.canvas.clientHeight || window.innerHeight;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(w(), h(), false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090c10);
    // ضباب كثيف بأسلوب سايلنت هيل يحجب ما بعد 48 متراً ويخلق رهبة بصرية
    this.scene.fog = new THREE.Fog(0x090c10, 10, 48);

    this.camera = new THREE.PerspectiveCamera(72, w() / h(), 0.08, 54);
    this.scene.add(this.camera);

    // إضاءة أساسية — ليل ضبابي بارد متوازن دون بهتان
    const hemi = new THREE.HemisphereLight(0x3a4654, 0x141210, 0.58);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0x7c889e, 0.36);
    moon.position.set(-60, 90, -80);
    this.scene.add(moon);

    // حوض إضاءة نقطية ثابت العدد (لمنع إعادة ترجمة الشيدر والتقطيع أثناء المشي)
    for (let i = 0; i < 6; i++) {
      const pl = new THREE.PointLight(0xffffff, 0, 14, 1.7);
      pl.position.set(0, -100, 0);
      pl.userData.alwaysVisible = true;
      this.scene.add(pl);
      this.lightPool.push(pl);
    }

    // كشاف يدوي واقعي بأسلوب سايلنت هيل (دون تشوهات ظلال الجدران أو بياض مفرط)
    this.flashlight = new THREE.SpotLight(0xffe6ba, 0, 30, 0.68, 0.82, 1.55);
    this.flashlight.castShadow = false;
    this.flashlight.position.set(0.16, -0.14, 0);
    this.camera.add(this.flashlight);
    this.flashTarget = new THREE.Object3D();
    this.flashTarget.position.set(0, -0.04, -6);
    this.camera.add(this.flashTarget);
    this.flashlight.target = this.flashTarget;

    // نموذج السلاح
    this.vmGroup = new THREE.Group();
    this.vmGroup.position.set(0.26, -0.24, -0.5);
    this.camera.add(this.vmGroup);
    this.vmPistol = this.buildPistolVM();
    this.vmShotgun = this.buildShotgunVM();
    this.vmCrowbar = this.buildCrowbarVM();
    this.vmGroup.add(this.vmPistol, this.vmShotgun, this.vmCrowbar);
    this.muzzle = new THREE.PointLight(0xffc871, 0, 14, 1.8);
    this.muzzle.position.set(0.26, -0.1, -1.1);
    this.camera.add(this.muzzle);
    // وميض الفوهة — مستوٍ مضاف بنسيج شعاعي مُولَّد
    this.muzzleFlash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.36),
      new THREE.MeshBasicMaterial({
        map: this.makeRadialTexture(),
        color: 0xffc873,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.muzzleFlash.position.set(0.26, -0.1, -1.14);
    this.muzzleFlash.visible = false;
    this.muzzleFlash.renderOrder = 30;
    this.muzzleFlash.userData.noHit = true;
    this.camera.add(this.muzzleFlash);
    // شعاع ليزر أحمر للمسدس (خط نقطتين يُحدَّث كل إطار)
    const laserGeo = new THREE.BufferGeometry();
    laserGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    this.laser = new THREE.Line(
      laserGeo,
      new THREE.LineBasicMaterial({ color: 0xff2818, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    this.laser.frustumCulled = false;
    this.laser.visible = false;
    this.laser.userData.noHit = true;
    this.scene.add(this.laser);

    // إضاءة بيئية PMREM (تدرج سماء ليلي مزرق → أسود)
    this.buildEnvironment();

    // رماد متساقط
    const ashGeo = new THREE.BufferGeometry();
    const N = 700;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 26;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    ashGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.ash = new THREE.Points(
      ashGeo,
      new THREE.PointsMaterial({ color: 0x8a8478, size: 0.07, transparent: true, opacity: 0.5, sizeAttenuation: true }),
    );
    this.scene.add(this.ash);

    // post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, Math.floor(w() / 2)), Math.max(1, Math.floor(h() / 2))),
      0.3,
      0.7,
      0.84,
    );
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
    this.horrorPass = new ShaderPass(HorrorShader);
    this.composer.addPass(this.horrorPass);

    window.addEventListener("resize", this.onResize);
  }

  /** نسيج شعاعي مُولَّد على canvas — لوميض الفوهة */
  private makeRadialTexture(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, "rgba(255,244,200,1)");
    grad.addColorStop(0.22, "rgba(255,196,110,0.9)");
    grad.addColorStop(0.55, "rgba(255,120,30,0.32)");
    grad.addColorStop(1, "rgba(255,70,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  /** بيئة انعكاس خافتة: كرة متدرجة + ضوءان خافتان → PMREM يُضبط مرة واحدة */
  private buildEnvironment() {
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      const geo = new THREE.SphereGeometry(50, 16, 12);
      const posAttr = geo.attributes.position;
      const colors = new Float32Array(posAttr.count * 3);
      const top = new THREE.Color(0x232a33);
      const bottom = new THREE.Color(0x050506);
      const c = new THREE.Color();
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i) / 50; // -1..1
        c.copy(bottom).lerp(top, Math.max(0, y * 0.5 + 0.5));
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const sphere = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }),
      );
      envScene.add(sphere);
      const l1 = new THREE.PointLight(0x35404d, 220, 160);
      l1.position.set(-20, 25, -15);
      envScene.add(l1);
      const l2 = new THREE.PointLight(0x3d2a1a, 140, 140);
      l2.position.set(18, 12, 20);
      envScene.add(l2);
      const rt = pmrem.fromScene(envScene, 0.04);
      this.scene.environment = rt.texture;
      pmrem.dispose();
      geo.dispose();
      (sphere.material as THREE.Material).dispose();
    } catch {
      /* البيئة اختيارية — لا تعطّل المحرك */
    }
  }

  private buildPistolVM(): THREE.Group {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.4, metalness: 0.8 });
    const dark2 = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.55, metalness: 0.5 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.92, metalness: 0.05 });
    // الإطار السفلي
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.05, 0.24), dark2);
    frame.position.set(0, -0.006, -0.05);
    g.add(frame);
    // المزلق (SLIDE) — يرتدّ 0.05 للخلف عند الإطلاق ثم يعود
    const slide = new THREE.Group();
    const slideBody = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.052, 0.3), dark);
    slideBody.position.set(0, 0.033, -0.1);
    slide.add(slideBody);
    for (let i = 0; i < 5; i++) {
      const ser = new THREE.Mesh(new THREE.BoxGeometry(0.057, 0.034, 0.006), dark2);
      ser.position.set(0, 0.033, 0.028 + i * 0.016);
      slide.add(ser);
    }
    // معالم أمامية وخلفية على المزلق
    const sightF = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.014, 0.01), dark2);
    sightF.position.set(0, 0.066, -0.235);
    const sightR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.012), dark2);
    sightR.position.set(0, 0.064, 0.038);
    slide.add(sightF, sightR);
    this.vmSlideBaseZ = 0;
    g.add(slide);
    this.vmSlide = slide;
    // الأنبوب
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), dark2);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.033, -0.272);
    g.add(barrel);
    // القبضة
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.15, 0.058), gripMat);
    grip.position.set(0, -0.095, 0.035);
    grip.rotation.x = 0.24;
    g.add(grip);
    // أضلاع القبضة (ملمس)
    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.008, 0.06), dark2);
      rib.position.set(0, -0.05 - i * 0.028, 0.028 + i * 0.0065);
      rib.rotation.x = 0.24;
      g.add(rib);
    }
    // واقي الزناد + الزناد
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 12, Math.PI * 1.3), dark2);
    guard.rotation.set(0, Math.PI / 2, 0);
    guard.position.set(0, -0.034, -0.018);
    g.add(guard);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.008), dark);
    trigger.position.set(0, -0.028, -0.014);
    g.add(trigger);
    // المطرقة
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, 0.014), dark2);
    hammer.position.set(0, 0.024, 0.055);
    hammer.rotation.x = -0.5;
    g.add(hammer);
    g.rotation.y = -0.06;
    return g;
  }
  private buildShotgunVM(): THREE.Group {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.42, metalness: 0.85 });
    const dark2 = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.55, metalness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.72 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x3a2718, roughness: 0.8 });
    // الأنبوب الرئيسي + حلقة الفوهة
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.66, 12), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.035, -0.32);
    g.add(barrel);
    const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 12), dark2);
    muzzleRing.rotation.x = Math.PI / 2;
    muzzleRing.position.set(0, 0.035, -0.63);
    g.add(muzzleRing);
    // الأنبوب السفلي (المخزن)
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.56, 10), steel);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, -0.008, -0.28);
    g.add(tube);
    // المضخة (PUMP) — تنزلق ذهاباً وإياباً أثناء إعادة التلقيم
    const pump = new THREE.Group();
    const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.17, 12), wood);
    pumpBody.rotation.x = Math.PI / 2;
    pump.add(pumpBody);
    for (let i = 0; i < 4; i++) {
      const groove = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.004, 6, 14), woodDark);
      groove.position.z = -0.06 + i * 0.04;
      pump.add(groove);
    }
    pump.position.set(0, -0.008, -0.34);
    this.vmPumpBaseZ = pump.position.z;
    g.add(pump);
    this.vmPump = pump;
    // جسم الارتكاز + نافذة الطرد
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.2), steel);
    receiver.position.set(0, 0.012, 0.02);
    g.add(receiver);
    const port = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.02, 0.06), dark2);
    port.position.set(0, 0.035, 0.01);
    g.add(port);
    // المؤخرة الخشبية المائلة + كتفها
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.1, 0.26), wood);
    stock.position.set(0, -0.055, 0.24);
    stock.rotation.x = -0.14;
    g.add(stock);
    const butt = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.115, 0.03), woodDark);
    butt.position.set(0, -0.073, 0.365);
    butt.rotation.x = -0.14;
    g.add(butt);
    // حبة أمامية معدنية
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.007, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8b24a, roughness: 0.3, metalness: 0.9 }),
    );
    bead.position.set(0, 0.062, -0.635);
    g.add(bead);
    g.rotation.y = -0.04;
    return g;
  }
  private buildCrowbarVM(): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4c30, roughness: 0.86, metalness: 0.05 });
    const bark = new THREE.MeshStandardMaterial({ color: 0x47311d, roughness: 0.92, metalness: 0.04 });
    const wrap = new THREE.MeshStandardMaterial({ color: 0x9e927c, roughness: 0.95 });
    // العمود الخشبي الرئيسي المائل (عصا خشبية واقعية بعقد وتفاصيل لحاء)
    const shaftTilt = { rx: Math.PI / 2 - 0.24, rz: 0.08 };
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.64, 10), wood);
    shaft.rotation.set(shaftTilt.rx, 0, shaftTilt.rz);
    shaft.position.set(0, 0.035, -0.29);
    g.add(shaft);
    // عقد خشبية على طول العصا
    for (const [ky, kz] of [
      [0.06, -0.36],
      [0.10, -0.49],
    ] as const) {
      const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.019, 0.038, 8), bark);
      knot.rotation.set(shaftTilt.rx, 0, shaftTilt.rz);
      knot.position.set(0, ky, kz);
      g.add(knot);
    }
    // رأس العصا الخشبي المدبب الخشن
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.065, 8), bark);
    tip.rotation.set(shaftTilt.rx - Math.PI, 0, shaftTilt.rz);
    tip.position.set(-0.02, 0.145, -0.585);
    g.add(tip);
    // لفافة القماش على المقبض
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.024, 0.16, 10), wrap);
    grip.rotation.set(shaftTilt.rx, 0, shaftTilt.rz);
    grip.position.set(0.01, -0.015, -0.11);
    g.add(grip);
    g.rotation.z = 0.32;
    return g;
  }

  // ══════════ input ══════════
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Tab") e.preventDefault();
    this.keys.add(e.code);
    const st = useGame.getState();
    if (st.screen === "playing") {
      if (e.code === "KeyF") this.toggleFlashlight();
      else if (e.code === "KeyR") this.startReload();
      else if (e.code === "KeyC" && !e.repeat) {
        this.crouchToggle = !this.crouchToggle;
      } else if (e.code === "Digit1" && st.weapons.crowbar && st.hud.stickHits > 0) {
        this.switchWeapon("crowbar");
      } else if (e.code === "Digit2" && st.weapons.pistol) this.switchWeapon("pistol");
      else if (e.code === "Digit3" && st.weapons.shotgun) this.switchWeapon("shotgun");
      else if (e.code === "KeyE") this.tryInteract();
      else if (e.code === "KeyJ") {
        st.setScreen("missions");
        document.exitPointerLock();
      } else if (e.code === "Tab") {
        st.setScreen("inventory");
        document.exitPointerLock();
      } else if (e.code === "KeyM") {
        st.setScreen("map");
        document.exitPointerLock();
      }
    } else if (st.screen === "inventory" && (e.code === "Tab" || e.code === "Escape")) {
      st.setScreen("playing");
      this.lockPointer();
    } else if (st.screen === "map" && (e.code === "KeyM" || e.code === "Escape" || e.code === "Tab")) {
      st.setScreen("playing");
      this.lockPointer();
    } else if (st.screen === "missions" && (e.code === "KeyJ" || e.code === "Escape")) {
      st.setScreen("playing");
      this.lockPointer();
    } else if (st.screen === "note" && (e.code === "Escape" || e.code === "KeyE")) {
      st.setNote(null);
      st.setScreen("playing");
      this.lockPointer();
    }
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== this.canvas) return;
    const st = useGame.getState();
    if (st.screen !== "playing") return;
    if (Math.abs(e.movementX) > 350 || Math.abs(e.movementY) > 350) return;
    const s = 0.0026;
    this.yaw -= e.movementX * s;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - e.movementY * s));
    // تحديث زاوية الكاميرا فوراً بدون أي تأخير
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    // انجراف خفيف للسلاح فقط
    this.swayVX = Math.max(-0.045, Math.min(0.045, this.swayVX - e.movementX * 0.00035));
    this.swayVY = Math.max(-0.045, Math.min(0.045, this.swayVY - e.movementY * 0.0003));
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const st = useGame.getState();
    if (st.screen !== "playing") return;
    if (document.pointerLockElement !== this.canvas) {
      this.lockPointer();
      return;
    }
    this.mouseDown = true;
    this.shoot();
  };
  private onMouseUp = () => {
    this.mouseDown = false;
  };
  private onPointerLockChange = () => {
    const st = useGame.getState();
    if (document.pointerLockElement !== this.canvas && st.screen === "playing" && !st.aiChoiceOpen) {
      st.setScreen("paused");
    }
  };
  private onResize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  };
  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
  }

  private lockPointer() {
    if (document.pointerLockElement !== this.canvas) {
      try {
        const req = this.canvas.requestPointerLock as unknown as (opts?: {
          unadjustedMovement?: boolean;
        }) => Promise<void> | undefined;
        const res = req?.call(this.canvas, { unadjustedMovement: true });
        if (res && typeof res.catch === "function") {
          res.catch(() => {
            this.canvas.requestPointerLock?.();
          });
        }
      } catch {
        this.canvas.requestPointerLock?.();
      }
    }
  }

  // ══════════ public API ══════════
  private api = {
    startNewGame: () => {
      clearCheckpoint();
      useGame.getState().setHasSave(false);
      useGame.getState().resetRun();
      this.lastLoadedPos = null;
      this.lastLoadedYaw = 0;
      this.radioChain = 0;
      this.extractionReady = false;
      this.bossGateClosed = false;
      this.waveN = 0;
      useGame.getState().setScreen("intro");
    },
    continueGame: () => {
      const save = loadCheckpoint();
      if (!save) {
        useGame.getState().showHint(MESSAGES.noSaveAvailable);
        return;
      }
      this.pendingSave = save;
      this.lastLoadedPos = [save.pos[0], save.pos[1]];
      this.lastLoadedYaw = save.yaw;
      useGame.getState().applySave(save);
      this.beginRun();
    },
    startRun: () => {
      this.beginRun();
    },
    pause: () => {
      const st = useGame.getState();
      if (st.screen === "playing") {
        st.setScreen("paused");
        document.exitPointerLock();
      }
    },
    resume: () => {
      const st = useGame.getState();
      if (st.screen === "paused" || st.screen === "playing") {
        st.setScreen("playing");
        this.lockPointer();
      }
    },
    quitToMenu: () => {
      useGame.getState().setScreen("menu");
      document.exitPointerLock();
      audio.stopHeartbeat();
      audio.setThreat(0);
      audio.setHeli(false);
      audio.setFire(0);
      audio.startAmbient("menu");
    },
    equipWeapon: (w: WeaponId | null) => {
      useGame.getState().equip(w);
    },
    reload: () => this.startReload(),
    getMapSnapshot: (): MapSnapshot | null => {
      if (!this.world) return null;
      const discovered = (name: string) => this.poiFound.has(name);
      // لا نضع علامات أهداف مباشرة على الخريطة حتى يعتمد اللاعب على قراءة الوثائق والاستنتاج الذكي
      const markers: MapSnapshot["markers"] = [];
      return {
        buildings: this.world.buildings.map((b) => ({
          ...b,
          discovered: b.poi ? discovered(b.name!) : true,
        })),
        roads: this.world.roads.map((r) => ({
          ...r,
          blocked: this.world!.blockedRoads.some(
            (b) => Math.abs(b.x - r.x) < r.w / 2 + 1 && Math.abs(b.z - r.z) < 5,
          ),
        })),
        player: { x: this.pos.x, z: this.pos.z, yaw: this.yaw },
        markers,
      };
    },
    chooseAI: (choice: "destroy" | "deal" | "leave") => {
      this.resolveAI(choice);
    },
  };

  // ══════════ run lifecycle ══════════
  private beginRun() {
    const st = useGame.getState();
    st.resetRun();
    if (this.pendingSave) {
      st.applySave(this.pendingSave);
      this.pendingSave = null;
    }
    if (!this.world) {
      this.world = buildWorld(this.scene);
      this.enemies = new EnemyManager(this.scene, {
        damagePlayer: (n, fx, fz) => this.damagePlayer(n, fx, fz),
        onDeath: (e) => this.onEnemyDeath(e),
        spawnAdds: (x, z, kind, n) => {
          for (let i = 0; i < n; i++) {
            this.enemies!.addAt(x + (Math.random() - 0.5) * 6, z + 4 + i * 2, kind);
          }
          this.hitMeshesCache = null;
        },
      });
      this.prewarmGpu();
    }

    // إعادة ضبط العالم والأعداء والوثائق والأبواب بالكامل عند بدء رحلة جديدة أو استئناف حفظ بعد الموت
    this.resetWorldState();

    // موضع البداية أو نقطة الحفظ
    if (this.lastLoadedPos) {
      this.pos.set(this.lastLoadedPos[0], EYE_H, this.lastLoadedPos[1]);
      this.yaw = this.lastLoadedYaw;
    } else {
      this.pos.set(-23, EYE_H, -70);
      this.yaw = Math.PI; // نحو الباب الجنوبي
    }
    this.floorY = 0;
    this.crouching = false;
    this.crouchToggle = false;
    this.isHidden = false;
    this.curEyeH = EYE_H;
    this.resolveVerticalHeight(this.pos.x, this.pos.z, 1);
    this.pos.y = this.floorY + EYE_H;
    this.lastCullX = -99999;
    this.lastCullZ = -99999;
    this.pitch = 0;
    this.vel.set(0, 0, 0);

    // حالة مشتقة من الأعلام (استكمال من حفظ)
    const s = useGame.getState();
    if (s.flags.generatorFixed || s.flags.coreDestroyed || s.flags.dealAccepted) {
      this.openGateBarrier();
    }
    if (s.flags.waveDone) {
      this.extractionReady = true;
      this.world!.boatLight.intensity = 3.2;
    }
    if (s.flags.coreDestroyed && s.hud.escapeTimer < 0 && !s.flags.extracted) {
      useGame.getState().setHud({ escapeTimer: 240 });
    }
    if (s.flags.labEntered) {
      this.world.labDoor.open = true;
      this.world.labDoor.group.position.y = -3.5;
      this.removeLabDoorCollider();
    }
    if (s.flags.bossKilled) this.openBossGate();
    if (s.hud.equipped && !s.weapons[s.hud.equipped]) {
      s.equip(null);
    }
    this.lastHudStamina = s.hud.stamina;
    this.poiFound.add("شقتك");

    // أهداف واجهة
    const obj = OBJECTIVE_BY_ID[s.objectiveId];
    s.setHud({ objective: obj?.text ?? "", optionalObjective: obj?.optional ?? "", zone: "" });

    this.runStarted = true;
    s.setScreen("playing");
    audio.init();
    audio.startAmbient(s.flags.labEntered ? "lab" : "city");
    if (this.extractionReady) audio.setHeli(true);
    this.lockPointer();
    st.showHint(MESSAGES.pointerLockHint);
  }

  /** إعادة تهيئة العالم والأعداء والتفاعلات بالكامل لبدء جولة جديدة أو استعادة حفظ بعد الموت */
  private resetWorldState() {
    if (!this.world || !this.enemies) return;
    const s = useGame.getState();

    // 1) إزالة الغنائم المؤقتة الساقطة من الأعداء في الجولة السابقة
    for (let i = this.world.interactables.length - 1; i >= 0; i--) {
      if (this.world.interactables[i].id.startsWith("drop_")) {
        this.world.interactables.splice(i, 1);
      }
    }

    // 2) إعادة تفعيل جميع العناصر القابلة للتفاعل ومزامنتها مع حالة الحفظ الحالية
    for (const it of this.world.interactables) {
      if (it.kind === "note") {
        // الوثائق والتسجيلات الصوتية تبقى قابلة للفتح والقراءة دائماً
        it.used = false;
      } else if (it.kind === "item") {
        if (it.data?.locker) {
          it.used = Boolean(s.flags.lockerOpened);
        } else if (it.data?.weapon) {
          const w = it.data.weapon as "crowbar" | "pistol" | "shotgun";
          it.used = w === "crowbar" ? false : Boolean(s.weapons[w]);
        } else {
          const item = it.data?.item as string;
          if (item === "key_tower") {
            it.used = Boolean(s.flags.hasTowerKey || s.hasItem("key_tower"));
          } else if (item === "keycard_blue" || item === "keycard_red") {
            it.used = Boolean(s.flags.labEntered || s.hasItem(item as never));
          } else {
            it.used = false;
          }
        }
      } else if (it.kind === "console") {
        it.used = Boolean(s.flags.radioDone);
      } else if (it.kind === "generator") {
        it.used = Boolean(s.flags.generatorFixed);
      } else if (it.kind === "gate") {
        it.used = Boolean(s.flags.labEntered);
      } else if (it.kind === "core") {
        it.used = Boolean(s.flags.metAI);
      } else if (it.kind === "npc") {
        const sid = it.data?.survivor as "sara" | "adel" | "soldier";
        it.used = Boolean(
          sid === "sara" ? s.flags.saraSaved : sid === "adel" ? s.flags.adelSaved : s.flags.soldierSaved,
        );
      } else {
        it.used = false;
      }
    }

    // 3) إعادة إظهار مجسمات الالتقاط والوثائق في المشهد
    const usedIds = new Set<string>();
    for (const it of this.world.interactables) {
      if (it.used) usedIds.add(it.id);
    }
    for (const p of this.pickupList()) {
      if (p.obj.userData.baseY === undefined) {
        p.obj.userData.baseY = p.obj.position.y;
        p.obj.userData.phase = Math.random() * Math.PI * 2;
      }
      const picked = usedIds.has(p.id);
      p.obj.userData.pickedUp = picked;
      p.obj.visible = !picked;
    }

    // 4) إعادة ضبط الأبواب ومصادماتها
    for (const d of this.doorList()) {
      if (d.def.group.userData.baseRy === undefined) {
        d.def.group.userData.baseRy = d.def.group.rotation.y;
      }
      const shouldOpen = d.id === "door_apt" && Boolean(s.flags.exitedApartment);
      d.open = shouldOpen;
      d.def.open = shouldOpen;
      if (d.def.kind === "double") {
        const kids = d.def.group.children;
        if (kids[0]) kids[0].rotation.y = shouldOpen ? -1.6 : 0;
        if (kids[1]) kids[1].rotation.y = shouldOpen ? 1.6 : 0;
      } else {
        const baseRy = (d.def.group.userData.baseRy as number | undefined) ?? 0;
        d.def.group.rotation.y = shouldOpen ? baseRy - 1.9 : baseRy;
      }
      if (shouldOpen) this.world.dynamicColliders.delete(`door_${d.id}`);
      else this.world.dynamicColliders.set(`door_${d.id}`, d.collider);
    }

    // 5) إعادة ضبط بوابة المختبر وبوابة الزعيم وحاجز الميناء
    if (this.world.labDoor.open && !s.flags.labEntered) {
      this.world.labDoor.open = false;
      this.world.labDoor.group.position.y = 0;
      if (this.labDoorColliderIdx >= 0) {
        const dp = this.world.labDoor.group.position;
        this.world.colliders.push({
          minX: dp.x - 2.1,
          maxX: dp.x + 2.1,
          minZ: dp.z - 0.3,
          maxZ: dp.z + 0.3,
          minY: 0,
          maxY: 3.8,
        });
        this.labDoorColliderIdx = -1;
      }
    }
    if (this.world.gateBarrier.open && !s.flags.generatorFixed && !s.flags.coreDestroyed && !s.flags.dealAccepted) {
      this.world.gateBarrier.open = false;
      this.world.gateBarrier.group.children.forEach((c) => (c.position.y += 3.2));
      this.world.colliders.push({ minX: -5.5, maxX: 5.5, minZ: 98.8, maxZ: 100.2 });
    }
    this.bossGateClosed = false;
    this.world.labBossGate.mesh.visible = false;
    this.world.dynamicColliders.delete("bossGate");
    this.extractionReady = false;
    this.world.boatLight.intensity = 0;
    this.radioChain = 0;
    this.waveN = 0;
    this.waveSpawnT = 0;

    // 6) إعادة ضبط محفزات المناطق ونقاط الخريطة
    for (const tr of this.world.triggers) {
      tr.fired = false;
    }
    this.poiFound.clear();
    this.poiFound.add("شقتك");

    // 7) إعادة توليد الأعداء بالكامل من جديد
    this.enemies.clear();
    this.enemies.spawnFromPoints(this.world.spawns);
    const fakeSpots: [number, number][] = [
      [30, 30],
      [-30, -30],
      [-55, 15],
      [40, -26],
    ];
    for (const [fx, fz] of fakeSpots) {
      this.enemies.addFakeCorpse(fx, fz, "runner");
    }
    if (s.flags.bossKilled) {
      for (const e of this.enemies.enemies) {
        if (e.kind === "boss") {
          e.state = "dead";
          this.scene.remove(e.group);
        }
      }
    }

    // 8) إعادة ضبط مواقع وحالات الناجين (إما في أماكنهم الأصلية أو على متن القارب إذا أُنقذوا في الحفظ)
    for (const sv of this.world.survivors) {
      const isSaved =
        sv.id === "sara"
          ? s.flags.saraSaved
          : sv.id === "adel"
            ? s.flags.adelSaved
            : s.flags.soldierSaved;
      if (isSaved) {
        sv.state = "on_boat";
        sv.wpIndex = sv.waypoints.length;
        sv.obj.position.set(sv.boatPos[0], sv.boatPos[1], sv.boatPos[2]);
        sv.obj.rotation.y = sv.boatRy;
        setSurvivorPose(sv.obj, "boat", 0, sv.id);
      } else {
        sv.state = "idle";
        sv.wpIndex = 0;
        sv.walkTime = 0;
        sv.obj.position.set(sv.startX, sv.startY, sv.startZ);
        sv.obj.rotation.y = sv.startRy;
        setSurvivorPose(sv.obj, "initial", 0, sv.id);
      }
    }
    this.hitMeshesCache = null;
  }

  private lastLoadedPos: [number, number] | null = null;
  private lastLoadedYaw = 0;
  private lastEscapeSec = -1;
  private lastWaveSec = -1;

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    window.removeEventListener("resize", this.onResize);
    audio.stopHeartbeat();
    audio.stopAmbient();
    audio.setHeli(false);
    audio.setFire(0);
    setEngine(null);
    this.renderer?.dispose();
  }

  // ══════════ combat ══════════
  private switchWeapon(w: WeaponId) {
    const st = useGame.getState();
    if (st.hud.equipped === w) return;
    st.equip(w);
    this.reloadT = 0;
    st.setHud({ reloading: false });
    audio.play("ui_click", { volume: 0.5 });
  }

  private startReload() {
    const st = useGame.getState();
    const w = st.hud.equipped;
    if (!w || WEAPONS[w].melee) return;
    const def = WEAPONS[w];
    const mag = w === "pistol" ? st.hud.pistolMag : st.hud.shotgunMag;
    const reserve = w === "pistol" ? st.hud.pistolAmmo : st.hud.shotgunAmmo;
    if (this.reloadT > 0 || mag >= def.magSize || reserve <= 0) return;
    this.reloadT = def.reloadTime;
    st.setHud({ reloading: true });
    audio.play("reload_start");
  }

  private finishReload() {
    const st = useGame.getState();
    const w = st.hud.equipped;
    if (!w) return;
    const def = WEAPONS[w];
    if (w === "pistol") {
      const need = def.magSize - st.hud.pistolMag;
      const take = Math.min(need, st.hud.pistolAmmo);
      st.setHud({ pistolMag: st.hud.pistolMag + take, pistolAmmo: st.hud.pistolAmmo - take, reloading: false });
    } else {
      const need = def.magSize - st.hud.shotgunMag;
      const take = Math.min(need, st.hud.shotgunAmmo);
      st.setHud({ shotgunMag: st.hud.shotgunMag + take, shotgunAmmo: st.hud.shotgunAmmo - take, reloading: false });
    }
    audio.play("reload_end");
    if (w === "shotgun") audio.play("pump", { volume: 0.6 });
  }

  private shoot() {
    const st = useGame.getState();
    const w = st.hud.equipped;
    if (!w || st.hud.reloading) return;
    const def = WEAPONS[w];
    const now = performance.now() / 1000;
    if (now - this.lastShot < def.fireRate) return;

    if (def.melee) {
      if (!st.weapons.crowbar || st.hud.stickHits <= 0) return;
      this.lastShot = now;
      this.swingT = 0.28;
      this.vmRecoil = 1;
      audio.play("swing");
      // ضربة قريبة بالعصا الخشبية
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      this.raycaster.far = def.range;
      const hits = this.raycaster.intersectObjects(this.hitTargets(), true);
      const hit = this.pickEnemyHit(hits);
      if (hit) {
        const e = hit.object.userData.enemy as Enemy;
        this.enemies!.damageAt(e, def.damage, hit.object.userData.isHead === true);
        this.spawnBlood(hit.point);
        audio.play("hit_flesh", { volume: 0.8 });
      } else if (hits.length > 0) {
        this.spawnBlood(hits[0].point, 0x7a5230, 4);
      }
      // اهتراء العصا الخشبية وانكسارها بعد 7 إلى 11 ضربة
      const nextHits = st.hud.stickHits - 1;
      if (nextHits <= 0) {
        const breakPos = new THREE.Vector3();
        this.camera.getWorldPosition(breakPos);
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        breakPos.addScaledVector(dir, 0.85);
        this.spawnBlood(breakPos, 0x7a5230, 12);
        audio.play("hit_head", { volume: 0.65 });
        audio.play("door_locked", { volume: 0.55 });
        st.breakStick();
        st.toastMsg(MESSAGES.stickBroken);
      } else {
        st.setHud({ stickHits: nextHits });
        if (nextHits === 2) {
          st.toastMsg(MESSAGES.stickLow);
        }
      }
      return;
    }

    const mag = w === "pistol" ? st.hud.pistolMag : st.hud.shotgunMag;
    if (mag <= 0) {
      audio.play("dryfire");
      this.startReload();
      return;
    }
    this.lastShot = now;
    st.addShot();
    if (w === "pistol") st.setHud({ pistolMag: mag - 1 });
    else st.setHud({ shotgunMag: mag - 1 });

    audio.play(w === "pistol" ? "shot_pistol" : "shot_shotgun");
    this.muzzleT = 0.06;
    this.muzzle.intensity = 26;
    this.vmRecoil = 1;
    // وميض الفوهة — دوران/حجم عشوائي لكل طلقة
    this.muzzleFlash.visible = true;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    const fs = 0.85 + Math.random() * 0.5;
    this.muzzleFlash.scale.set(fs, fs, 1);
    if (w === "pistol") this.slideKick = 1;
    else this.addShake(0.12);
    this.pitch = Math.min(1.35, this.pitch + (w === "shotgun" ? 0.035 : 0.016));
    this.enemies!.noise(this.pos.x, this.pos.z, def.noise);

    const pellets = def.pellets ?? 1;
    for (let i = 0; i < pellets; i++) {
      const spread = def.spread ?? 0.004;
      const v = new THREE.Vector2(
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2,
      );
      this.raycaster.setFromCamera(v, this.camera);
      this.raycaster.far = def.range;
      const hits = this.raycaster.intersectObjects(this.hitTargets(), true);
      const res = this.pickEnemyHit(hits);
      if (res) {
        const e = res.object.userData.enemy as Enemy;
        const isHead = res.object.userData.isHead === true;
        const dmg = def.damage * (isHead ? def.headMult : 1);
        this.enemies!.damageAt(e, dmg, isHead);
        this.spawnBlood(res.point);
        audio.play(isHead ? "hit_head" : "hit_flesh", { volume: 0.7 });
        if (isHead) st.addHeadshot();
      } else if (hits.length > 0) {
        // اصطدام بجدار — شرارة غبار
        this.spawnBlood(hits[0].point, 0x6a655c, 3);
      }
    }
  }

  private hitMeshesCache: THREE.Object3D[] | null = null;
  private hitTargets(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    if (this.enemies) {
      for (const e of this.enemies.enemies) {
        if (e.state !== "dead" && e.group.visible) list.push(e.group);
      }
    }
    if (this.world) {
      for (const c of this.world.chunks) {
        if (c.group.visible) list.push(c.group);
      }
      for (const d of this.doorList()) {
        if (!d.open && d.def.group.visible) list.push(d.def.group);
      }
    }
    return list;
  }

  private pickEnemyHit(hits: THREE.Intersection[]): THREE.Intersection | null {
    for (const h of hits) {
      if (h.object.userData.enemy) return h;
    }
    return null;
  }

  private spawnBlood(p: THREE.Vector3, color = 0x5c0f0f, n = 6) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 0.05),
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      m.position.copy(p);
      m.userData.noHit = true;
      this.scene.add(m);
      this.blood.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.4,
          Math.random() * 2.2,
          (Math.random() - 0.5) * 2.4,
        ),
        life: 0.42,
      });
    }
  }

  private onEnemyDeath(e: Enemy) {
    const st = useGame.getState();
    st.addKill();
    // إسقاط غنيمة أحياناً
    if (Math.random() < 0.22 && this.world) {
      const kinds = ["pistol_ammo", "bandage", "pistol_ammo", "battery"];
      const item = kinds[Math.floor(Math.random() * kinds.length)];
      const qty = item === "pistol_ammo" ? 8 : 1;
      this.world.interactables.push({
        id: `drop_${e.id}`,
        kind: "item",
        x: e.group.position.x + (Math.random() - 0.5) * 1.4,
        z: e.group.position.z + (Math.random() - 0.5) * 1.4,
        radius: 1.8,
        prompt: MESSAGES.lootDropPrompt,
        data: { item, qty },
        used: false,
      });
    }
    if (e.kind === "brute" && Math.hypot(e.group.position.x + 23, e.group.position.z - 23) < 26) {
      st.setFlag("bruteHospitalKilled", true);
      st.toastMsg(MESSAGES.bruteHospitalKilled);
    }
    if (e.kind === "boss") {
      st.setFlag("bossKilled", true);
      this.openBossGate();
      st.toastMsg(MESSAGES.bossKilled);
      audio.play("stinger_discover");
    }
  }

  private openBossGate() {
    if (!this.world || !this.bossGateClosed) return;
    this.bossGateClosed = false;
    this.world.labBossGate.mesh.visible = false;
    this.world.dynamicColliders.delete("bossGate");
  }

  private closeBossGate() {
    if (!this.world || this.bossGateClosed) return;
    this.bossGateClosed = true;
    this.world.labBossGate.mesh.visible = true;
    this.world.dynamicColliders.set("bossGate", this.bossGateCollider);
  }

  // ══════════ player damage / death ══════════
  private damagePlayer(n: number, fromX: number, fromZ: number) {
    const st = useGame.getState();
    if (st.hud.hp <= 0) return;
    const newHp = Math.max(0, st.hud.hp - n);
    st.setHud({ hp: newHp });
    st.damageFlash();
    st.addDamage(n);
    this.addShake(0.5);
    audio.play("hit_flesh", { volume: 0.9 });
    // دفعة للخلف
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.vel.x += (dx / d) * 2.6;
    this.vel.z += (dz / d) * 2.6;
    if (newHp <= 0) {
      this.finish("ending_death");
    }
  }

  private finish(endingId: EndingId) {
    const st = useGame.getState();
    st.setEnding(endingId);
    st.setScreen("ending");
    document.exitPointerLock();
    audio.stopHeartbeat();
    audio.setThreat(0);
    audio.setHeli(false);
    audio.setFire(0);
    if (endingId === "ending_death") {
      audio.play("explosion", { volume: 0.5 });
      // نحتفظ بآخر نقطة حفظ إن وجدت ليتمكن اللاعب من الاستئناف منها أو بدء رحلة جديدة
      st.setHasSave(Boolean(loadCheckpoint()));
    }
    unlockEnding(endingId);
  }

  // ══════════ interaction ══════════
  private currentInteract: Interactable | null = null;
  private forward = new THREE.Vector3();

  private findInteract(): Interactable | null {
    if (!this.world) return null;
    this.camera.getWorldDirection(this.forward);
    const fLen = Math.hypot(this.forward.x, this.forward.z) || 1;
    const fx = this.forward.x / fLen;
    const fz = this.forward.z / fLen;
    let best: Interactable | null = null;
    let bestScore = -1;
    const playerInteractionY = this.floorY + 1.0;
    for (const it of this.world.interactables) {
      if (it.used) continue;
      const iy = it.y ?? 1.0;
      if (Math.abs(iy - playerInteractionY) > 2.5) continue;
      const dx = it.x - this.pos.x;
      const dz = it.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius) continue;
      const dot = (dx / (d || 1)) * fx + (dz / (d || 1)) * fz;
      if (dot < -0.1 && d > 0.95) continue;
      if (dot < 0.12 && d > 1.55) continue;
      const noteBonus = it.kind === "note" ? 0.35 : 0;
      const score = dot + (it.radius - d) + noteBonus;
      if (score > bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  private tryInteract() {
    const it = this.currentInteract;
    if (!it) return;
    const st = useGame.getState();
    switch (it.kind) {
      case "item": {
        // خزانة أسلحة الشرطة — قبل أي منطق التقاط عام
        if (it.data?.locker) {
          if (st.flags.lockerOpened) {
            st.showHint(MESSAGES.lockerAlreadyOpened);
            return;
          }
          if (!st.hasItem("key_locker")) {
            st.toastMsg(MESSAGES.lockerNeedKey);
            audio.play("door_locked");
            return;
          }
          st.consumeFirst("key_locker");
          st.addItem("pistol_ammo", 30);
          st.addItem("shotgun_ammo", 10);
          st.addItem("medkit", 1);
          st.setFlag("lockerOpened", true);
          st.toastMsg(MESSAGES.lockerOpened);
          audio.play("pickup");
          audio.play("radio_beep", { volume: 0.5 });
          it.used = true;
          this.hidePickup(it.id);
          return;
        }
        const item = it.data?.item as string;
        const qty = (it.data?.qty as number) ?? 1;
        if (it.data?.weapon) {
          const wType = it.data.weapon as "crowbar" | "pistol" | "shotgun";
          if (wType === "crowbar") {
            if (st.weapons.crowbar && st.hud.stickHits >= st.hud.stickMaxHits && st.hud.stickMaxHits > 0) {
              st.toastMsg(MESSAGES.stickAlreadyHave);
              return;
            }
            const hits = 7 + Math.floor(Math.random() * 5);
            st.giveWeapon("crowbar", hits);
            if (!st.hud.equipped) st.equip("crowbar");
            st.toastMsg(MESSAGES.stickPickedUp(hits));
            audio.play("pickup");
            it.used = true;
            this.hidePickup(it.id);
            return;
          }
          st.giveWeapon(wType);
          st.toastMsg(MESSAGES.pickedUp(WEAPONS[wType].name));
          audio.play("pickup");
          it.used = true;
          this.hidePickup(it.id);
          if (st.objectiveId === "obj_wake" || st.objectiveId === "obj_weapon") {
            st.setObjective("obj_police");
            st.showHint(MESSAGES.gotFirearmHint);
          } else {
            st.showHint(MESSAGES.switchWeaponHint);
          }
          return;
        }
        const ok = st.addItem(item as never, qty);
        if (!ok) {
          st.toastMsg(MESSAGES.inventoryFull);
          return;
        }
        const { ITEMS: IT } = { ITEMS };
        st.toastMsg(MESSAGES.pickedUp(IT[item as keyof typeof IT]?.name ?? item, qty));
        audio.play("pickup");
        it.used = true;
        this.hidePickup(it.id);
        if (item === "key_tower") {
          st.setFlag("hasTowerKey", true);
        }
        this.syncObjectiveProgress(item);
        break;
      }
      case "note": {
        const docId = it.data?.docId as string;
        st.setNote(docId as never);
        st.markDoc(docId as never);
        st.setScreen("note");
        document.exitPointerLock();
        // لا نضع it.used = true على الوثائق حتى يتمكن اللاعب من فتحها وقراءتها في أي وقت
        this.onDocRead(docId);
        break;
      }
      case "checkpoint": {
        this.doCheckpoint(MESSAGES.cpSafe);
        break;
      }
      case "door": {
        this.toggleDoor(it.data?.doorId as string);
        break;
      }
      case "console": {
        this.useTowerConsole(it);
        break;
      }
      case "npc": {
        this.talkSurvivor(it);
        break;
      }
      case "generator": {
        this.useGenerator(it);
        break;
      }
      case "gate": {
        this.useLabDoor(it);
        break;
      }
      case "core": {
        this.useCore(it);
        break;
      }
      case "exit": {
        if (it.data?.labExit) {
          this.exitLab();
        } else {
          this.tryExtract();
        }
        break;
      }
    }
  }

  private hidePickup(id: string) {
    // عبر قائمة الالتقاط (contract 5-b)
    for (const p of this.pickupList()) {
      if (p.id === id) {
        p.obj.userData.pickedUp = true;
        p.obj.visible = false;
      }
    }
    // احتياطي قديم
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.pickupId === id) {
        o.userData.pickedUp = true;
        o.visible = false;
      }
    });
  }

  /** تحديث تسلسل المهام بناءً على قراءة الوثائق والتلميحات */
  private onDocRead(docId: string) {
    const st = useGame.getState();
    if (docId === "doc_1") {
      if (st.objectiveId === "obj_wake") {
        st.setObjective("obj_weapon");
      }
      st.showHint(MESSAGES.doc1Hint);
    } else if (docId === "doc_4") {
      const hasKey = st.flags.hasTowerKey || st.hasItem("key_tower");
      if (hasKey) {
        if (st.objectiveId === "obj_police" || st.objectiveId === "obj_weapon" || st.objectiveId === "obj_wake") {
          st.setObjective("obj_radio");
        }
        st.showHint(MESSAGES.doc4WithKeyHint);
      } else {
        st.showHint(MESSAGES.doc4NoKeyHint);
      }
    } else if (docId === "doc_2" || docId === "doc_3" || docId === "doc_5") {
      if (st.flags.radioDone && st.objectiveId === "obj_survive") {
        const both = st.hasItem("keycard_blue") && st.hasItem("keycard_red");
        st.setObjective(both ? "obj_lab" : "obj_cards");
      }
    } else if (docId === "doc_6") {
      st.showHint(MESSAGES.doc6Hint);
    }
  }

  /** تحديث تسلسل المهام عند التقاط المفاتيح أو شرائح التصريح */
  private syncObjectiveProgress(pickedItem?: string) {
    const st = useGame.getState();
    if (pickedItem === "key_tower") {
      if (st.docsRead.includes("doc_4")) {
        if (st.objectiveId === "obj_police" || st.objectiveId === "obj_weapon" || st.objectiveId === "obj_wake") {
          st.setObjective("obj_radio");
        }
        st.showHint(MESSAGES.keyTowerWithDocHint);
      } else {
        st.showHint(MESSAGES.keyTowerNoDocHint);
      }
    } else if (pickedItem === "keycard_blue" || pickedItem === "keycard_red") {
      const blue = st.hasItem("keycard_blue");
      const red = st.hasItem("keycard_red");
      if (blue && red) {
        st.setObjective("obj_lab");
        st.showHint(MESSAGES.bothKeycardsHint);
      } else if (st.objectiveId === "obj_survive") {
        st.setObjective("obj_cards");
        st.showHint(blue ? MESSAGES.blueKeycardOnlyHint : MESSAGES.redKeycardOnlyHint);
      }
    }
  }

  // ══════════ أبواب / التقاطات / اهتزاز (contract 5-b + 5-c) ══════════
  private doorList(): DoorEntry[] {
    if (!this.world) return [];
    return (this.world as unknown as { doors?: DoorEntry[] }).doors ?? [];
  }
  private pickupList(): PickupEntry[] {
    if (!this.world) return [];
    return (this.world as unknown as { pickups?: PickupEntry[] }).pickups ?? [];
  }

  private toggleDoor(id: string) {
    const w = this.world;
    if (!w || !id) return;
    const d = this.doorList().find((x) => x.id === id);
    if (!d) return;
    const st = useGame.getState();
    if (d.def.locked) {
      st.toastMsg(MESSAGES.doorLockedGeneric);
      audio.play("door_locked");
      return;
    }
    // بوابات التسلسل المنطقي للمهام لمنع تشتت اللاعب:
    if (!d.open) {
      // 1) لا يغادر الشقة قبل قراءة تسجيله الشخصي على المكتب (doc_1)
      if (id === "door_apt" && !st.docsRead.includes("doc_1")) {
        st.toastMsg(MESSAGES.doorAptNeedDoc);
        audio.play("door_locked");
        return;
      }
      // 2) لا يدخل المنشآت الخطرة في المدينة قبل تأمين سلاح ناري من متجر العتاد
      if (
        (id === "door_police" ||
          id === "door_tower" ||
          id === "door_hospital" ||
          id === "door_hospital_west" ||
          id === "door_factory" ||
          id === "door_warehouse" ||
          id === "door_gas") &&
        !st.flags.hasWeapon
      ) {
        st.toastMsg(MESSAGES.doorNeedWeapon);
        audio.play("door_locked");
        return;
      }
      // 3) باب محطة الإذاعة يتطلب مفتاح البرج النحاسي وقراءة البرقية العسكرية
      if (id === "door_tower") {
        if (!st.flags.hasTowerKey && !st.hasItem("key_tower")) {
          st.toastMsg(MESSAGES.doorTowerNeedKey);
          audio.play("door_locked");
          return;
        }
        if (!st.docsRead.includes("doc_4")) {
          st.toastMsg(MESSAGES.doorTowerNeedDoc);
          audio.play("door_locked");
          return;
        }
      }
      // 4) المستشفى المركزي ومصنع القطع مغلقان بإغلاق الطوارئ حتى يتم بث نداء الاستغاثة
      if (
        (id === "door_hospital" || id === "door_hospital_west" || id === "door_factory") &&
        !st.flags.radioDone
      ) {
        st.toastMsg(MESSAGES.doorFacilityLockdown);
        audio.play("door_locked");
        return;
      }
    }
    d.open = !d.open;
    d.def.open = d.open;
    if (d.open) {
      w.dynamicColliders.delete(`door_${d.id}`);
      audio.play("door_open", { volume: 0.85 });
    } else {
      w.dynamicColliders.set(`door_${d.id}`, d.collider);
      audio.play("door_close", { volume: 0.85 });
    }
  }

  private addShake(a: number) {
    this.shake = Math.min(1.2, this.shake + a);
  }

  private updateLaser() {
    const st = useGame.getState();
    const laser = this.laser;
    if (!laser) return;
    const on =
      this.runStarted &&
      st.screen === "playing" &&
      !st.aiChoiceOpen &&
      st.hud.equipped === "pistol";
    if (!on) {
      laser.visible = false;
      return;
    }
    this.camera.getWorldPosition(this._laserOrigin);
    this.camera.getWorldDirection(this._laserDir);

    // حساب تقاطع شعاع الليزر بسرعة فائقة عبر مصادمات الجدران + الأعداء المرئيين فقط (دون فحص مثلثات المدينة)
    let minT = 38;
    const ox = this._laserOrigin.x;
    const oy = this._laserOrigin.y;
    const oz = this._laserOrigin.z;
    const dx = this._laserDir.x;
    const dy = this._laserDir.y;
    const dz = this._laserDir.z;

    if (dy < -0.001) {
      const tFloor = -oy / dy;
      if (tFloor > 0 && tFloor < minT) minT = tFloor;
    } else if (dy > 0.001) {
      const tCeil = (4.2 - oy) / dy;
      if (tCeil > 0 && tCeil < minT) minT = tCeil;
    }

    if (this.world) {
      const cols = this.allColliders();
      const invX = Math.abs(dx) > 1e-6 ? 1 / dx : 1e6;
      const invZ = Math.abs(dz) > 1e-6 ? 1 / dz : 1e6;
      for (const c of cols) {
        const tx1 = (c.minX - ox) * invX;
        const tx2 = (c.maxX - ox) * invX;
        const tminX = Math.min(tx1, tx2);
        const tmaxX = Math.max(tx1, tx2);
        const tz1 = (c.minZ - oz) * invZ;
        const tz2 = (c.maxZ - oz) * invZ;
        const tminZ = Math.min(tz1, tz2);
        const tmaxZ = Math.max(tz1, tz2);
        const tEnter = Math.max(tminX, tminZ);
        const tExit = Math.min(tmaxX, tmaxZ);
        if (tExit >= Math.max(0, tEnter) && tEnter > 0 && tEnter < minT) {
          const hitY = oy + dy * tEnter;
          if (hitY >= 0 && hitY <= 4.2) {
            minT = tEnter;
          }
        }
      }
    }

    if (this.enemies) {
      const visEnemies: THREE.Object3D[] = [];
      for (const e of this.enemies.enemies) {
        if (e.state !== "dead" && e.group.visible) visEnemies.push(e.group);
      }
      if (visEnemies.length > 0) {
        this.raycaster.set(this._laserOrigin, this._laserDir);
        this.raycaster.far = minT;
        const hits = this.raycaster.intersectObjects(visEnemies, true);
        if (hits.length > 0 && hits[0].distance < minT) {
          minT = hits[0].distance;
        }
      }
    }

    const start = this._laserStart;
    this.muzzle.getWorldPosition(start);
    const endX = ox + dx * minT;
    const endY = oy + dy * minT;
    const endZ = oz + dz * minT;
    const attr = laser.geometry.attributes.position as THREE.BufferAttribute;
    attr.setXYZ(0, start.x, start.y, start.z);
    attr.setXYZ(1, endX, endY, endZ);
    attr.needsUpdate = true;
    laser.visible = true;
  }
  private _laserOrigin = new THREE.Vector3();
  private _laserDir = new THREE.Vector3();
  private _laserStart = new THREE.Vector3();

  private doCheckpoint(label: string) {
    const st = useGame.getState();
    const ok = saveCheckpoint(
      st.getSaveData([this.pos.x, this.pos.z], this.yaw),
    );
    if (ok) {
      st.setHasSave(true);
      st.toastMsg(`${MESSAGES.checkpointSaved} (${label})`);
      audio.play("radio_beep", { volume: 0.5 });
    }
  }

  private useTowerConsole(it: Interactable) {
    const st = useGame.getState();
    if (st.flags.radioDone) {
      st.showHint(MESSAGES.radioAlreadyDone);
      return;
    }
    if (!st.flags.hasTowerKey && !st.hasItem("key_tower")) {
      st.toastMsg(MESSAGES.towerLocked);
      audio.play("door_locked");
      return;
    }
    it.used = true;
    st.toastMsg(MESSAGES.radioBroadcasting);
    audio.play("radio_static", { volume: 0.8 });
    this.playRadioChain();
  }

  private playRadioChain() {
    const st = useGame.getState();
    const lines = ["radio_1", "radio_2", "radio_3"];
    const idx = this.radioChain;
    if (idx >= lines.length) {
      st.setFlag("radioDone", true);
      const bothCards = st.hasItem("keycard_blue") && st.hasItem("keycard_red");
      st.setObjective(bothCards ? "obj_lab" : "obj_survive");
      st.toastMsg(MESSAGES.radioRestoredPower);
      audio.play("stinger_discover", { volume: 0.7 });
      this.doCheckpoint(MESSAGES.cpAfterRadio);
      return;
    }
    audio.play("radio_static", { volume: 0.4 });
    audio.playVoice(lines[idx], () => {
      setTimeout(() => {
        this.radioChain = idx + 1;
        this.playRadioChain();
      }, 900);
    });
  }

  private talkSurvivor(it: Interactable) {
    const st = useGame.getState();
    const sid = it.data?.survivor as "sara" | "adel" | "soldier";
    const s = SURVIVOR_BY_ID[sid];
    if (!s) return;
    const quest = s.quest;
    const metFlag = sid === "sara" ? "metSara" : sid === "adel" ? "metAdel" : "metSoldier";
    const savedFlag = sid === "sara" ? "saraSaved" : sid === "adel" ? "adelSaved" : "soldierSaved";
    // الرقيب لا يملك علماً منفصلاً للتسليم — soldierSaved تخدم الاثنين
    const deliveredFlag = sid === "sara" ? "saraQuest" : sid === "adel" ? "adelQuest" : "soldierSaved";
    const f = st.flags;

    // اللقاء الأول: تقديم نفسه + إعطاء المهمة (يبقى قابلاً للحديث)
    if (!f[metFlag]) {
      st.setFlag(metFlag, true);
      st.toastMsg(s.line);
      audio.play("radio_beep", { volume: 0.4 });
      if (quest) {
        st.showHint(quest.ask);
        window.setTimeout(() => {
          useGame.getState().toastMsg(MESSAGES.questGiven(s.name));
        }, 4200);
      }
      return;
    }

    // تم إنقاذه سابقاً
    if (f[savedFlag] || f[deliveredFlag]) {
      it.used = true;
      st.showHint(MESSAGES.survivorAlreadyHelped);
      return;
    }

    // مهمة قيد التنفيذ — تحقق من العنصر المطلوب
    if (!quest) return;
    if (st.countItem(quest.item) >= quest.qty) {
      for (let i = 0; i < quest.qty; i++) st.consumeFirst(quest.item);
      for (const r of quest.reward) {
        if (r.item) {
          const ok = st.addItem(r.item, r.qty ?? 1);
          if (!ok) st.toastMsg(MESSAGES.inventoryFull);
        } else if (r.ammo) {
          st.addItem(r.ammo === "pistol" ? "pistol_ammo" : "shotgun_ammo", r.ammoQty ?? 1);
        }
      }
      st.setFlag(savedFlag, true);
      st.setFlag(deliveredFlag, true);
      it.used = true; // توقّف الطلب بعد التسليم

      // تحريك الناجي فعلياً للخروج من المبنى والتوجه نحو قارب الإخلاء في الميناء
      if (this.world) {
        const sv = this.world.survivors.find((x) => x.id === sid);
        if (sv) {
          sv.state = "walking";
          sv.wpIndex = 0;
          sv.walkTime = 0;
        }
        // فتح أبواب المبنى تلقائياً ليخرج الناجي بسلاسة أمام اللاعب
        const doorsToOpen =
          sid === "sara"
            ? ["door_hospital_laundry", "door_hospital"]
            : sid === "adel"
              ? ["door_warehouse_office", "door_warehouse"]
              : ["door_factory"];
        for (const did of doorsToOpen) {
          const d = this.doorList().find((x) => x.id === did);
          if (d && !d.open) {
            d.open = true;
            d.def.open = true;
            this.world.dynamicColliders.delete(`door_${d.id}`);
          }
        }
      }

      st.toastMsg(MESSAGES.survivorThankYou(s.name));
      st.showHint(MESSAGES.savedSurvivor(s.name));
      const f2 = useGame.getState().flags;
      const n = (f2.saraSaved ? 1 : 0) + (f2.adelSaved ? 1 : 0) + (f2.soldierSaved ? 1 : 0);
      st.setHud({ optionalObjective: MESSAGES.survivorsSavedHud(n) });
      audio.play("pickup");
      audio.play("radio_beep", { volume: 0.5 });
      this.doCheckpoint(MESSAGES.cpQuest(sid));
      return;
    }
    st.toastMsg(MESSAGES.questItemMissing(s.name, quest.qty));
    audio.play("ui_click", { volume: 0.4 });
  }

  private useGenerator(it: Interactable) {
    const st = useGame.getState();
    if (st.flags.generatorFixed) {
      st.showHint(MESSAGES.generatorRunning);
      return;
    }
    if (!st.flags.radioDone) {
      st.toastMsg(MESSAGES.generatorNeedRadio);
      audio.play("door_locked");
      return;
    }
    if (!st.flags.metAI) {
      st.toastMsg(MESSAGES.generatorNeedLab);
      audio.play("door_locked");
      return;
    }
    if (!st.consumeFirst("fuel")) {
      st.toastMsg(MESSAGES.needFuel);
      audio.play("door_locked");
      return;
    }
    it.used = true;
    st.setFlag("generatorFixed", true);
    audio.play("generator", { volume: 1 });
    this.openGateBarrier();
    st.toastMsg(MESSAGES.generatorFixed);
    st.setObjective("obj_wave");
    useGame.getState().setHud({ waveTimer: 120 });
    this.waveN = 0;
    this.waveSpawnT = 4;
    this.doCheckpoint(MESSAGES.cpGate);
  }

  private openGateBarrier() {
    if (!this.world || this.world.gateBarrier.open) return;
    this.world.gateBarrier.open = true;
    const g = this.world.gateBarrier.group;
    g.children.forEach((c) => (c.position.y -= 3.2));
    // إزالة مصادم بوابة ميناء بلاك ووتر (حول 0,+100)
    for (let i = this.world.colliders.length - 1; i >= 0; i--) {
      const c = this.world.colliders[i];
      if (c.minX < 0 && c.maxX > 0 && c.minZ > 97.5 && c.maxZ < 102) {
        this.world.colliders.splice(i, 1);
        break;
      }
    }
  }

  private useLabDoor(it: Interactable) {
    const st = useGame.getState();
    if (st.flags.labEntered) {
      st.showHint(MESSAGES.labGateAlreadyOpen);
      return;
    }
    if (!st.flags.radioDone) {
      st.toastMsg(MESSAGES.labGateNeedRadio);
      audio.play("door_locked");
      return;
    }
    const blue = st.hasItem("keycard_blue");
    const red = st.hasItem("keycard_red");
    if (!blue || !red) {
      st.toastMsg(MESSAGES.labGateMissingCards(blue, red));
      audio.play("door_locked");
      if (st.objectiveId === "obj_survive") st.setObjective("obj_cards");
      return;
    }
    it.used = true;
    st.setFlag("labEntered", true);
    this.world!.labDoor.open = true;
    this.world!.labDoor.group.position.y = -3.5;
    this.removeLabDoorCollider();
    audio.play("door_open", { volume: 1 });
    st.toastMsg(MESSAGES.labGateOpening);
    st.setObjective("obj_core");
    this.enterLab();
  }

  private removeLabDoorCollider() {
    if (!this.world || this.labDoorColliderIdx >= 0) return;
    const dp = this.world.labDoor.group.position;
    for (let i = this.world.colliders.length - 1; i >= 0; i--) {
      const c = this.world.colliders[i];
      if (Math.abs((c.minX + c.maxX) / 2 - dp.x) < 0.4 && Math.abs((c.minZ + c.maxZ) / 2 - dp.z) < 0.4) {
        this.labDoorColliderIdx = i;
        this.world.colliders.splice(i, 1);
        break;
      }
    }
  }

  private enterLab() {
    this.floorY = 0;
    this.lastCullX = -99999;
    this.lastCullZ = -99999;
    this.pos.set(600, EYE_H, 21);
    this.yaw = Math.PI; // نحو -Z داخل النفق
    this.vel.set(0, 0, 0);
    audio.startAmbient("lab");
    const st = useGame.getState();
    st.setHud({ zone: ZONES.lab });
    audio.play("stinger_danger", { volume: 0.8 });
    this.doCheckpoint(MESSAGES.cpLabEntry);
  }

  private exitLab() {
    this.floorY = 0;
    this.lastCullX = -99999;
    this.lastCullZ = -99999;
    this.pos.set(-71, EYE_H, -71.2);
    this.yaw = 0; // نحو بهو المجمع الداخلي ومخارجه
    this.vel.set(0, 0, 0);
    if (this.world) {
      for (const did of ["door_complex_east", "door_complex_south"]) {
        const d = this.doorList().find((x) => x.id === did);
        if (d && !d.open) {
          d.open = true;
          d.def.open = true;
          this.world.dynamicColliders.delete(`door_${d.id}`);
        }
      }
    }
    audio.startAmbient(useGame.getState().flags.coreDestroyed ? "city" : "city");
    useGame.getState().setHud({ zone: "" });
    useGame.getState().showHint(MESSAGES.exitLabHint);
  }

  private useCore(it: Interactable) {
    const st = useGame.getState();
    if (st.flags.metAI) return;
    if (!st.flags.bossKilled) {
      st.toastMsg(MESSAGES.coreBossAlive);
      audio.play("door_locked");
      return;
    }
    if (!st.docsRead.includes("doc_6")) {
      st.toastMsg(MESSAGES.coreNeedDoc6);
      audio.play("door_locked");
      return;
    }
    it.used = true;
    st.setFlag("metAI", true);
    st.setAiChoiceOpen(true);
    document.exitPointerLock();
    audio.play("radio_static", { volume: 0.5 });
    audio.play("stinger_discover", { volume: 0.8 });
  }

  private resolveAI(choice: "destroy" | "deal" | "leave") {
    const st = useGame.getState();
    st.setAiChoiceOpen(false);
    const reaction = AI_REACTIONS[choice];
    if (reaction) {
      st.toastMsg(reaction.text);
      if (reaction.voice) audio.playVoice(reaction.voice);
    }
    if (choice === "destroy") {
      st.setFlag("coreDestroyed", true);
      st.setObjective("obj_escape");
      useGame.getState().setHud({ escapeTimer: 240 });
      audio.play("explosion", { volume: 0.35 });
      audio.play("alarm", { volume: 0.8 });
      this.addShake(1);
      // فتح كل الأبواب: البوابة والمختبر
      this.openGateBarrier();
      this.extractionReady = true;
      audio.setHeli(true);
      st.toastMsg(MESSAGES.coreSignal);
      audio.startAmbient("city");
      this.doCheckpoint(MESSAGES.cpAfterCore);
    } else if (choice === "deal") {
      st.setFlag("dealAccepted", true);
      st.setObjective("obj_escape");
      this.openGateBarrier();
      this.extractionReady = true;
      audio.setHeli(true);
      st.toastMsg(MESSAGES.dealGateOpened);
      audio.startAmbient("harbor");
      this.doCheckpoint(MESSAGES.cpDeal);
    } else {
      st.setObjective("obj_gate");
      st.showHint(MESSAGES.leaveCoreHint);
    }
    this.lockPointer();
  }

  private tryExtract() {
    const st = useGame.getState();
    if (!this.extractionReady) {
      st.showHint(MESSAGES.extractNotReady);
      audio.play("door_locked");
      return;
    }
    // حساب النهاية
    let ending: EndingId;
    if (st.flags.dealAccepted) ending = "ending_deal";
    else if (st.flags.coreDestroyed)
      ending = st.docsRead.length >= 6 ? "ending_truth" : "ending_sacrifice";
    else {
      const saved =
        (st.flags.saraSaved ? 1 : 0) + (st.flags.adelSaved ? 1 : 0) + (st.flags.soldierSaved ? 1 : 0);
      ending = saved >= 3 ? "ending_rescue" : "ending_escape";
    }
    audio.play("radio_beep");
    audio.playVoice("radio_3");
    this.finish(ending);
  }

  // ══════════ flashlight ══════════
  private toggleFlashlight() {
    const st = useGame.getState();
    if (!st.hud.flashlightOn && st.hud.battery <= 0) {
      st.toastMsg(MESSAGES.flashlightDead);
      return;
    }
    st.setHud({ flashlightOn: !st.hud.flashlightOn });
    audio.play("ui_click", { volume: 0.4 });
  }

  // ══════════ main loop ══════════
  private loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const st = useGame.getState();
    const playing = st.screen === "playing" && !st.aiChoiceOpen;
    const active = this.runStarted;

    if (active) {
      this.updateWorldFx(dt);
      if (playing) {
        this.updatePlayer(dt, true, st);
        this.updateCombatTimers(dt, st);
        this.enemies!.update(dt, this.pos, this.allColliders(), st.hud.hp > 0, this.crouching, this.isHidden);
        this.updateStory(dt, st);
        this.updateAudioDirectors(dt, st);
        // وقت اللعب
        this.secAcc += dt;
        if (this.secAcc >= 1) {
          st.tickPlaySeconds(Math.floor(this.secAcc));
          this.secAcc -= Math.floor(this.secAcc);
        }
      } else {
        this.updatePromptIdle(st);
      }
    }

    // الكاميرا
    this.camera.position.copy(this.pos);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    // تمايل رأس خفيف + اهتزاز
    this.camera.rotation.z = Math.sin(this.walkPhase) * 0.006 * this.bobAmp;
    if (this.shake > 0) {
      const s = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * 2 * s * 0.05;
      this.camera.position.y += (Math.random() - 0.5) * 2 * s * 0.05;
      this.camera.position.z += (Math.random() - 0.5) * 2 * s * 0.05;
      this.camera.rotation.z += (Math.random() - 0.5) * 2 * s * 0.02;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    }
    // مجال رؤية أوسع عند الجري
    const targetFov = this.running ? 80 : 72;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }

    // نموذج السلاح
    this.updateViewmodel(dt, st);
    // ليزر المسدس
    this.updateLaser();

    // مؤثرات الدم
    for (let i = this.blood.length - 1; i >= 0; i--) {
      const b = this.blood[i];
      b.life -= dt;
      b.vel.y -= 6 * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, b.life * 2.2);
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.blood.splice(i, 1);
      }
    }

    // الرماد يتبع اللاعب
    if (this.ash) {
      this.ash.position.set(this.pos.x, 0, this.pos.z);
      const arr = this.ash.geometry.attributes.position as THREE.BufferAttribute;
      const a = arr.array as Float32Array;
      for (let i = 1; i < a.length; i += 3) {
        a[i] -= dt * 0.55;
        if (a[i] < 0) a[i] = 26;
      }
      arr.needsUpdate = true;
    }

    if (this.horrorPass) {
      this.horrorPass.uniforms.uTime.value += dt;
      const dmg = Math.max(0, 1 - (Date.now() - st.hud.damageAt) / 700);
      this.horrorPass.uniforms.uDamage.value = dmg;
      this.horrorPass.uniforms.uThreat.value = st.hud.threat;
    }

    if (this.composer && active) {
      this.composer.render();
    }
  };

  private allColliders() {
    const list = this.world!.colliders;
    const dyn = this.world!.dynamicColliders;
    if (dyn.size === 0) return list;
    return [...list, ...dyn.values()];
  }

  private updatePlayer(dt: number, canMove: boolean, st: ReturnType<typeof useGame.getState>) {
    void canMove;
    // الانخفاض (الجلوس) عبر Ctrl أو مفتاح C للاختباء خلف العوائق
    const holdCtrl = this.keys.has("ControlLeft") || this.keys.has("ControlRight");
    const wantRun = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    if (wantRun && !holdCtrl && this.crouchToggle) {
      this.crouchToggle = false;
    }
    const crouching = canMove && (holdCtrl || this.crouchToggle);
    this.crouching = crouching;

    // جري ولياقة (لا يمكن الجري أثناء الانخفاض)
    let run = false;
    let curStamina = st.hud.stamina;
    if (canMove && wantRun && !crouching && curStamina > 4) {
      run = true;
      curStamina = Math.max(0, curStamina - 14 * dt);
      st.hud.stamina = curStamina;
      this.staminaLock = 0.8;
    } else {
      this.staminaLock -= dt;
      if (this.staminaLock <= 0 && curStamina < 100) {
        curStamina = Math.min(100, curStamina + 12 * dt);
        st.hud.stamina = curStamina;
      }
    }
    if (
      Math.abs(curStamina - this.lastHudStamina) >= 1.2 ||
      (curStamina === 100 && this.lastHudStamina !== 100) ||
      (curStamina === 0 && this.lastHudStamina !== 0)
    ) {
      this.lastHudStamina = curStamina;
      st.setHud({ stamina: curStamina });
    }
    this.running = run;

    const speed = crouching ? 2.35 : run ? 7.5 : 4.3;
    const mf = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const mr = new THREE.Vector3(-mf.z, 0, mf.x); // يمين الكاميرا الحقيقي
    const wish = new THREE.Vector3();
    if (canMove) {
      if (this.keys.has("KeyW")) wish.add(mf);
      if (this.keys.has("KeyS")) wish.sub(mf);
      if (this.keys.has("KeyD")) wish.add(mr);
      if (this.keys.has("KeyA")) wish.sub(mr);
    }
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
    // تسارع/تباطؤ
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, dt * 8);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, dt * 8);

    const p = { x: this.pos.x + this.vel.x * dt, z: this.pos.z + this.vel.z * dt };
    this.resolveVerticalHeight(p.x, p.z, dt);
    const cols = this.allColliders();
    collideCircle(p, PLAYER_R, cols, this.floorY, this.floorY + this.curEyeH);
    this.resolveVerticalHeight(p.x, p.z, dt);
    const moved = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    this.pos.x = p.x;
    this.pos.z = p.z;

    // التحقق مما إذا كان اللاعب منخفضاً ومختبئاً بجوار ساتر (مكتب، طاولة، سيارة، صندوق، جدار، إلخ)
    let hidden = false;
    if (crouching) {
      for (const c of cols) {
        const cMinY = c.minY ?? 0;
        const cMaxY = c.maxY ?? 4.2;
        if (cMaxY < this.floorY + 0.65 || cMinY > this.floorY + 1.15) continue;
        const cx = Math.max(c.minX, Math.min(this.pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(this.pos.z, c.maxZ));
        const dCover = Math.hypot(this.pos.x - cx, this.pos.z - cz);
        if (dCover <= PLAYER_R + 0.52) {
          hidden = true;
          break;
        }
      }
    }
    this.isHidden = hidden;
    if (st.hud.crouching !== crouching || st.hud.hidden !== hidden) {
      st.setHud({ crouching, hidden });
    }

    // انتقال سلس لارتفاع الكاميرا عند الجلوس/الوقوف + ارتداد الرأس
    const targetEyeH = crouching ? CROUCH_EYE_H : EYE_H;
    this.curEyeH += (targetEyeH - this.curEyeH) * Math.min(1, dt * 10);
    const targetAmp = moved > 0.001 ? (crouching ? 0.45 : run ? 1.5 : 1) : 0;
    this.bobAmp += (targetAmp - this.bobAmp) * Math.min(1, dt * 8);
    this.pos.y = this.floorY + this.curEyeH + Math.sin(this.walkPhase * 2) * 0.035 * this.bobAmp;

    // خطوات (هادئة جداً عند الانخفاض)
    if (moved > 0.001) {
      this.walkPhase += dt * (crouching ? 4.2 : run ? 11 : 6.4);
      this.footT -= dt;
      if (this.footT <= 0) {
        this.footT = crouching ? 0.62 : run ? 0.31 : 0.47;
        audio.play(run ? "footstep_run" : "footstep", { volume: crouching ? 0.2 : 0.55 });
      }
    }

    // كشاف
    const bat = st.hud.battery;
    if (st.hud.flashlightOn) {
      const nb = Math.max(0, bat - dt * (100 / 240));
      if (Math.abs(nb - bat) > 0.4 || nb === 0) {
        st.setHud({ battery: nb });
      }
      if (nb <= 0) {
        st.setHud({ flashlightOn: false });
        st.toastMsg(MESSAGES.flashlightDead);
      }
    }
    this.flickerT -= dt;
    let intensity = st.hud.flashlightOn ? 11.5 : 0;
    if (st.hud.flashlightOn && bat < 15 && this.flickerT <= 0) {
      this.flickerT = 0.09;
      intensity *= Math.random() < 0.3 ? 0.25 : 1;
    }
    this.flashlight.intensity = intensity;

    // ترويج الهدف/الموجة
    if (st.hud.escapeTimer >= 0) {
      const t = st.hud.escapeTimer - dt;
      if (t <= 0) {
        st.setHud({ escapeTimer: -1 });
        st.toastMsg(MESSAGES.explosionReached);
        this.finish("ending_death");
        return;
      }
      const sec = Math.ceil(t);
      if (sec !== this.lastEscapeSec) {
        this.lastEscapeSec = sec;
        st.setHud({ escapeTimer: t });
      } else {
        st.hud.escapeTimer = t; // تحديث صامت للقراءة الداخلية
      }
    }
    if (st.hud.waveTimer >= 0) {
      const t = st.hud.waveTimer - dt;
      if (t <= 0) {
        st.setHud({ waveTimer: -1 });
        this.waveDone();
      } else {
        const sec = Math.ceil(t);
        if (sec !== this.lastWaveSec) {
          this.lastWaveSec = sec;
          st.setHud({ waveTimer: t });
        } else {
          st.hud.waveTimer = t;
        }
        this.waveSpawnT -= dt;
        if (this.waveSpawnT <= 0 && this.waveN < 4) {
          this.waveSpawnT = 22;
          this.waveN++;
          this.spawnWaveGroup();
        }
      }
    }
  }

  private updatePromptIdle(st: ReturnType<typeof useGame.getState>) {
    st.setPrompt("");
  }

  private updateCombatTimers(dt: number, st: ReturnType<typeof useGame.getState>) {
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }
    if (this.swingT > 0) this.swingT -= dt;
    if (this.muzzleT > 0) {
      this.muzzleT -= dt;
      if (this.muzzleT <= 0) {
        this.muzzle.intensity = 0;
        this.muzzleFlash.visible = false;
      }
    }
    this.vmRecoil = Math.max(0, this.vmRecoil - dt * 5);
    this.slideKick = Math.max(0, this.slideKick - dt * 9);
    void st;
  }

  private updateViewmodel(dt: number, st: ReturnType<typeof useGame.getState>) {
    const w = st.hud.equipped;
    this.vmPistol.visible = w === "pistol";
    this.vmShotgun.visible = w === "shotgun";
    this.vmCrowbar.visible = w === "crowbar" && st.weapons.crowbar && st.hud.stickHits > 0;
    const bobScale = Math.max(this.bobAmp, 0.25);
    const bobX = Math.sin(this.walkPhase) * 0.012 * bobScale;
    const bobY = Math.abs(Math.cos(this.walkPhase)) * 0.014 * bobScale;
    const reloadDip = st.hud.reloading ? -0.16 : 0;
    const swing = this.swingT > 0 ? Math.sin((0.28 - this.swingT) / 0.28 * Math.PI) * 0.3 : 0;
    // تخميد انجراف الماوس + انخفاض السلاح عند الجري
    const decay = Math.exp(-dt * 7);
    this.swayVX *= decay;
    this.swayVY *= decay;
    this.sprintDip += ((this.running ? -0.08 : 0) - this.sprintDip) * Math.min(1, dt * 6);
    const group = this.vmGroup;
    group.position.set(
      0.26 + bobX,
      -0.24 + bobY + reloadDip - this.vmRecoil * 0.03 + this.sprintDip,
      -0.5 + this.vmRecoil * 0.06 + swing * 0.35,
    );
    group.rotation.x = reloadDip * 1.4 + this.vmRecoil * 0.16 + swing * -1.1 + this.swayVY;
    group.rotation.y = this.swayVX;
    group.rotation.z = bobX * 0.6 + this.swayVX * 0.5;
    // ارتداد مزلق المسدس
    if (this.vmSlide) this.vmSlide.position.z = this.vmSlideBaseZ + this.slideKick * 0.05;
    // مضخة البندقية أثناء التلقيم
    if (this.vmPump) {
      if (st.hud.reloading && w === "shotgun") {
        this.pumpAnim += dt * 9;
        this.vmPump.position.z = this.vmPumpBaseZ - (Math.sin(this.pumpAnim) * 0.5 + 0.5) * 0.09;
      } else {
        this.vmPump.position.z += (this.vmPumpBaseZ - this.vmPump.position.z) * Math.min(1, dt * 10);
      }
    }
  }

  /** حساب الارتفاع الرأسي للاعب على السلالم وبلاطات الطوابق المتعددة */
  private resolveVerticalHeight(px: number, pz: number, dt: number) {
    if (!this.world) return;
    let targetY = -1;

    // 1) التحقق أولاً من وجود اللاعب على درج مائل (StairRamp)
    for (const st of this.world.stairs) {
      if (px >= st.minX - 0.15 && px <= st.maxX + 0.15 && pz >= st.minZ - 0.25 && pz <= st.maxZ + 0.25) {
        let t = 0;
        if (st.dir === "+z") t = (pz - st.minZ) / Math.max(0.01, st.maxZ - st.minZ);
        else if (st.dir === "-z") t = (st.maxZ - pz) / Math.max(0.01, st.maxZ - st.minZ);
        else if (st.dir === "+x") t = (px - st.minX) / Math.max(0.01, st.maxX - st.minX);
        else t = (st.maxX - px) / Math.max(0.01, st.maxX - st.minX);
        t = Math.max(0, Math.min(1, t));
        const rampY = st.yBottom + t * (st.yTop - st.yBottom);
        if (Math.abs(rampY - this.floorY) < 1.65) {
          targetY = Math.max(targetY, rampY);
        }
      }
    }

    // 2) التحقق من بلاطات الطوابق العلوية (مع مراعاة فتحات السلالم)
    if (targetY < 0) {
      let bestFloor = 0;
      for (const fl of this.world.floors) {
        if (px >= fl.minX && px <= fl.maxX && pz >= fl.minZ && pz <= fl.maxZ) {
          if (
            fl.hole &&
            px > fl.hole.minX + 0.15 &&
            px < fl.hole.maxX - 0.15 &&
            pz > fl.hole.minZ + 0.15 &&
            pz < fl.hole.maxZ - 0.15
          ) {
            continue; // فوق فتحة الدرج
          }
          if (fl.y <= this.floorY + 0.85 && fl.y > bestFloor) {
            bestFloor = fl.y;
          }
        }
      }
      targetY = bestFloor;
    }

    if (targetY >= this.floorY) {
      this.floorY += (targetY - this.floorY) * Math.min(1, dt * 18);
      if (Math.abs(targetY - this.floorY) < 0.02) this.floorY = targetY;
    } else {
      // هبوط ناعم عند النزول من الدرج أو الحافة
      this.floorY = Math.max(targetY, this.floorY - dt * 9.5);
    }
  }

  /** تحمية الـ GPU مسبقاً لمنع أي تقطيع عند الحركة لأول مرة */
  private prewarmGpu() {
    if (!this.world) return;
    try {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!m) continue;
            const std = m as THREE.MeshStandardMaterial;
            if (std.map) this.renderer.initTexture(std.map);
            if (std.emissiveMap) this.renderer.initTexture(std.emissiveMap);
            if (std.bumpMap) this.renderer.initTexture(std.bumpMap);
            if (std.roughnessMap) this.renderer.initTexture(std.roughnessMap);
          }
        }
      });
      this.renderer.compile(this.scene, this.camera);
    } catch {
      /* ignore prewarm errors */
    }
  }

  private updateWorldFx(dt: number) {
    if (!this.world) return;
    const stLang = useGame.getState().lang;
    if (this.lastSyncedLang !== stLang) {
      this.lastSyncedLang = stLang;
      this.scene.traverse((obj) => {
        if (typeof obj.userData?.updateSignLang === "function") {
          obj.userData.updateSignLang(stLang);
        }
      });
    }
    const t = performance.now() / 1000;
    const px = this.pos.x;
    const py = this.pos.y;
    const pz = this.pos.z;
    const CHUNK_CULL_DIST = 54;
    const CHUNK_CULL_SQ = CHUNK_CULL_DIST * CHUNK_CULL_DIST;

    // 1) تحديث ظهور القطاعات فقط عند تحرك اللاعب مسافة 2م لتجنب التكرار كل إطار
    const cullMoveSq = (px - this.lastCullX) * (px - this.lastCullX) + (pz - this.lastCullZ) * (pz - this.lastCullZ);
    if (cullMoveSq >= 4.0) {
      this.lastCullX = px;
      this.lastCullZ = pz;
      for (const c of this.world.chunks) {
        const dx = px < c.minX ? c.minX - px : px > c.maxX ? px - c.maxX : 0;
        const dz = pz < c.minZ ? c.minZ - pz : pz > c.maxZ ? pz - c.maxZ : 0;
        const vis = dx * dx + dz * dz <= CHUNK_CULL_SQ;
        if (c.group.visible !== vis) c.group.visible = vis;
      }
      for (const c of this.world.cullables) {
        const dx = c.x - px;
        const dz = c.z - pz;
        const maxD = CHUNK_CULL_DIST + c.r;
        const vis = dx * dx + dz * dz <= maxD * maxD;
        if (c.obj.visible !== vis) c.obj.visible = vis;
      }
    }

    // 2) توزيع حوض الأضواء الثابت (lightPool) على أقرب الأضواء الافتراضية دون تغيير visible مطلقاً
    const vLights = this.world.virtualLights;
    const poolLen = this.lightPool.length;
    // إيجاد أقرب poolLen أضواء ضمن 38 متراً
    const bestIndices = [-1, -1, -1, -1, -1, -1];
    const bestDists = [1444, 1444, 1444, 1444, 1444, 1444];
    for (let i = 0; i < vLights.length; i++) {
      const vl = vLights[i];
      const dx = vl.x - px;
      const dy = (vl.y - py) * 1.6;
      const dz = vl.z - pz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= bestDists[poolLen - 1]) continue;
      for (let slot = 0; slot < poolLen; slot++) {
        if (d2 < bestDists[slot]) {
          for (let k = poolLen - 1; k > slot; k--) {
            bestDists[k] = bestDists[k - 1];
            bestIndices[k] = bestIndices[k - 1];
          }
          bestDists[slot] = d2;
          bestIndices[slot] = i;
          break;
        }
      }
    }
    for (let slot = 0; slot < poolLen; slot++) {
      const pl = this.lightPool[slot];
      const idx = bestIndices[slot];
      if (idx < 0) {
        pl.intensity = 0;
        continue;
      }
      const vl = vLights[idx];
      pl.position.set(vl.x, vl.y, vl.z);
      pl.color.setHex(vl.color);
      pl.distance = vl.dist;
      pl.decay = 1.7;
      if (vl.isFire) {
        pl.intensity = vl.base * (0.72 + Math.sin(t * 11 + vl.x) * 0.14 + Math.random() * 0.14);
      } else if (vl.speed > 6) {
        pl.intensity = Math.random() < 0.08 ? 0 : vl.base * (0.6 + Math.random() * 0.5);
      } else if (vl.speed > 2) {
        pl.intensity = vl.base * (0.75 + Math.sin(t * vl.speed) * 0.25);
      } else {
        pl.intensity = vl.base * (0.5 + Math.max(0, Math.sin(t * vl.speed * 2)) * 0.5);
      }
    }

    // 3) تحريك الأبواب القريبة وإخفاء الأبواب خلف الضباب
    const k = 1 - Math.exp(-4.5 * dt);
    for (const d of this.doorList()) {
      const dx = d.def.group.position.x - px;
      const dz = d.def.group.position.z - pz;
      const vis = dx * dx + dz * dz <= CHUNK_CULL_SQ;
      if (d.def.group.visible !== vis) d.def.group.visible = vis;
      if (!vis) continue;
      if (d.def.kind === "double") {
        const kids = d.def.group.children;
        if (kids[0]) kids[0].rotation.y += ((d.open ? -1.6 : 0) - kids[0].rotation.y) * k;
        if (kids[1]) kids[1].rotation.y += ((d.open ? 1.6 : 0) - kids[1].rotation.y) * k;
      } else {
        const baseRy = (d.def.group.userData.baseRy as number | undefined) ?? 0;
        d.def.group.rotation.y += ((d.open ? baseRy - 1.9 : baseRy) - d.def.group.rotation.y) * k;
      }
    }

    // 4) التقاطات: إخفاء ما وراء الضباب وتحريك القريب فقط
    for (const p of this.pickupList()) {
      if (p.obj.userData.pickedUp) {
        if (p.obj.visible) p.obj.visible = false;
        continue;
      }
      const dx = p.obj.position.x - px;
      const dz = p.obj.position.z - pz;
      const d2 = dx * dx + dz * dz;
      const vis = d2 <= CHUNK_CULL_SQ;
      if (p.obj.visible !== vis) p.obj.visible = vis;
      if (d2 > 1296) continue; // تحريك الدوران فقط ضمن 36م
      const base = (p.obj.userData.baseY as number | undefined) ?? p.obj.position.y;
      const ph = (p.obj.userData.phase as number | undefined) ?? 0;
      p.obj.position.y = base + Math.sin(t * 2 + ph) * 0.04;
      p.obj.rotation.y += dt * 0.9;
    }

    // 5) تمايل قارب الإخلاء فوق مياه النهر + حركة الناجين الفعليّة نحو الميناء وعلى متن القارب
    const boatBob = Math.sin(t * 1.4) * 0.035;
    if (this.world.boat) {
      this.world.boat.position.y = -0.50 + boatBob;
      this.world.boat.rotation.z = Math.sin(t * 1.1) * 0.012;
      this.world.boat.rotation.x = Math.cos(t * 0.9) * 0.008;
    }
    for (const sv of this.world.survivors) {
      if (sv.state === "walking") {
        // إذا سبق اللاعبُ الناجيَ إلى الميناء، يصل الناجي فوراً إلى موقعه على متن القارب
        if (pz > 92 && sv.obj.position.z < 88) {
          sv.state = "on_boat";
          sv.wpIndex = sv.waypoints.length;
          sv.obj.position.set(sv.boatPos[0], sv.boatPos[1], sv.boatPos[2]);
          sv.obj.rotation.y = sv.boatRy;
          setSurvivorPose(sv.obj, "boat", t, sv.id);
          continue;
        }
        const target = sv.waypoints[sv.wpIndex];
        if (!target) {
          sv.state = "on_boat";
          sv.obj.position.set(sv.boatPos[0], sv.boatPos[1], sv.boatPos[2]);
          sv.obj.rotation.y = sv.boatRy;
          setSurvivorPose(sv.obj, "boat", t, sv.id);
          continue;
        }
        const dx = target[0] - sv.obj.position.x;
        const dy = target[1] - sv.obj.position.y;
        const dz = target[2] - sv.obj.position.z;
        const dist = Math.hypot(dx, dz);
        const speed = 4.6;
        if (dist <= speed * dt + 0.15) {
          sv.obj.position.set(target[0], target[1], target[2]);
          sv.wpIndex++;
          if (sv.wpIndex >= sv.waypoints.length) {
            sv.state = "on_boat";
            sv.obj.position.set(sv.boatPos[0], sv.boatPos[1], sv.boatPos[2]);
            sv.obj.rotation.y = sv.boatRy;
            setSurvivorPose(sv.obj, "boat", t, sv.id);
          }
        } else {
          sv.obj.position.x += (dx / dist) * speed * dt;
          sv.obj.position.z += (dz / dist) * speed * dt;
          sv.obj.position.y += dy * Math.min(1, dt * 8);
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - sv.obj.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          sv.obj.rotation.y += diff * Math.min(1, dt * 10);
          sv.walkTime += dt * 9.5;
          setSurvivorPose(sv.obj, "walk", sv.walkTime, sv.id);
        }
      } else if (sv.state === "on_boat") {
        sv.obj.position.set(sv.boatPos[0], sv.boatPos[1] + boatBob, sv.boatPos[2]);
        const dPlayer = Math.hypot(px - sv.boatPos[0], pz - sv.boatPos[2]);
        if (dPlayer < 14) {
          const lookYaw = Math.atan2(px - sv.boatPos[0], pz - sv.boatPos[2]);
          let diff = lookYaw - sv.obj.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          sv.obj.rotation.y += diff * Math.min(1, dt * 5);
        } else {
          sv.obj.rotation.y = sv.boatRy;
        }
        setSurvivorPose(sv.obj, "boat", t + (sv.id === "sara" ? 0 : sv.id === "adel" ? 1.5 : 3.0), sv.id);
      }
    }
  }

  private updateStory(dt: number, st: ReturnType<typeof useGame.getState>) {
    if (!this.world || !playingSafe()) return;
    void dt;
    // محفزات القصة
    for (const tr of this.world.triggers) {
      if (tr.fired) continue;
      if (Math.hypot(this.pos.x - tr.x, this.pos.z - tr.z) < tr.radius) {
        tr.fired = true;
        this.onTrigger(tr.id);
      }
    }
    // بوابة ساحة الزعيم
    if (
      !this.bossGateClosed &&
      !st.flags.bossKilled &&
      st.flags.labEntered &&
      this.pos.x > 596 &&
      this.pos.x < 604 &&
      this.pos.z < -7.4 &&
      this.pos.z > -12
    ) {
      this.closeBossGate();
      st.toastMsg(MESSAGES.bossAwaken);
      audio.play("roar", { volume: 1 });
      const boss = this.enemies!.enemies.find((e) => e.kind === "boss" && e.state !== "dead");
      if (boss) {
        boss.state = "chase";
        boss.hasHeard = true;
        boss.heardX = this.pos.x;
        boss.heardZ = this.pos.z;
      }
    }
    // إنقاذ نفس البوابة عند قتل الزعيم قبل الوصول
    if (st.flags.bossKilled && this.bossGateClosed) this.openBossGate();

    // منطقة/هدف/تلميح تفاعل
    this.zoneT -= dt;
    if (this.zoneT <= 0) {
      this.zoneT = 0.5;
      const z = zoneAt(this.pos.x, this.pos.z);
      if (z !== st.hud.zone) st.setHud({ zone: z });
      // اكتشاف نقاط الخريطة
      for (const poi of this.world.pois) {
        if (!this.poiFound.has(poi.name) && Math.hypot(this.pos.x - poi.x, this.pos.z - poi.z) < poi.r + 10) {
          this.poiFound.add(poi.name);
        }
      }
    }
    const it = this.findInteract();
    this.currentInteract = it;
    st.setPrompt(it ? `E — ${translateInteractPrompt(it, st.lang)}` : "");
  }

  private onTrigger(id: string) {
    const st = useGame.getState();
    switch (id) {
      case "trig_apartment_exit":
        st.setFlag("exitedApartment", true);
        if (st.objectiveId === "obj_wake") st.setObjective("obj_weapon");
        st.showHint(MESSAGES.trigApartmentExitHint);
        break;
      case "trig_gunshop":
        this.poiFound.add("متجر الأسلحة");
        break;
      case "trig_police":
        this.poiFound.add("مركز الشرطة");
        if (!st.docsRead.includes("doc_4")) {
          st.showHint(MESSAGES.trigPoliceHint);
        }
        break;
      case "trig_tower":
        this.poiFound.add("برج الإذاعة");
        break;
      case "trig_hospital":
        this.poiFound.add("المستشفى المركزي");
        if (st.flags.radioDone) {
          st.toastMsg(MESSAGES.bruteWarn);
          audio.play("stinger_danger", { volume: 0.6 });
        }
        break;
      case "trig_factory":
        this.poiFound.add("مصنع القطع");
        break;
      case "trig_warehouse":
        this.poiFound.add("المستودع الغربي");
        break;
      case "trig_gas":
        this.poiFound.add("محطة الوقود");
        break;
      case "trig_metro":
        this.poiFound.add("مجمع كيبريس — المختبر");
        this.poiFound.add("lab");
        if (st.flags.radioDone) st.showHint(MESSAGES.trigMetroHint);
        break;
      case "trig_harbor":
        this.poiFound.add("ميناء بلاك ووتر");
        if (st.flags.metAI && !st.flags.generatorFixed && !st.flags.coreDestroyed && !st.flags.dealAccepted) {
          st.showHint(MESSAGES.trigHarborHint);
        }
        break;
    }
  }

  private spawnWaveGroup() {
    const base = [
      [-24, 104],
      [24, 104],
      [-14, 96],
      [14, 96],
    ];
    for (let i = 0; i < 3; i++) {
      const [x, z] = base[Math.floor(Math.random() * base.length)];
      this.enemies!.addAt(x + (Math.random() - 0.5) * 8, z + (Math.random() - 0.5) * 6, i === 2 ? "runner" : "walker");
    }
    if (this.waveN >= 3) {
      this.enemies!.addAt(0, 108, "brute");
      audio.play("roar", { volume: 0.9 });
    }
    this.hitMeshesCache = null;
  }

  private waveDone() {
    const st = useGame.getState();
    st.setFlag("waveDone", true);
    this.extractionReady = true;
    audio.setHeli(true);
    st.toastMsg(MESSAGES.waveDoneToast);
    audio.play("radio_beep");
    this.world!.boatLight.intensity = 3.2;
    this.enemies!.killAllInRadius(this.pos.x, this.pos.z, 6);
  }

  private updateAudioDirectors(dt: number, st: ReturnType<typeof useGame.getState>) {
    if (!this.enemies) return;
    const { dist, chasing, boss } = this.enemies.nearestThreat(this.pos.x, this.pos.z);
    // راديو الجيب الاستشعاري بأسلوب سايلنت هيل: تشويش يبدأ عند اقتراب الكائنات في الضباب حتى قبل المطاردة
    let threat = 0;
    if (dist < 25) {
      threat = Math.max(0.12, (1 - dist / 25) * 0.55);
    }
    if (chasing) {
      threat = Math.max(threat, Math.max(0.42, 1 - dist / 28));
    }
    if (boss && dist < 45) {
      threat = Math.max(threat, 0.65);
    }
    if (Math.abs(threat - st.hud.threat) > 0.04) {
      st.setHud({ threat });
      audio.setThreat(threat);
    }
    const wantHb = st.hud.hp < 30 || threat > 0.8;
    if (wantHb !== st.hud.heartbeat) {
      st.setHud({ heartbeat: wantHb });
      if (wantHb) audio.startHeartbeat();
      else audio.stopHeartbeat();
    }
    // اهتزاز عند اندفاع وحش ضخم قريب (مُقيَّد زمنياً)
    this.chargeShakeT -= dt;
    if (this.chargeShakeT <= 0) {
      const big = this.enemies.enemies.find(
        (e) =>
          (e.kind === "brute" || e.kind === "boss") &&
          e.state === "charge" &&
          Math.hypot(e.group.position.x - this.pos.x, e.group.position.z - this.pos.z) < 8,
      );
      if (big) {
        this.addShake(0.15);
        this.chargeShakeT = 0.55;
      }
    }
    // شدة طقطقة النار القريبة (كل 0.5 ثانية)
    this.fireT -= dt;
    if (this.fireT <= 0 && this.world) {
      this.fireT = 0.5;
      let best = 999;
      for (const fl of this.world.fireLights) {
        const d = Math.hypot(fl.light.position.x - this.pos.x, fl.light.position.z - this.pos.z);
        if (d < best) best = d;
      }
      audio.setFire(Math.max(0, Math.min(1, 1 - best / 7)));
    }
    // تغيير الأجواء حسب المنطقة
    const x = this.pos.x;
    const z = this.pos.z;
    if (x > 560) {
      if (st.ambient !== "lab") {
        st.setAmbient("lab");
        audio.startAmbient("lab");
      }
    } else if (z > 92) {
      if (st.ambient !== "harbor") {
        st.setAmbient("harbor");
        audio.startAmbient("harbor");
      }
    } else if (st.ambient === "menu" || st.ambient === "lab" || st.ambient === "harbor") {
      st.setAmbient("city");
      audio.startAmbient("city");
    }
  }
}

// (استيراد مباشر من content — لا حاجة لأدوات مؤجلة)

function playingSafe() {
  return useGame.getState().screen === "playing";
}
