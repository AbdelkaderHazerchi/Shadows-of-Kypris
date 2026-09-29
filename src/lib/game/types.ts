// ─────────────────────────────────────────────────────────────
// Shadows of Kypris / ظلال كيبريس — Shared types for the whole game
// ─────────────────────────────────────────────────────────────

export type Lang = "en" | "ar";

export type Screen =
  | "menu"
  | "intro"
  | "playing"
  | "paused"
  | "inventory"
  | "note"
  | "map"
  | "missions"
  | "ending"
  | "help"
  | "gallery";

export type WeaponId = "crowbar" | "pistol" | "shotgun";

export type ItemId =
  | "medkit"
  | "bandage"
  | "food"
  | "battery"
  | "pistol_ammo"
  | "shotgun_ammo"
  | "fuel"
  | "key_tower"
  | "key_locker"
  | "keycard_blue"
  | "keycard_red"
  | "doc_1"
  | "doc_2"
  | "doc_3"
  | "doc_4"
  | "doc_5"
  | "doc_6";

export type ItemKind = "consumable" | "key" | "doc" | "material";

export interface ItemDef {
  id: ItemId;
  name: string;
  desc: string;
  kind: ItemKind;
  stack: number; // max per slot
  weight: string; // flavor
}

export interface InvSlot {
  uid: string;
  item: ItemId;
  qty: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  melee: boolean;
  damage: number; // per bullet or per pellet / per swing
  pellets?: number;
  spread?: number; // radians
  magSize: number;
  fireRate: number; // seconds between shots
  reloadTime: number; // seconds
  headMult: number;
  range: number;
  ammoItem?: ItemId;
  noise: number; // how far enemies hear it
}

export type EnemyKind = "walker" | "runner" | "spitter" | "brute" | "boss";

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  walkSpeed: number;
  chaseSpeed: number;
  chargeSpeed?: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  sightRange: number;
  hearRange: number;
  score: number;
  /** هجوم بعيد (نافث الحمض) */
  ranged?: { minDist: number; maxDist: number; cd: number; dmg: number; speed: number };
}

// ── Story ──

export interface DocDef {
  id: ItemId; // doc_1..doc_6
  title: string;
  location: string;
  body: string;
}

export interface ObjectiveDef {
  id: string;
  text: string;
  optional?: string; // secondary text
}

export interface EndingDef {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  tone: "dark" | "hope" | "truth" | "grim";
}

export interface SurvivorDef {
  id: "sara" | "adel" | "soldier";
  name: string;
  place: string;
  line: string;
  /** مهمة جانبية: تتحدث معه أولاً ليعطيك طلباً، ثم أعطه العنصر */
  quest?: {
    ask: string;
    item: ItemId;
    qty: number;
    rewardText: string;
    /** عناصر المكافأة عند إكمال المهمة */
    reward: { item?: ItemId; qty?: number; ammo?: "pistol" | "shotgun"; ammoQty?: number }[];
  };
}

// ── Store / runtime ──

export type AmbientProfile = "menu" | "city" | "indoor" | "lab" | "harbor";

export interface HudState {
  hp: number;
  maxHp: number;
  stamina: number;
  battery: number;
  flashlightOn: boolean;
  equipped: WeaponId | null;
  pistolMag: number;
  shotgunMag: number;
  pistolAmmo: number;
  shotgunAmmo: number;
  reloading: boolean;
  objective: string;
  optionalObjective: string;
  prompt: string;
  hint: string;
  hintAt: number;
  damageAt: number;
  healAt: number;
  heartbeat: boolean;
  threat: number; // 0..1 music tension
  zone: string; // current district name shown subtly
  escapeTimer: number; // seconds remaining, -1 = off
  waveTimer: number; // seconds remaining, -1 = off
  bossesNear: boolean;
}

export interface GameFlags {
  exitedApartment: boolean;
  hasWeapon: boolean;
  hasTowerKey: boolean;
  radioDone: boolean;
  saraSaved: boolean;
  saraQuest: boolean; // سلمت علبة الإسعاف لسارة
  adelSaved: boolean;
  adelQuest: boolean; // أعطيت عادل الطعام
  soldierSaved: boolean;
  lockerOpened: boolean; // فتحت خزانة أسلحة الشرطة
  metSara: boolean;
  metAdel: boolean;
  metSoldier: boolean;
  labEntered: boolean;
  metAI: boolean;
  dealAccepted: boolean;
  coreDestroyed: boolean;
  bossKilled: boolean;
  generatorFixed: boolean;
  waveDone: boolean;
  extracted: boolean;
  bruteHospitalKilled: boolean;
}

export interface GameStats {
  kills: number;
  headshots: number;
  shots: number;
  damageTaken: number;
  itemsUsed: number;
  playSeconds: number;
}

export interface SaveData {
  pos: [number, number];
  yaw: number;
  hp: number;
  stamina: number;
  battery: number;
  pistolAmmo: number;
  shotgunAmmo: number;
  pistolMag: number;
  shotgunMag: number;
  weapons: { pistol: boolean; shotgun: boolean };
  equipped: WeaponId | null;
  inventory: (InvSlot | null)[];
  flags: GameFlags;
  docsRead: ItemId[];
  stats: GameStats;
  objectiveId: string;
  checkpoint: string;
  savedAt: number;
}

export type EndingId =
  | "ending_death"
  | "ending_escape"
  | "ending_rescue"
  | "ending_sacrifice"
  | "ending_truth"
  | "ending_deal";

export interface EndingRunRecord {
  ending: EndingId;
  playSeconds: number;
  kills: number;
  docs: number;
  survivors: number;
  createdAt: string;
}

// Map data handed from engine to the map screen
export interface MapBuilding {
  x: number;
  z: number;
  w: number;
  d: number;
  name?: string;
  poi?: boolean;
  discovered?: boolean;
}
export interface MapRoad {
  x: number;
  z: number;
  w: number;
  d: number;
  blocked?: boolean;
}
export interface MapSnapshot {
  buildings: MapBuilding[];
  roads: MapRoad[];
  player: { x: number; z: number; yaw: number };
  markers: { x: number; z: number; kind: string; label?: string }[];
}
