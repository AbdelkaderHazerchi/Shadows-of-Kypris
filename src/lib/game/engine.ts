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
import { AI_REACTIONS, ITEMS, MESSAGES, OBJECTIVE_BY_ID, SURVIVOR_BY_ID, WEAPONS } from "./content";
import type { DoorDef } from "./props";
import type { EndingId, EnemyKind, MapSnapshot, WeaponId } from "./types";

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
  private vel = new THREE.Vector3();
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
  private bobAmp = 0;
  private swayVX = 0;
  private swayVY = 0;
  private sprintDip = 0;

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w(), h(), false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);
    this.scene.fog = new THREE.FogExp2(0x0a0a0d, 0.014);

    this.camera = new THREE.PerspectiveCamera(72, w() / h(), 0.08, 260);
    this.scene.add(this.camera);

    // إضاءة أساسية — ليل مقروء بلمسة قمر باردة (RE3 night)
    const hemi = new THREE.HemisphereLight(0x35404c, 0x12100d, 0.62);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0x8a93a8, 0.42);
    moon.position.set(-60, 90, -80);
    this.scene.add(moon);

    // كشاف
    this.flashlight = new THREE.SpotLight(0xfff0d0, 0, 38, 0.62, 0.5, 1.35);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 36;
    this.flashlight.shadow.bias = -0.003;
    this.flashlight.position.set(0.18, -0.14, 0);
    this.camera.add(this.flashlight);
    this.flashTarget = new THREE.Object3D();
    this.flashTarget.position.set(0, -0.06, -6);
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
    const bloom = new UnrealBloomPass(new THREE.Vector2(w(), h()), 0.32, 0.75, 0.82);
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
    const metal = new THREE.MeshStandardMaterial({ color: 0x5e2018, roughness: 0.42, metalness: 0.8 });
    const metalDark = new THREE.MeshStandardMaterial({ color: 0x401410, roughness: 0.5, metalness: 0.7 });
    // العمود الرئيسي المائل
    const shaftTilt = { rx: Math.PI / 2 - 0.22, rz: 0.08 };
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.017, 0.6, 10), metal);
    shaft.rotation.set(shaftTilt.rx, 0, shaftTilt.rz);
    shaft.position.set(0, 0.03, -0.28);
    g.add(shaft);
    // قوس الخطاف (torus جزئي في المستوى الرأسي)
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 16, Math.PI * 1.25), metal);
    hook.position.set(0, 0.115, -0.55);
    hook.rotation.set(0, Math.PI / 2, 2.5);
    g.add(hook);
    // الطرف المسطّح أعلى القوس
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.024), metalDark);
    tip.position.set(0, 0.168, -0.535);
    tip.rotation.x = 0.5;
    g.add(tip);
    // نهاية القرّادة السفلية
    const claw = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.01, 0.05), metalDark);
    claw.position.set(0, -0.075, -0.045);
    claw.rotation.x = 0.35;
    g.add(claw);
    // لفافة القبضة
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.12, 10), metalDark);
    grip.rotation.set(shaftTilt.rx, 0, shaftTilt.rz);
    grip.position.set(0, -0.01, -0.1);
    g.add(grip);
    g.rotation.z = 0.35;
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
      else if (e.code === "Digit1") this.switchWeapon("crowbar");
      else if (e.code === "Digit2" && st.weapons.pistol) this.switchWeapon("pistol");
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
    }
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== this.canvas) return;
    const st = useGame.getState();
    if (st.screen !== "playing") return;
    const s = 0.0022;
    this.yaw -= e.movementX * s;
    this.pitch -= e.movementY * s;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    // انجراف السلاح (تأخّر لاهث)
    this.swayVX = Math.max(-0.06, Math.min(0.06, this.swayVX - e.movementX * 0.00045));
    this.swayVY = Math.max(-0.06, Math.min(0.06, this.swayVY - e.movementY * 0.0004));
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
      this.canvas.requestPointerLock?.();
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
        useGame.getState().showHint("لا يوجد حفظ متاح");
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
      const st = useGame.getState();
      const discovered = (name: string) => this.poiFound.has(name);
      const markers: MapSnapshot["markers"] = [];
      const objPos: Record<string, [number, number]> = {
        obj_wake: [-23, -59],
        obj_weapon: [-23, 23],
        obj_radio: [69, -69],
        obj_survive: [0, 100],
        obj_cards: !st.hasItem("keycard_blue") ? [69, 23] : [-69, 69],
        obj_lab: [-46, -69],
        obj_core: [-69, -69],
        obj_escape: [0, 100],
        obj_gate: [-8, 103],
        obj_wave: [0, 104],
      };
      const op = objPos[st.objectiveId];
      if (op) markers.push({ x: op[0], z: op[1], kind: "objective" });
      if (st.flags.radioDone || st.flags.coreDestroyed || st.flags.dealAccepted) {
        markers.push({ x: 0, z: 104, kind: "extraction", label: "الإخلاء" });
        if (!st.flags.saraSaved) markers.push({ x: 81.5, z: 32, kind: "survivor", label: "سارة" });
        if (!st.flags.adelSaved) markers.push({ x: -60, z: 29, kind: "survivor", label: "عادل" });
        if (!st.flags.soldierSaved) markers.push({ x: -58.5, z: 61.5, kind: "survivor", label: "الرقيب" });
      }
      if (this.poiFound.has("lab")) markers.push({ x: -69, z: -69, kind: "lab", label: "المختبر" });
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
      this.enemies.spawnFromPoints(this.world.spawns);
      // جثث مزيفة في الشوارع تنهض عند الاقتراب — عبر EnemyManager.addFakeCorpse إن توفرت
      const fakeSpots: [number, number][] = [
        [30, 30],
        [-30, -30],
        [-55, 15],
        [40, -26],
      ];
      const mgr = this.enemies as unknown as {
        addFakeCorpse?: (x: number, z: number, k: EnemyKind) => Enemy;
      };
      if (typeof mgr.addFakeCorpse === "function") {
        for (const [fx, fz] of fakeSpots) mgr.addFakeCorpse(fx, fz, "runner");
      } else {
        // احتياطي: المسار القديم
        for (const [fx, fz] of fakeSpots) {
          const e = this.enemies.addAt(fx, fz, "runner");
          e.group.visible = false;
          e.wanderT = 9999;
          e.state = "idle";
          e.targetX = fx;
          e.targetZ = fz;
        }
      }
      this.hitMeshesCache = null;
    }

    // تسجيل مصادمات الأبواب المغلقة + ارتساء مواقع الالتقاط (contract 5-b)
    for (const d of this.doorList()) {
      if (d.def.group.userData.baseRy === undefined) {
        d.def.group.userData.baseRy = d.def.group.rotation.y;
      }
      if (d.open || d.def.open) this.world!.dynamicColliders.delete(`door_${d.id}`);
      else this.world!.dynamicColliders.set(`door_${d.id}`, d.collider);
    }
    for (const p of this.pickupList()) {
      if (p.obj.userData.baseY === undefined) {
        p.obj.userData.baseY = p.obj.position.y;
        p.obj.userData.phase = Math.random() * Math.PI * 2;
      }
    }

    // موضع البداية أو نقطة الحفظ
    if (this.lastLoadedPos) {
      this.pos.set(this.lastLoadedPos[0], EYE_H, this.lastLoadedPos[1]);
      this.yaw = this.lastLoadedYaw;
    } else {
      this.pos.set(-23, EYE_H, -70);
      this.yaw = Math.PI; // نحو الباب الجنوبي
    }
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
    st.showHint("اضغط على الشاشة للتقاط مؤشر الفأرة إن لم يُقفل");
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
      this.lastShot = now;
      this.swingT = 0.28;
      this.vmRecoil = 1;
      audio.play("swing");
      // ضربة قريبة
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      this.raycaster.far = def.range;
      const hits = this.raycaster.intersectObjects(this.hitTargets(), true);
      const hit = this.pickEnemyHit(hits);
      if (hit) {
        const e = hit.object.userData.enemy as Enemy;
        this.enemies!.damageAt(e, def.damage, hit.object.userData.isHead === true);
        this.spawnBlood(hit.point);
        audio.play("hit_flesh", { volume: 0.8 });
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
    if (!this.hitMeshesCache) {
      const list: THREE.Object3D[] = [];
      this.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          if (o.userData.noHit === true) return;
          // تجاهل أشجار الكاميرا (نموذج السلاح)
          let p: THREE.Object3D | null = o;
          while (p) {
            if (p === this.camera) return;
            p = p.parent;
          }
          list.push(o);
        }
      });
      this.hitMeshesCache = list;
    }
    return this.hitMeshesCache;
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
        prompt: "التقاط الغنيمة",
        data: { item, qty },
        used: false,
      });
    }
    if (e.kind === "brute" && Math.hypot(e.group.position.x + 23, e.group.position.z - 23) < 26) {
      st.setFlag("bruteHospitalKilled", true);
      st.toastMsg("سقط المتحول العملاق… المستشفى تتنفس من جديد");
    }
    if (e.kind === "boss") {
      st.setFlag("bossKilled", true);
      this.openBossGate();
      st.toastMsg("«الحارس» سقط — الطريق إلى النواة مفتوح");
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
      clearCheckpoint();
      st.setHasSave(false);
    }
    unlockEnding(endingId);
  }

  // ══════════ interaction ══════════
  private currentInteract: Interactable | null = null;
  private forward = new THREE.Vector3();

  private findInteract(): Interactable | null {
    if (!this.world) return null;
    this.camera.getWorldDirection(this.forward);
    let best: Interactable | null = null;
    let bestScore = -1;
    for (const it of this.world.interactables) {
      if (it.used) continue;
      const dx = it.x - this.pos.x;
      const dz = it.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius) continue;
      const dot = (dx / (d || 1)) * this.forward.x + (dz / (d || 1)) * this.forward.z;
      if (dot < 0.15 && d > 1.1) continue;
      const score = dot + (it.radius - d);
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
            st.showHint("فتحت هذه الخزانة سابقاً");
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
          st.giveWeapon(it.data.weapon as "pistol" | "shotgun");
          st.toastMsg(`التقطت: ${WEAPONS[it.data.weapon as "pistol" | "shotgun"].name}`);
          audio.play("pickup");
          it.used = true;
          this.hidePickup(it.id);
          st.showHint("اضغط 2/3 لتبديل الأسلحة — 1 للعُقلة");
          return;
        }
        const ok = st.addItem(item as never, qty);
        if (!ok) {
          st.toastMsg(MESSAGES.inventoryFull);
          return;
        }
        const { ITEMS: IT } = { ITEMS };
        st.toastMsg(`التقطت: ${IT[item as keyof typeof IT]?.name ?? item}${qty > 1 ? ` ×${qty}` : ""}`);
        audio.play("pickup");
        it.used = true;
        this.hidePickup(it.id);
        break;
      }
      case "note": {
        const docId = it.data?.docId as string;
        st.setNote(docId as never);
        st.markDoc(docId as never);
        st.setScreen("note");
        document.exitPointerLock();
        it.used = true;
        break;
      }
      case "checkpoint": {
        this.doCheckpoint("خزانة");
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
      if (p.id === id) p.obj.visible = false;
    }
    // احتياطي قديم
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.pickupId === id) o.visible = false;
    });
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
      st.toastMsg("الباب مقفل… لا يرد.");
      audio.play("door_locked");
      return;
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
    this.raycaster.set(this._laserOrigin, this._laserDir);
    this.raycaster.far = 40;
    const hits = this.raycaster.intersectObjects(this.hitTargets(), true);
    const start = new THREE.Vector3();
    this.muzzle.getWorldPosition(start);
    const end = hits.length > 0 ? hits[0].point : start.clone().addScaledVector(this._laserDir, 40);
    const attr = laser.geometry.attributes.position as THREE.BufferAttribute;
    attr.setXYZ(0, start.x, start.y, start.z);
    attr.setXYZ(1, end.x, end.y, end.z);
    attr.needsUpdate = true;
    laser.visible = true;
  }
  private _laserOrigin = new THREE.Vector3();
  private _laserDir = new THREE.Vector3();

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
      st.showHint("البث انتهى. لا شيء آخر في هذه القناة.");
      return;
    }
    if (!st.flags.hasTowerKey && !st.hasItem("key_tower")) {
      st.toastMsg(MESSAGES.towerLocked);
      audio.play("door_locked");
      return;
    }
    it.used = true;
    st.toastMsg("…يُبث نداء الاستغاثة…");
    audio.play("radio_static", { volume: 0.8 });
    this.playRadioChain();
  }

  private playRadioChain() {
    const st = useGame.getState();
    const lines = ["radio_1", "radio_2", "radio_3"];
    const idx = this.radioChain;
    if (idx >= lines.length) {
      st.setFlag("radioDone", true);
      st.setObjective("obj_survive");
      st.toastMsg("استجاب الفريق السريع! الميناء الشمالي — نقطة الإخلاء");
      audio.play("stinger_discover", { volume: 0.7 });
      this.doCheckpoint("بعد البث");
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
      st.showHint("لقد ساعدتهم سابقاً — أتمنى لك حظاً… اذهب");
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
      st.toastMsg(`${s.name}: شكراً… سأصل من وحدي.`);
      st.showHint(MESSAGES.savedSurvivor(s.name));
      const f2 = useGame.getState().flags;
      const n = (f2.saraSaved ? 1 : 0) + (f2.adelSaved ? 1 : 0) + (f2.soldierSaved ? 1 : 0);
      st.setHud({ optionalObjective: `الناجون الذين أنقذتهم: ${n}/3` });
      audio.play("pickup");
      audio.play("radio_beep", { volume: 0.5 });
      this.doCheckpoint(`مهمة ${sid}`);
      return;
    }
    st.toastMsg(MESSAGES.questItemMissing(s.name, quest.qty));
    audio.play("ui_click", { volume: 0.4 });
  }

  private useGenerator(it: Interactable) {
    const st = useGame.getState();
    if (st.flags.generatorFixed) {
      st.showHint("المولد يعمل.");
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
    this.doCheckpoint("البوابة");
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
      st.showHint("البوابة مفتوحة.");
      return;
    }
    const blue = st.hasItem("keycard_blue");
    const red = st.hasItem("keycard_red");
    if (!blue || !red) {
      const missing: string[] = [];
      if (!blue) missing.push("الزرقاء (المستشفى)");
      if (!red) missing.push("الحمراء (المصنع)");
      st.toastMsg(`${MESSAGES.labDoorNeed} — ينقص: ${missing.join(" و ")}`);
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
    st.toastMsg("البوابة تنفتح على صوت حديدي ميت… سلالم تنزل نحو العتمة");
    st.setObjective("obj_core");
    this.enterLab();
  }

  private removeLabDoorCollider() {
    if (!this.world || this.labDoorColliderIdx >= 0) return;
    for (let i = this.world.colliders.length - 1; i >= 0; i--) {
      const c = this.world.colliders[i];
      if (Math.abs((c.minX + c.maxX) / 2 + 69) < 0.3 && Math.abs((c.minZ + c.maxZ) / 2 + 72.2) < 0.4) {
        this.labDoorColliderIdx = i;
        this.world.colliders.splice(i, 1);
        break;
      }
    }
  }

  private enterLab() {
    this.pos.set(600, EYE_H, 21);
    this.yaw = Math.PI; // نحو -Z داخل النفق
    this.vel.set(0, 0, 0);
    audio.startAmbient("lab");
    const st = useGame.getState();
    st.setHud({ zone: "المختبر — تحت الأرض" });
    audio.play("stinger_danger", { volume: 0.8 });
    this.doCheckpoint("مدخل المختبر");
  }

  private exitLab() {
    this.pos.set(-69, EYE_H, -62);
    this.yaw = -Math.PI / 2; // نحو بوابة المجمع شرقاً
    this.vel.set(0, 0, 0);
    audio.startAmbient(useGame.getState().flags.coreDestroyed ? "city" : "city");
    useGame.getState().setHud({ zone: "" });
    useGame.getState().showHint("عدتَ إلى سطح مجمع كيبريس. الهواء… أحمر.");
  }

  private useCore(it: Interactable) {
    const st = useGame.getState();
    if (st.flags.metAI) return;
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
      this.doCheckpoint("بعد النواة");
    } else if (choice === "deal") {
      st.setFlag("dealAccepted", true);
      st.setObjective("obj_gate");
      this.openGateBarrier();
      this.extractionReady = true;
      audio.setHeli(true);
      st.toastMsg("البوابة فُتحت من تلقاء نفسها… لا تلمس هذا الصمت");
      audio.startAmbient("harbor");
      this.doCheckpoint("الصفقة");
    } else {
      st.setObjective("obj_gate");
      st.showHint("اتركك النواة خلفك. ميناء بلاك ووتر — حيّاً.");
    }
    this.lockPointer();
  }

  private tryExtract() {
    const st = useGame.getState();
    if (!this.extractionReady) {
      st.showHint("انتظر! الفريق لم يصل بعد — واصل الصمود");
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
        this.enemies!.update(dt, this.pos, this.allColliders(), st.hud.hp > 0);
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
    // جري ولياقة
    const wantRun = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    let run = false;
    if (canMove && wantRun && st.hud.stamina > 4) {
      run = true;
      st.setHud({ stamina: Math.max(0, st.hud.stamina - 14 * dt) });
      this.staminaLock = 0.8;
    } else {
      this.staminaLock -= dt;
      if (this.staminaLock <= 0 && st.hud.stamina < 100) {
        st.setHud({ stamina: Math.min(100, st.hud.stamina + 12 * dt) });
      }
    }
    this.running = run;

    const speed = run ? 7.5 : 4.3;
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
    collideCircle(p, PLAYER_R, this.allColliders());
    const moved = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    this.pos.x = p.x;
    this.pos.z = p.z;
    // ارتداد الرأس (يُطبَّق على pos.y قبل نسخ الكاميرا)
    const targetAmp = moved > 0.001 ? (run ? 1.5 : 1) : 0;
    this.bobAmp += (targetAmp - this.bobAmp) * Math.min(1, dt * 8);
    this.pos.y = EYE_H + Math.sin(this.walkPhase * 2) * 0.035 * this.bobAmp;

    // خطوات
    if (moved > 0.001) {
      this.walkPhase += dt * (run ? 11 : 6.4);
      this.footT -= dt;
      if (this.footT <= 0) {
        this.footT = run ? 0.31 : 0.47;
        audio.play(run ? "footstep_run" : "footstep", { volume: 0.55 });
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
    let intensity = st.hud.flashlightOn ? 46 : 0;
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
        st.toastMsg("وصل الانفجار…");
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
    this.vmCrowbar.visible = w === "crowbar";
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

  private updateWorldFx(dt: number) {
    if (!this.world) return;
    const t = performance.now() / 1000;
    for (const f of this.world.fireLights) {
      f.light.intensity = f.base * (0.72 + Math.sin(t * 11 + f.light.position.x) * 0.14 + Math.random() * 0.14);
    }
    for (const f of this.world.flickerLights) {
      if (f.speed > 6) {
        f.light.intensity = Math.random() < 0.08 ? 0 : f.base * (0.6 + Math.random() * 0.5);
      } else if (f.speed > 2) {
        f.light.intensity = f.base * (0.75 + Math.sin(t * f.speed) * 0.25);
      } else {
        f.light.intensity = f.base * (0.5 + Math.max(0, Math.sin(t * f.speed * 2)) * 0.5);
      }
    }
    // تحريك الأبواب باتجاه الهدف (smooth damp ~4.5 rad/s)
    const k = 1 - Math.exp(-4.5 * dt);
    for (const d of this.doorList()) {
      if (d.def.kind === "double") {
        const kids = d.def.group.children;
        if (kids[0]) kids[0].rotation.y += ((d.open ? -1.6 : 0) - kids[0].rotation.y) * k;
        if (kids[1]) kids[1].rotation.y += ((d.open ? 1.6 : 0) - kids[1].rotation.y) * k;
      } else {
        const baseRy = (d.def.group.userData.baseRy as number | undefined) ?? 0;
        d.def.group.rotation.y += ((d.open ? baseRy - 1.9 : baseRy) - d.def.group.rotation.y) * k;
      }
    }
    // التقاطات عائمة قرب اللاعب (حتى 45م)
    for (const p of this.pickupList()) {
      const dx = p.obj.position.x - this.pos.x;
      const dz = p.obj.position.z - this.pos.z;
      if (dx * dx + dz * dz > 2025) continue;
      if (!p.obj.visible) continue;
      const base = (p.obj.userData.baseY as number | undefined) ?? p.obj.position.y;
      const ph = (p.obj.userData.phase as number | undefined) ?? 0;
      p.obj.position.y = base + Math.sin(t * 2 + ph) * 0.04;
      p.obj.rotation.y += dt * 0.9;
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
    st.setPrompt(it ? `E — ${it.prompt}` : "");
  }

  private onTrigger(id: string) {
    const st = useGame.getState();
    switch (id) {
      case "trig_apartment_exit":
        st.setFlag("exitedApartment", true);
        st.setObjective("obj_weapon");
        st.showHint("الشارع… لا تنجُ دون سلاح. انتبه للصوت — الرصاص يجذبهم");
        break;
      case "trig_gunshop":
        this.poiFound.add("متجر الأسلحة");
        break;
      case "trig_police":
        this.poiFound.add("مركز الشرطة");
        st.showHint("مركز الشرطة… قد يكون مفتاح برج الإذاعة هنا");
        break;
      case "trig_tower":
        this.poiFound.add("برج الإذاعة");
        break;
      case "trig_hospital":
        this.poiFound.add("المستشفى المركزي");
        st.toastMsg(MESSAGES.bruteWarn);
        audio.play("stinger_danger", { volume: 0.6 });
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
        if (st.flags.radioDone) st.showHint("سور مجمع كيبريس… البوابة الكبيرة تحتاج بطاقتي وصول");
        break;
      case "trig_harbor":
        this.poiFound.add("ميناء بلاك ووتر");
        if (!st.flags.generatorFixed && !st.flags.coreDestroyed && !st.flags.dealAccepted) {
          st.showHint("بوابة الميناء مقفلة — المولد بجانبها يحتاج وقوداً");
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
    st.toastMsg("وصل الفريق! اركض إلى القارب الآن!");
    audio.play("radio_beep");
    this.world!.boatLight.intensity = 3.2;
    this.enemies!.killAllInRadius(this.pos.x, this.pos.z, 6);
  }

  private updateAudioDirectors(dt: number, st: ReturnType<typeof useGame.getState>) {
    if (!this.enemies) return;
    const { dist, chasing, boss } = this.enemies.nearestThreat(this.pos.x, this.pos.z);
    let threat = 0;
    if (chasing) threat = Math.max(0.35, 1 - dist / 30);
    if (boss && dist < 45) threat = Math.max(threat, 0.55);
    if (Math.abs(threat - st.hud.threat) > 0.05) {
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
