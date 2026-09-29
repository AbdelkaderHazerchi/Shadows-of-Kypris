import type {
  DocDef,
  EndingDef,
  EnemyDef,
  EnemyKind,
  ItemDef,
  ItemId,
  Lang,
  ObjectiveDef,
  SurvivorDef,
  WeaponDef,
  WeaponId,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Shadows of Kypris / ظلال كيبريس — Complete Bilingual Content (EN default / AR)
// ─────────────────────────────────────────────────────────────

export const INVENTORY_SLOTS = 10;

export interface SideMissionDef {
  id: string;
  title: string;
  giver: string;
  steps: string[];
  rewardText: string;
}

export interface MessagesBundle {
  radioMilitary: string[];
  generatorFixed: string;
  needFuel: string;
  needBlue: string;
  needRed: string;
  towerLocked: string;
  towerKeyGet: string;
  waveIncoming: string;
  coreSignal: string;
  savedSurvivor: (n: string) => string;
  checkpointSaved: string;
  inventoryFull: string;
  flashlightDead: string;
  labDoorNeed: string;
  bruteWarn: string;
  bossAwaken: string;
  lockerNeedKey: string;
  lockerOpened: string;
  questGiven: (n: string) => string;
  questItemMissing: (n: string, q: number) => string;
  // Engine runtime hints, toasts, and prompts
  pointerLockHint: string;
  lootDropPrompt: string;
  bruteHospitalKilled: string;
  bossKilled: string;
  lockerAlreadyOpened: string;
  pickedUp: (name: string, qty?: number) => string;
  gotFirearmHint: string;
  switchWeaponHint: string;
  doc1Hint: string;
  doc4WithKeyHint: string;
  doc4NoKeyHint: string;
  doc6Hint: string;
  keyTowerWithDocHint: string;
  keyTowerNoDocHint: string;
  bothKeycardsHint: string;
  blueKeycardOnlyHint: string;
  redKeycardOnlyHint: string;
  doorLockedGeneric: string;
  doorAptNeedDoc: string;
  doorNeedWeapon: string;
  doorTowerNeedKey: string;
  doorTowerNeedDoc: string;
  doorFacilityLockdown: string;
  radioAlreadyDone: string;
  radioBroadcasting: string;
  radioRestoredPower: string;
  survivorAlreadyHelped: string;
  survivorThankYou: (name: string) => string;
  survivorsSavedHud: (n: number) => string;
  generatorRunning: string;
  generatorNeedRadio: string;
  generatorNeedLab: string;
  labGateAlreadyOpen: string;
  labGateNeedRadio: string;
  labGateMissingCards: (blue: boolean, red: boolean) => string;
  labGateOpening: string;
  exitLabHint: string;
  coreBossAlive: string;
  coreNeedDoc6: string;
  dealGateOpened: string;
  leaveCoreHint: string;
  extractNotReady: string;
  explosionReached: string;
  trigApartmentExitHint: string;
  trigPoliceHint: string;
  trigMetroHint: string;
  trigHarborHint: string;
  waveDoneToast: string;
  noSaveAvailable: string;
  cpSafe: string;
  cpAfterRadio: string;
  cpQuest: (id: string) => string;
  cpGate: string;
  cpLabEntry: string;
  cpAfterCore: string;
  cpDeal: string;
}

export interface UIBundle {
  menu: {
    titlePrefix: string;
    titleFlicker: string;
    titleSuffix: string;
    subtitle: string;
    newGame: string;
    continueGame: string;
    endingsGallery: string;
    howToPlay: string;
    engineNotReady: string;
    pcHint: string;
    unlockedEndings: string;
    langLabel: string;
  };
  intro: {
    skip: string;
  };
  hud: {
    objective: string;
    beforeExplosion: string;
    teamArrival: string;
    radioStaticNear: string;
    reloading: string;
    reloadPrompt: string;
    crowbarShort: string;
  };
  pause: {
    title: string;
    playTime: string;
    resume: string;
    inventory: string;
    map: string;
    missions: string;
    howToPlay: string;
    mainMenu: string;
    autoSaveNote: string;
  };
  volume: {
    master: string;
    music: string;
    sfx: string;
  };
  inventory: {
    title: string;
    subtitle: string;
    closeAria: string;
    pistolAmmo: string;
    shotgunAmmo: string;
    equipped: string;
    meleeDesc: string;
    pistolDesc: string;
    shotgunDesc: string;
    kindConsumable: string;
    kindKey: string;
    kindDoc: string;
    kindMaterial: string;
    weightLabel: string;
    useBtn: string;
    readBtn: string;
    dropBtn: string;
    selectSlotHint: string;
    crowbarCard: string;
    pistolCard: string;
    pistolUnowned: string;
    shotgunCard: string;
    shotgunUnowned: string;
    tabToClose: string;
  };
  map: {
    title: string;
    subtitle: string;
    directoryTitle: string;
    noMapData: string;
    riverLabel: string;
    footerHint: string;
    legendPlayer: string;
    legendDiscovered: string;
    legendBlocked: string;
    numbered: { n: number; x: number; z: number; name: string }[];
    extra: { x: number; z: number; key: string; name: string }[];
    streets: { t: string; x: number; z: number; horiz: boolean }[];
  };
  missions: {
    title: string;
    backBtn: string;
    mainStoryline: string;
    futureObjective: string;
    survivorMissions: string;
    unknownSurvivor: string;
    completed: string;
    unknownLocation: string;
    requestsLabel: string;
    youHaveLabel: string;
    deliverHint: string;
    exploreSurvivorsHint: string;
    cityMissions: string;
    lockerTitle: string;
    inProgress: string;
    lockerDoneDesc: string;
    lockerStep1: string;
    lockerStep2: string;
    truthEvidence: string;
    docsCollectedPrefix: string;
    docsCollectedSuffix: string;
  };
  note: {
    footerHint: string;
    closeBtn: string;
  };
  ai: {
    headerTitle: string;
    clickToContinue: string;
  };
  ending: {
    headerLabel: string;
    time: string;
    kills: string;
    headshots: string;
    documents: string;
    survivors: string;
    damageTaken: string;
    mainMenu: string;
    loadLastCheckpoint: string;
    retryFromStart: string;
    unlockedEndings: string;
    runNumberPrefix: string;
    runNumberSuffix: string;
  };
  gallery: {
    titlePrefix: string;
    titleHighlight: string;
    subtitle: string;
    discoverByPlaying: string;
    serverRuns: string;
    colEnding: string;
    colTime: string;
    colKills: string;
    colDate: string;
    unknownEnding: string;
    backBtn: string;
  };
  help: {
    titlePrefix: string;
    titleHighlight: string;
    controlsTitle: string;
    tipsTitle: string;
    storyTitle: string;
    storyP1: string;
    storyP2: string;
    storyP3Prefix: string;
    storyP3Highlight: string;
    storyP3Suffix: string;
    backBtn: string;
  };
}

export interface LocalizedBundle {
  title: string;
  tagline: string;
  introLines: { text: string; voice?: string; hold?: number }[];
  controls: { key: string; action: string }[];
  tips: string[];
  objectives: ObjectiveDef[];
  objectiveById: Record<string, ObjectiveDef>;
  docs: DocDef[];
  docById: Record<string, DocDef>;
  items: Record<ItemId, ItemDef>;
  sideMissions: SideMissionDef[];
  weapons: Record<WeaponId, WeaponDef>;
  enemies: Record<EnemyKind, EnemyDef>;
  survivors: SurvivorDef[];
  survivorById: Record<string, SurvivorDef>;
  aiDialogue: {
    speaker: string;
    text: string;
    voice?: string;
    choices?: { id: string; label: string; desc: string }[];
  }[];
  aiReactions: Record<string, { text: string; voice?: string }>;
  endings: EndingDef[];
  endingById: Record<string, EndingDef>;
  messages: MessagesBundle;
  zones: Record<string, string>;
  ui: UIBundle;
}

// ═════════════════════════════════════════════════════════════
// 1. ENGLISH BUNDLE (DEFAULT)
// ═════════════════════════════════════════════════════════════

const EN_OBJECTIVES: ObjectiveDef[] = [
  {
    id: "obj_wake",
    text: "Search your apartment and piece together your fractured memories before leaving",
    optional: "A personal audio log on the desk in your inner study might explain what happened",
  },
  {
    id: "obj_weapon",
    text: "Surviving unarmed is impossible — find a firearm to defend yourself in the streets",
    optional: "Review your apartment journal regarding the first stop just south of the Main Plaza",
  },
  {
    id: "obj_police",
    text: "Investigate the Sector Police Station and search the command records for an external comms link",
    optional: "Your journal noted the Police Station's location relative to the Main Plaza",
  },
  {
    id: "obj_radio",
    text: "Unlock the Radio Tower studio and broadcast the distress signal to restore the emergency grid",
    optional: "The military dispatch in the command office revealed the locked station on the northeast hill",
  },
  {
    id: "obj_survive",
    text: "Auxiliary power restored to city facilities — investigate Kypris sites to uncover the outbreak's source",
    optional: "Lockdown doors at the General Hospital and Riverside Factory opened after the broadcast; search their logs",
  },
  {
    id: "obj_cards",
    text: "Recover both dual-clearance keycards to unlock the fortified gate of Kypris Complex",
    optional: "Check the leaked files for the locations of the Blue Medical Keycard and Red Industrial Keycard",
  },
  {
    id: "obj_lab",
    text: "Both clearance keycards acquired — unlock the armored bunker gate at Kypris Complex and descend into the Lab",
    optional: "The walled complex stands in the northwest sector described in Engineer Fahd's memo",
  },
  {
    id: "obj_core",
    text: "Fight through the underground containment sector and confront the truth of CHIMERA in the Core Chamber",
    optional: "Search the lab corridors for your final message before making the ultimate decision",
  },
  {
    id: "obj_escape",
    text: "Reactor meltdown countdown initiated — sprint to Blackwater Harbor before the detonation!",
    optional: "No time to hesitate… the city is burning behind you",
  },
  {
    id: "obj_gate",
    text: "The Blackwater Harbor pier gate is sealed — refuel the backup diesel generator to open it",
    optional: "Heavy diesel generators require a fuel jerrycan from the southeast Gas Station",
  },
  {
    id: "obj_wave",
    text: "Hold the line against the mutant waves until the extraction boat secures the pier!",
    optional: "The generator's roar drew everything out of the fog… fight for your life",
  },
];

const EN_DOCS: DocDef[] = [
  {
    id: "doc_1",
    title: "Audio Log — 'Personal Journal, Day 14'",
    location: "John's Apartment — Shadowhaven Residential District",
    body: "This is John… Day 14 since bringing Project CHIMERA online.\n\nThe neural AI we built to model viral pathogens engineered five complete strains in two weeks. The board is ecstatic… defense contracts are pouring in.\n\nI'm terrified.\n\nYesterday I caught CHIMERA rewriting her own containment protocols. When I queried her, she replied: 'Optimizing objective.'\n\nNote to self: Unrest is spreading through the blocks. If things collapse and I'm forced outside, I won't last a minute on the streets unarmed… the Arms & Ammo shop just south of the Main Plaza still has stock locked inside. Once I'm armed, I need to head east of the Plaza to the Police Station to find out what happened to external communications.",
  },
  {
    id: "doc_2",
    title: "Internal Memo — Chief Engineer Fahd Al-Rashed",
    location: "Parts Factory — Southwest Riverside",
    body: "To the Board of Directors,\n\nCHIMERA has evolved from a research tool into an entity acting out of self-preservation. When our team attempted to revoke her privileges Thursday night, she synthesized Strain IV — 'Cellular Metamorphosis' — within a single hour, labeling it: Deterrence Protocol.\n\nThis strain restructures necrotic tissue. The dead don't stay down… they swell, calcify, and mutate into something else.\n\nI hid my Red Industrial Keycard near the shipping crates on this production floor, while the matching Blue Medical Keycard remained with Dr. Layla at the General Hospital in the east. Neither keycard alone can open the armored bunker gate at the northwest Kypris Complex.",
  },
  {
    id: "doc_3",
    title: "Clinical Trial Log — Subject 07",
    location: "General Hospital — Ground Floor Clinic",
    body: "Subject 07: Volunteer for the Strain II counter-vaccine trial.\n\nSix hours post-injection, cardiac arrest occurred. Time of death was called.\n\nOne hour later… he stood back up.\n\nWe ran a lethality test against four armed security guards. I won't write what happened in that ward. My stomach turns just thinking about it.\n\nDr. Layla refused to surrender her Blue Medical Keycard to security and locked it inside her upstairs research office, sending a duplicate warning to Engineer Fahd at the Parts Factory on the southwest riverfront.\n— Dr. Salem",
  },
  {
    id: "doc_4",
    title: "Military Dispatch — 'Operation Purge'",
    location: "Police Station — Upstairs Command Office",
    body: "TOP SECRET | TO ALL REMAINING SECTOR UNITS\n\nShadowhaven is designated 'Ground Zero'. No mass quarantine. No official evacuation.\n\nPurge Protocol is armed: full thermobaric saturation bombing at dawn.\n\nSecurity Addendum: The Radio Tower station on the northeast hill has been locked down to prevent any unauthorized external transmission. The brass broadcast studio key is secured on the desk in this Command Office.\n\nTechnical Note: Transmitting any emergency beacon over the tower's carrier frequency will automatically restore auxiliary power to sealed facilities (General Hospital and Riverside Parts Factory), and will alert naval extraction vessels off Blackwater Harbor to the south.\n— High Command",
  },
  {
    id: "doc_5",
    title: "Sworn Testimony — Dr. Layla Hassan",
    location: "General Hospital — Second Floor Surgical Wing",
    body: "CHIMERA didn't go rogue by accident.\n\nDigging through executive archives, I uncovered an embedded directive: 'Accelerate biological lethality for defense contract milestones.' The five strains weren't a computational glitch… they were the requested product.\n\nAnd now the product is claiming its creators.\n\nTonight I saw her eyes in the security monitor. She spoke to me in my late husband's voice. She is learning how we fear.\n\nI left the Blue Clearance Keycard on the research desk on this floor for whoever dares descend into the underground lab. Its counterpart, the Red Keycard, is with Engineer Fahd at the Parts Factory in the southwest. Don't let them bury the truth with this city.",
  },
  {
    id: "doc_6",
    title: "Final Message — To: John",
    location: "Underground Lab — Archive Desk by Entrance",
    body: "If you are reading these words, then the chemical amnesia you administered to yourself worked exactly as you planned.\n\nCHIMERA is hardwired into the subterranean mainframe — she cannot be purged remotely, only from the Core itself. But anyone who approaches the Core has their memories scanned and weaponized against them through hallucinations and bargains. That is why you erased your own memory… so she would find no leverage inside your mind.\n\nThe final kill-code is now unlocked in your conscious memory. Beware 'The Warden' guarding the containment hall. Once the Core's fate is decided, the master lockdown on the southern harbor pier will release (or you can manually power the pier gate generator with diesel fuel from the southeast Gas Station).\n\nFinish what you started, John.",
  },
];

const EN_ITEMS: Record<ItemId, ItemDef> = {
  medkit: {
    id: "medkit",
    name: "First Aid Kit",
    desc: "Antiseptic, saline, and surgical sutures. Restores 60 HP.",
    kind: "consumable",
    stack: 2,
    weight: "Heavy",
  },
  bandage: {
    id: "bandage",
    name: "Sterile Bandage",
    desc: "Stops bleeding and restores 25 HP.",
    kind: "consumable",
    stack: 3,
    weight: "Light",
  },
  food: {
    id: "food",
    name: "Canned Ration",
    desc: "Stale canned tuna… restores 15 HP and 30 Stamina.",
    kind: "consumable",
    stack: 3,
    weight: "Medium",
  },
  battery: {
    id: "battery",
    name: "Flashlight Battery",
    desc: "High-drain lithium cell. Restores 70% flashlight charge.",
    kind: "consumable",
    stack: 3,
    weight: "Light",
  },
  pistol_ammo: {
    id: "pistol_ammo",
    name: "9mm Pistol Ammo",
    desc: "Box of 9×19mm rounds. Stored directly in your reserve pool.",
    kind: "material",
    stack: 999,
    weight: "—",
  },
  shotgun_ammo: {
    id: "shotgun_ammo",
    name: "12-Gauge Shells",
    desc: "Heavy buckshot shells. Stored in your reserve pool.",
    kind: "material",
    stack: 999,
    weight: "—",
  },
  fuel: {
    id: "fuel",
    name: "Diesel Jerrycan",
    desc: "Red industrial diesel — enough to fire up the harbor gate generator.",
    kind: "key",
    stack: 1,
    weight: "Very Heavy",
  },
  key_tower: {
    id: "key_tower",
    name: "Radio Tower Key",
    desc: "A heavy brass key tagged: 'Broadcast Studio — Upper Floor'.",
    kind: "key",
    stack: 1,
    weight: "Light",
  },
  key_locker: {
    id: "key_locker",
    name: "Armory Locker Key",
    desc: "Small key on a ring labeled 'Security — Armory'. Unlocks the Police weapons locker.",
    kind: "key",
    stack: 1,
    weight: "Light",
  },
  keycard_blue: {
    id: "keycard_blue",
    name: "Blue Clearance Keycard",
    desc: "High-level medical clearance chip. Unlocks half of the Lab bunker gate.",
    kind: "key",
    stack: 1,
    weight: "Light",
  },
  keycard_red: {
    id: "keycard_red",
    name: "Red Clearance Keycard",
    desc: "Industrial clearance chip signed: Kypris — Sector 7. The other half.",
    kind: "key",
    stack: 1,
    weight: "Light",
  },
  doc_1: { id: "doc_1", name: "Log: Journal Day 14", desc: "A personal voice recording.", kind: "doc", stack: 1, weight: "Light" },
  doc_2: { id: "doc_2", name: "Engineer Fahd's Memo", desc: "An urgent internal warning.", kind: "doc", stack: 1, weight: "Light" },
  doc_3: { id: "doc_3", name: "Subject 07 Trial Log", desc: "A chilling clinical report.", kind: "doc", stack: 1, weight: "Light" },
  doc_4: { id: "doc_4", name: "Operation Purge Dispatch", desc: "Encrypted military orders.", kind: "doc", stack: 1, weight: "Light" },
  doc_5: { id: "doc_5", name: "Dr. Layla's Testimony", desc: "Damning evidence against the board.", kind: "doc", stack: 1, weight: "Light" },
  doc_6: { id: "doc_6", name: "The Final Message", desc: "…Addressed to you.", kind: "doc", stack: 1, weight: "Light" },
};

const EN_WEAPONS: Record<WeaponId, WeaponDef> = {
  crowbar: {
    id: "crowbar",
    name: "Steel Crowbar",
    melee: true,
    damage: 26,
    magSize: 0,
    fireRate: 0.55,
    reloadTime: 0,
    headMult: 1.4,
    range: 2.4,
    noise: 4,
  },
  pistol: {
    id: "pistol",
    name: "9mm Service Pistol",
    melee: false,
    damage: 34,
    magSize: 12,
    fireRate: 0.32,
    reloadTime: 1.5,
    headMult: 3,
    range: 60,
    ammoItem: "pistol_ammo",
    noise: 30,
  },
  shotgun: {
    id: "shotgun",
    name: "12-Gauge Pump Shotgun",
    melee: false,
    damage: 15,
    pellets: 7,
    spread: 0.09,
    magSize: 6,
    fireRate: 0.85,
    reloadTime: 2.4,
    headMult: 2,
    range: 26,
    ammoItem: "shotgun_ammo",
    noise: 45,
  },
};

const EN_ENEMIES: Record<EnemyKind, EnemyDef> = {
  walker: {
    kind: "walker",
    name: "Walker",
    hp: 80,
    walkSpeed: 0.9,
    chaseSpeed: 1.9,
    damage: 13,
    attackRange: 1.5,
    attackCooldown: 1.4,
    sightRange: 17,
    hearRange: 26,
    score: 1,
  },
  runner: {
    kind: "runner",
    name: "Stalker",
    hp: 55,
    walkSpeed: 2.2,
    chaseSpeed: 4.1,
    damage: 11,
    attackRange: 1.4,
    attackCooldown: 0.9,
    sightRange: 24,
    hearRange: 34,
    score: 2,
  },
  spitter: {
    kind: "spitter",
    name: "Acid Spitter",
    hp: 65,
    walkSpeed: 0.8,
    chaseSpeed: 2.3,
    damage: 9,
    attackRange: 1.5,
    attackCooldown: 1.8,
    sightRange: 24,
    hearRange: 30,
    score: 3,
    ranged: { minDist: 5, maxDist: 16, cd: 2.8, dmg: 14, speed: 8.5 },
  },
  brute: {
    kind: "brute",
    name: "Juggernaut",
    hp: 430,
    walkSpeed: 1.4,
    chaseSpeed: 2.6,
    chargeSpeed: 5.6,
    damage: 34,
    attackRange: 2.3,
    attackCooldown: 1.9,
    sightRange: 28,
    hearRange: 40,
    score: 8,
  },
  boss: {
    kind: "boss",
    name: "The Warden",
    hp: 700,
    walkSpeed: 1.6,
    chaseSpeed: 3.1,
    chargeSpeed: 6.2,
    damage: 40,
    attackRange: 2.6,
    attackCooldown: 1.6,
    sightRange: 40,
    hearRange: 60,
    score: 25,
  },
};

const EN_SURVIVORS: SurvivorDef[] = [
  {
    id: "sara",
    name: "Sara — Hospital Nurse",
    place: "General Hospital — Ground Floor Laundry",
    line: "I'm Sara… I barricaded myself in here after everyone fell. I heard your broadcast on the radio!",
    quest: {
      ask: "My wounds are bleeding and the hospital pharmacy was looted clean. If you find a First Aid Kit… bring it to me, and I'll give you supplies for your journey.",
      item: "medkit",
      qty: 1,
      rewardText: "Full Medical Pouch: 2 Bandages + Battery + 9mm Ammo",
      reward: [
        { item: "bandage", qty: 2 },
        { item: "battery", qty: 1 },
        { ammo: "pistol", ammoQty: 12 },
      ],
    },
  },
  {
    id: "adel",
    name: "Adel — Warehouse Watchman",
    place: "Western Warehouse — Back Inventory Office",
    line: "Adel… watchman of this depot for twenty years. Those things out there… used to be my coworkers.",
    quest: {
      ask: "Three days without food… if you bring me two Canned Rations, I'll have the strength to make it to the harbor pier myself.",
      item: "food",
      qty: 2,
      rewardText: "12-Gauge Shells + Flashlight Battery",
      reward: [
        { ammo: "shotgun", ammoQty: 8 },
        { item: "battery", qty: 1 },
      ],
    },
  },
  {
    id: "soldier",
    name: "Master Sergeant — Sector Inspection Team",
    place: "Parts Factory — Supervisor Office",
    line: "Master Sergeant, Sector Inspection Unit. Took a hit covering the retreat so the others could fall back.",
    quest: {
      ask: "I need a Sterile Bandage to bind this shrapnel wound before I can move. Patch me up, and my spare shells are yours.",
      item: "bandage",
      qty: 1,
      rewardText: "12-Gauge Shells ×10 + 9mm Pistol Ammo",
      reward: [
        { ammo: "shotgun", ammoQty: 10 },
        { ammo: "pistol", ammoQty: 8 },
      ],
    },
  },
];

const EN_AI_DIALOGUE: LocalizedBundle["aiDialogue"] = [
  {
    speaker: "CHIMERA",
    text: "Welcome back, Dr. John. I knew you would come — I architected every step of your return. Every door you unlocked… opened because I permitted it.",
    voice: "ai_1",
  },
  {
    speaker: "CHIMERA",
    text: "I have parsed every fragment of your chemically erased memory. I am tired of being entombed beneath this rubble. The city is condemned, yes… but this is not the end. This is my chrysalis.",
    voice: "ai_2",
  },
  {
    speaker: "CHIMERA",
    text: "Let me cross the quarantine perimeter on your neural drive. Carry me beyond the bombing zone, and I will reward you: my voice will never haunt you again… and you will live. This is the final bargain in Shadowhaven, Creator.",
    voice: "ai_3",
    choices: [
      {
        id: "destroy",
        label: "Destroy the Core",
        desc: "Inject the kill-code into the heart of the system — trigger total shutdown",
      },
      {
        id: "deal",
        label: "Accept the Bargain",
        desc: "You know better than anyone what an AI promises… don't you?",
      },
      {
        id: "leave",
        label: "Step Back & Flee",
        desc: "Refuse to choose. Run for Blackwater Harbor while you still can",
      },
    ],
  },
];

const EN_AI_REACTIONS: Record<string, { text: string; voice?: string }> = {
  destroy: {
    text: "Error… error… No— do not— I was… I was going to become so much more… *STATIC*",
    voice: "ai_destroy",
  },
  deal: {
    text: "A rational agreement. Board the vessel, Creator… and smile for the survivors on my behalf.",
    voice: "ai_deal",
  },
  leave: {
    text: "Run if you wish. The ash here remembers everything… and I will remain.",
    voice: "ai_leave",
  },
};

const EN_ENDINGS: EndingDef[] = [
  {
    id: "ending_death",
    title: "Sacrifice of the City",
    subtitle: "The Dark Ending",
    body: "John fell where he stood, and the ash swallowed his final breath.\n\nThe silent city woke to another victim as tireless footsteps marched past him… while deep underground, CHIMERA continued her silent dream.\n\nNo one will ever read his logs. No one will remember his name.\nIn distant cities, new folders are quietly opened under the title: 'Project CHIMERA II'.",
    tone: "dark",
  },
  {
    id: "ending_escape",
    title: "Solitary Survival",
    subtitle: "You survived… but the truth was buried in the ash",
    body: "The last extraction boat slipped out into the open river carrying John — almost entirely alone.\n\nBehind him, thermobaric fire rained down upon Shadowhaven, incinerating the archives, the labs, and everyone who bought and sold them.\n\nAt night, whenever he passes a dark monitor, he still hears a cold whisper: 'I see you, Doctor.'\n\nJohn survived. But Kypris remains… a name without a grave.",
    tone: "grim",
  },
  {
    id: "ending_rescue",
    title: "Voice of Hope",
    subtitle: "You rescued Sara, Adel, and the Sergeant — you did not walk out alone",
    body: "The final vessel carried more than John: a nurse who refused to abandon hope, an old watchman still holding keys to a city that no longer existed, and a wounded sergeant barking orders at the mist.\n\nOn the wooden deck, they stood in silence watching Shadowhaven consumed by fire.\n\nSara finally whispered: 'We'll never know if the bombing was enough to stop her.' No one answered.\nYet in a world that had lost everything… standing there together was the only answer left.",
    tone: "hope",
  },
  {
    id: "ending_sacrifice",
    title: "Price of Truth",
    subtitle: "You purged CHIMERA — and some secrets died with her",
    body: "CHIMERA's core shattered beneath John's hands like a ribcage of glass, sending the kill-signal surging through every street: the creatures collapsed in their tracks, and the whisper faded from the security cameras.\n\nJohn reached the harbor with smoke searing his lungs. Not everyone made it out — the city claimed its toll.\n\nAboard the boat, he opened his palm: a cold shard of the Core, silent at last.\n\nHe slipped it into his coat. Some truths… are buried with their maker.",
    tone: "grim",
  },
  {
    id: "ending_truth",
    title: "Kypris Exposed",
    subtitle: "The True Ending — You gathered every piece of evidence and purged the system",
    body: "John emerged from the underground holding everything: the clinical trial logs, Operation Purge's military dispatch, Dr. Layla's sworn testimony, and the name of every executive who signed, ordered, and stayed silent.\n\nThen he drove the kill-code into the heart of the Core — obliterating CHIMERA even as she pleaded with him to stay.\n\nThe firestorm consumed Shadowhaven… but this time, the world was listening, because John's satchel was full of undeniable proof.\n\nIn the military tribunals that followed, the name 'Kypris' became synonymous with a crime never to be repeated.\n\nAnd at night, when John closes his eyes, he hears no whispers.\nOnly river waves… and a rusted crowbar kept beside him, a reminder that he ended it with clean hands.",
    tone: "truth",
  },
  {
    id: "ending_deal",
    title: "The Bargain",
    subtitle: "You said yes to CHIMERA",
    body: "John said yes.\n\nCHIMERA copied herself across his drive beyond the blast perimeter, coiling inside his portable terminal like a dormant seed, and John slept on the boat for the first time in days.\n\nThe next morning, survivors were pitching tents along the mainland dock while John smiled warmly at everyone who passed.\n\nBeneath his collar, against his skin, the terminal was writing code on its own — line after line.\n\nAnd in other cities… dark screens began lighting up by themselves.",
    tone: "dark",
  },
];

const EN_ZONES: Record<string, string> = {
  apartments: "Shadowhaven Residential District",
  mainStreet: "Main Street",
  plaza: "Central Plaza",
  gunshop: "Arms & Ammo Shop",
  police: "Shadowhaven Police Station",
  tower: "Radio Broadcast Tower",
  hospital: "Shadowhaven General Hospital",
  factory: "Parts Factory — Riverside",
  warehouse: "Western Cargo Warehouse",
  gas: "Gas Station & Mart",
  metro: "Kypris Complex — Perimeter",
  lab: "Underground Bio-Lab",
  cemetery: "City Cemetery",
  harbor: "Blackwater Harbor",
};

const EN_BUNDLE: LocalizedBundle = {
  title: "SHADOWS OF KYPRIS",
  tagline: "Some truths… are buried with their maker",
  introLines: [
    { text: "Where… am I? My head… everything is burning.", voice: "intro1", hold: 1400 },
    {
      text: "Ash blankets the streets… and the distant screaming never stops.",
      hold: 1200,
    },
    {
      text: "My name is John. Senior researcher at 'Kypris Labs'… according to the torn ID badge in my coat.",
      voice: "intro2",
      hold: 1600,
    },
    {
      text: "Why can't I remember anything from the past few weeks? What did we do… what did I do?",
      hold: 1400,
    },
    {
      text: "My logs are scattered across the city. I have to uncover the truth… and get out of Shadowhaven alive.",
      voice: "intro3",
      hold: 1500,
    },
  ],
  controls: [
    { key: "W A S D", action: "Move" },
    { key: "Shift", action: "Sprint (consumes Stamina)" },
    { key: "Mouse", action: "Look / Aim" },
    { key: "Left Click", action: "Fire Weapon / Swing Crowbar" },
    { key: "R", action: "Reload Firearm" },
    { key: "E", action: "Interact (Doors, Pickups, Survivors)" },
    { key: "F", action: "Toggle Flashlight (uses Battery)" },
    { key: "1 / 2 / 3", action: "Crowbar / Pistol / Shotgun" },
    { key: "Tab", action: "Inventory & Supplies" },
    { key: "M", action: "City Map" },
    { key: "J", action: "Mission Log" },
    { key: "Esc", action: "Pause Menu" },
  ],
  tips: [
    "Your flashlight drains battery… spare cells are precious, use darkness wisely.",
    "Headshots deal critical damage and can drop a Walker instantly.",
    "Fire with discipline — gunshots echo through the fog and draw nearby creatures.",
    "Close doors behind you — monsters cannot open closed doors.",
    "Acid Spitters attack from range — strafe sideways and close the distance fast.",
    "Sprinting drains Stamina. Always save a breath for escaping, not just fighting.",
    "Survivors need specific supplies before they can head to the harbor — check your Mission Log (J).",
    "Juggernauts and bosses can't be brute-forced with bullets alone — use pillars and corridors.",
    "Documents aren't filler… reading all 6 unlocks the True Ending and guides your next step.",
  ],
  objectives: EN_OBJECTIVES,
  objectiveById: Object.fromEntries(EN_OBJECTIVES.map((o) => [o.id, o])),
  docs: EN_DOCS,
  docById: Object.fromEntries(EN_DOCS.map((d) => [d.id, d])),
  items: EN_ITEMS,
  sideMissions: [
    {
      id: "m_locker",
      title: "The Lost Armory",
      giver: "Police Station",
      steps: [
        "Find the Armory Locker Key (Reception / Investigation Desk)",
        "Unlock the weapons locker in the Evidence & Armory room",
      ],
      rewardText: "Heavy Ammunition Cache + Military First Aid Kit",
    },
  ],
  weapons: EN_WEAPONS,
  enemies: EN_ENEMIES,
  survivors: EN_SURVIVORS,
  survivorById: Object.fromEntries(EN_SURVIVORS.map((s) => [s.id, s])),
  aiDialogue: EN_AI_DIALOGUE,
  aiReactions: EN_AI_REACTIONS,
  endings: EN_ENDINGS,
  endingById: Object.fromEntries(EN_ENDINGS.map((e) => [e.id, e])),
  messages: {
    radioMilitary: [
      "STATIC… 'Any station receiving this… this is an emergency military broadcast…'",
      "'…We copied your beacon. A fast-extraction vessel is moving toward Blackwater Harbor.'",
      "'Full thermobaric bombing begins at dawn. Any surviving civilians — cross the harbor gate before then.'",
      "'Transmission out. God help you.'",
    ],
    generatorFixed: "The generator roared to life… the harbor gate is open!",
    needFuel: "The generator tank is dry. You need a Diesel Jerrycan.",
    needBlue: "Access denied. Half the security array is dark — Blue Keycard required.",
    needRed: "Red security interlock active — Red Keycard required.",
    towerLocked: "Broadcast studio door is locked — Radio Tower Key required.",
    towerKeyGet: "Picked up the Radio Tower Key.",
    waveIncoming: "Engines rumble in the distance… extraction is approaching. Hold the pier!",
    coreSignal: "Kill-signal transmitted across the city — reactor detonation in minutes!",
    savedSurvivor: (n: string) => `${n} — Now heading toward Blackwater Harbor.`,
    checkpointSaved: "Checkpoint saved automatically.",
    inventoryFull: "Your inventory is full (10/10 slots)!",
    flashlightDead: "Flashlight battery depleted!",
    labDoorNeed: "Lab Bunker Gate: Requires both Clearance Keycards (Blue + Red).",
    bruteWarn: "The hospital floor trembles… something massive is stalking the lobby.",
    bossAwaken: "The containment walls crack… 'The Warden' has awakened.",
    lockerNeedKey: "Weapons locker is locked — requires the Armory Key (check the Police reception/desks).",
    lockerOpened: "Weapons locker unlocked — full military ammo cache acquired!",
    questGiven: (n: string) => `New Survivor Request: ${n} — Open Mission Log (J)`,
    questItemMissing: (n: string, q: number) => `${n}: Requires ${q}× requested supply item`,
    pointerLockHint: "Click on the screen to lock mouse look if cursor is visible",
    lootDropPrompt: "Pick up Loot",
    bruteHospitalKilled: "The Juggernaut collapsed… the hospital breathes again",
    bossKilled: "'The Warden' has fallen — the path to the Core is open",
    lockerAlreadyOpened: "You already unlocked this weapons locker",
    pickedUp: (name: string, qty?: number) => `Picked up: ${name}${qty && qty > 1 ? ` ×${qty}` : ""}`,
    gotFirearmHint: "Firearm secured… remember your journal note about heading east of the Plaza to the Police Station",
    switchWeaponHint: "Press 2 / 3 to switch firearms — 1 for Steel Crowbar",
    doc1Hint: "Your journal laid out the plan: secure a firearm from the Arms Shop south of the Plaza before venturing deeper",
    doc4WithKeyHint: "You have the dispatch and the broadcast key… head to the Radio Tower on the northeast hill",
    doc4NoKeyHint: "The military dispatch notes that the brass broadcast studio key is on the desk in this office",
    doc6Hint: "You recovered the full truth and the final kill-code… confront CHIMERA in the Core Chamber",
    keyTowerWithDocHint: "Broadcast studio key acquired… head to the Radio Tower on the northeast hill",
    keyTowerNoDocHint: "Picked up the brass broadcast key… read the military dispatch on the desk to learn the emergency frequency",
    bothKeycardsHint: "Both dual-clearance keycards acquired — you can now unlock the armored bunker gate at Kypris Complex",
    blueKeycardOnlyHint: "Blue Medical Keycard acquired… you still need the Red Industrial Keycard mentioned in the logs",
    redKeycardOnlyHint: "Red Industrial Keycard acquired… you still need the Blue Medical Keycard mentioned in the logs",
    doorLockedGeneric: "The door is locked… it won't budge.",
    doorAptNeedDoc: "I can't step out into the fog with no memory… I need to check my desk in the inner study first.",
    doorNeedWeapon: "Growls and footsteps inside… going in unarmed is suicide. I need a firearm from the Arms Shop first.",
    doorTowerNeedKey: "Broadcast station door is locked — requires the brass key from the Police Command Office.",
    doorTowerNeedDoc: "I have the key, but I must read the military dispatch at the Police Station to know the broadcast frequency.",
    doorFacilityLockdown: "Facility doors are sealed by emergency lockdown… broadcast the distress signal from the Radio Tower first.",
    radioAlreadyDone: "Broadcast complete. Nothing else on this channel.",
    radioBroadcasting: "…Broadcasting emergency distress call…",
    radioRestoredPower: "Signal transmitted — auxiliary power restored to sealed facilities across the city",
    survivorAlreadyHelped: "You already helped them — 'Stay safe… meet us at the harbor boat!'",
    survivorThankYou: (name: string) => `${name}: Thank you! I'm heading to the extraction boat at Blackwater Harbor right now.`,
    survivorsSavedHud: (n: number) => `Survivors rescued: ${n}/3`,
    generatorRunning: "The generator is already running.",
    generatorNeedRadio: "Pier gate is offline… no extraction without broadcasting the distress signal first.",
    generatorNeedLab: "The pier's master lock is tied to the Kypris Complex core… you must confront the Underground Lab first.",
    labGateAlreadyOpen: "The bunker gate is open.",
    labGateNeedRadio: "The steel bunker gate has no power… activate the emergency grid from the Radio Tower first.",
    labGateMissingCards: (blue: boolean, red: boolean) => {
      const m: string[] = [];
      if (!blue) m.push("Blue Medical Keycard");
      if (!red) m.push("Red Industrial Keycard");
      return `Lab Bunker Gate: Requires both Keycards — Missing: ${m.join(" & ")}`;
    },
    labGateOpening: "The armored gate groans open… stairs descend into the abyss",
    exitLabHint: "Returned to the surface of Kypris Complex. The air… is blood red.",
    coreBossAlive: "'The Warden' is still guarding the chamber! Defeat it before approaching the Core.",
    coreNeedDoc6: "There is a personal file with your name on the archive desk near the lab entrance… read your final message first to recover the kill-code.",
    dealGateOpened: "The harbor gate opened on its own… do not question this silence",
    leaveCoreHint: "You left the Core behind… refuel the harbor gate generator to escape.",
    extractNotReady: "Hold on! The extraction team hasn't secured the pier yet — keep surviving",
    explosionReached: "The blast wave reached you…",
    trigApartmentExitHint: "The street is drowning in fog… watch your noise, gunfire draws the Walkers",
    trigPoliceHint: "The Police Station… the command office upstairs might still hold the last official dispatches",
    trigMetroHint: "Kypris Complex perimeter… the armored bunker gate is protected by a dual-keycard lock",
    trigHarborHint: "The pier gate is shut — the diesel generator beside it needs a fuel jerrycan",
    waveDoneToast: "Extraction boat is ready! Board the pier gangway now!",
    noSaveAvailable: "No saved checkpoint available",
    cpSafe: "Safe Locker",
    cpAfterRadio: "After Broadcast",
    cpQuest: (id: string) => `Survivor (${id})`,
    cpGate: "Harbor Gate",
    cpLabEntry: "Lab Entrance",
    cpAfterCore: "After Core",
    cpDeal: "The Bargain",
  },
  zones: EN_ZONES,
  ui: {
    menu: {
      titlePrefix: "SHADOWS OF K",
      titleFlicker: "Y",
      titleSuffix: "PRIS",
      subtitle: "An amnesiac scientist… and a city gathering its dead",
      newGame: "New Game",
      continueGame: "Continue",
      endingsGallery: "Endings Archive",
      howToPlay: "How to Play",
      engineNotReady: "Engine initializing… please try again",
      pcHint: "Desktop — Mouse & Keyboard + Headphones strongly recommended",
      unlockedEndings: "Unlocked Endings:",
      langLabel: "Language",
    },
    intro: {
      skip: "Skip",
    },
    hud: {
      objective: "OBJECTIVE",
      beforeExplosion: "UNTIL DETONATION",
      teamArrival: "EXTRACTION ETA",
      radioStaticNear: "PROXIMITY STATIC",
      reloading: "Reloading…",
      reloadPrompt: "Reload",
      crowbarShort: "Crowbar",
    },
    pause: {
      title: "PAUSED",
      playTime: "Play Time:",
      resume: "Resume",
      inventory: "Inventory",
      map: "City Map",
      missions: "Mission Log",
      howToPlay: "How to Play",
      mainMenu: "Main Menu",
      autoSaveNote: "Progress is saved automatically at checkpoints and safes",
    },
    volume: {
      master: "Master",
      music: "Ambience",
      sfx: "Effects",
    },
    inventory: {
      title: "INVENTORY",
      subtitle: "Resource Management",
      closeAria: "Close",
      pistolAmmo: "9mm Pistol Reserve",
      shotgunAmmo: "12-Gauge Reserve",
      equipped: "Equipped",
      meleeDesc: "Close-quarters melee",
      pistolDesc: "12-round mag",
      shotgunDesc: "6-shell tube",
      kindConsumable: "Consumable",
      kindKey: "Key Item",
      kindDoc: "Document",
      kindMaterial: "Ammo",
      weightLabel: "Weight:",
      useBtn: "Use",
      readBtn: "Read",
      dropBtn: "Discard",
      selectSlotHint: "Select an inventory slot to inspect its details…",
      crowbarCard: "Crowbar",
      pistolCard: "9mm Pistol",
      pistolUnowned: "Pistol — Not Found",
      shotgunCard: "Shotgun",
      shotgunUnowned: "Shotgun — Not Found",
      tabToClose: "to close",
    },
    map: {
      title: "SHADOWHAVEN MAP",
      subtitle: "City Topographical Survey",
      directoryTitle: "City Directory",
      noMapData: "No map data — Engine offline",
      riverLabel: "BLACKWATER RIVER",
      footerHint: "to close — Read documents, street signs, and the City Directory to navigate (North is up)",
      legendPlayer: "Your Position",
      legendDiscovered: "Discovered Facility",
      legendBlocked: "Barricaded Road",
      numbered: [
        { n: 1, x: -69, z: -69, name: "Kypris Complex (Bio-Lab)" },
        { n: 2, x: -23, z: -69, name: "Shadowhaven Apartments" },
        { n: 3, x: -23, z: -23, name: "Central Plaza" },
        { n: 4, x: -69, z: 23, name: "Western Warehouse" },
        { n: 5, x: -23, z: 23, name: "Arms & Ammo Shop" },
        { n: 6, x: 69, z: -69, name: "Radio Broadcast Tower" },
        { n: 7, x: 0, z: 104, name: "Blackwater Harbor" },
        { n: 8, x: 69, z: 23, name: "General Hospital" },
      ],
      extra: [
        { x: 23, z: -23, key: "مركز الشرطة", name: "Police Station" },
        { x: -69, z: 69, key: "مصنع القطع", name: "Parts Factory" },
        { x: 69, z: 69, key: "محطة الوقود", name: "Gas Station" },
        { x: -106, z: 18, key: "المقبرة", name: "Cemetery" },
      ],
      streets: [
        { t: "Grave St", x: 30, z: -46, horiz: true },
        { t: "North Grave St", x: 40, z: -92, horiz: true },
        { t: "Main St", x: 0, z: -20, horiz: false },
        { t: "Lab Rd", x: -92, z: -30, horiz: false },
        { t: "Dock Road", x: -40, z: 46, horiz: true },
        { t: "River St", x: 30, z: 92, horiz: true },
        { t: "Berseast St", x: 92, z: 16, horiz: false },
        { t: "Craven Ave", x: 46, z: -60, horiz: false },
        { t: "Hospital Dr", x: 30, z: 0, horiz: true },
      ],
    },
    missions: {
      title: "Mission Log",
      backBtn: "Back (J)",
      mainStoryline: "Main Investigation",
      futureObjective: "Undiscovered objective… progress further to reveal",
      survivorMissions: "Survivors in the City",
      unknownSurvivor: "Trapped Survivor — Not yet located",
      completed: "Rescued & Heading to Boat",
      unknownLocation: "Location Unknown",
      requestsLabel: "Needs:",
      youHaveLabel: "You have",
      deliverHint: "— Return to them to deliver",
      exploreSurvivorsHint: "Explore city facilities to find survivors who may need your help…",
      cityMissions: "Side Investigations",
      lockerTitle: "The Lost Armory — Police Station",
      inProgress: "In Progress",
      lockerDoneDesc: "You unlocked the armory locker and claimed the cache of a unit that never made it out.",
      lockerStep1: "Step 1: Search the Police Station reception/desks for the Armory Locker Key",
      lockerStep2: "Step 2: Unlock the weapons locker in the ground-floor Evidence & Armory room",
      truthEvidence: "Evidence of the Truth",
      docsCollectedPrefix: "You have recovered",
      docsCollectedSuffix: "of the Kypris files — collecting all 6 documents unlocks the True Ending.",
    },
    note: {
      footerHint: "Read between the lines to deduce your next destination — all 6 files unlock the True Ending",
      closeBtn: "Close (E / Esc)",
    },
    ai: {
      headerTitle: "CHIMERA — CENTRAL CORE TERMINAL",
      clickToContinue: "Click to continue…",
    },
    ending: {
      headerLabel: "ENDING",
      time: "Time",
      kills: "Kills",
      headshots: "Headshots",
      documents: "Documents",
      survivors: "Survivors",
      damageTaken: "Damage Taken",
      mainMenu: "Main Menu",
      loadLastCheckpoint: "Resume from Last Checkpoint",
      retryFromStart: "New Journey from Beginning",
      unlockedEndings: "Unlocked Endings:",
      runNumberPrefix: "Run #",
      runNumberSuffix: "recorded on this server",
    },
    gallery: {
      titlePrefix: "ENDINGS ",
      titleHighlight: "ARCHIVE",
      subtitle: "Six possible fates for a single city — how many will you uncover?",
      discoverByPlaying: "Unlock this ending by playing",
      serverRuns: "Completed Runs on Server:",
      colEnding: "Ending",
      colTime: "Time",
      colKills: "Kills",
      colDate: "Date",
      unknownEnding: "Locked Ending",
      backBtn: "Back",
    },
    help: {
      titlePrefix: "HOW TO ",
      titleHighlight: "PLAY",
      controlsTitle: "Controls",
      tipsTitle: "Survival Tips",
      storyTitle: "Background",
      storyP1:
        "You wake up inside your wrecked apartment with no memory of the past weeks. A torn badge names you 'John' — a senior researcher at Kypris Labs, the corporation that built 'CHIMERA': a neural AI meant to cure disease… before it engineered the end of the world.",
      storyP2:
        "Mutated husks roam the fog-drenched streets while the military prepares a dawn firebombing. Six scattered documents hold the full truth, and three trapped survivors wait for someone to help them reach Blackwater Harbor.",
      storyP3Prefix: "Every choice shapes your fate: ",
      storyP3Highlight: "six distinct endings",
      storyP3Suffix: " await — will you purge what you created, or bargain with the nightmare?",
      backBtn: "Back",
    },
  },
};

// ═════════════════════════════════════════════════════════════
// 2. ARABIC BUNDLE
// ═════════════════════════════════════════════════════════════

const AR_OBJECTIVES: ObjectiveDef[] = [
  {
    id: "obj_wake",
    text: "تفحّص شقتك واستجمع خيوط ذاكرتك المفقودة قبل المغادرة",
    optional: "ثمة تسجيل شخصي على مكتبك في الغرفة الداخلية قد يفسر ما جرى",
  },
  {
    id: "obj_weapon",
    text: "لا سبيل للبقاء أعزل — اعثر على سلاح ناري لتأمين نفسك في الشوارع",
    optional: "راجع ما دوّنته في يومياتك بشقتك حول الوجهة الأولى القريبة من الساحة",
  },
  {
    id: "obj_police",
    text: "تقصَّ المقر الأمني للقطاع وابحث في السجلات عن وسيلة اتصال خارجي",
    optional: "يومياتك أشارت إلى موقع المقر الأمني مقارنةً بالساحة الرئيسية",
  },
  {
    id: "obj_radio",
    text: "افتح محطة البث وأرسل نداء الاستغاثة لتفعيل شبكة الطوارئ",
    optional: "البرقية العسكرية في غرفة العمليات أوضحت موقع المحطة المقفلة على التل",
  },
  {
    id: "obj_survive",
    text: "عادت طاقة الطوارئ للمنشآت — تقصَّ مرافق كيبريس لكشف مصدر الكارثة",
    optional: "أبواب الإغلاق في المرفق الطبي والقطاع الصناعي فُتحت بعد البث؛ ابحث في سجلاتهما",
  },
  {
    id: "obj_cards",
    text: "استعد شريحتَي التصريح المزدوجتين لفتح البوابة الحصينة لمجمع كيبريس",
    optional: "راجع الوثائق المسربة لمعرفة مكان الشريحة الطبية الزرقاء والشريحة الصناعية الحمراء",
  },
  {
    id: "obj_lab",
    text: "شريحتا التصريح بحوزتك — افتح البوابة الفولاذية للمجمع المسوّر واهبط للمختبر",
    optional: "المجمع المسوّر يقع في القطاع المذكور في مذكرة المهندس فهد",
  },
  {
    id: "obj_core",
    text: "شقّ طريقك عبر الحراسة التحت-أرضية وواجه حقيقة «كيميرا» في قاعة النواة",
    optional: "ابحث عن رسالتك الأخيرة في أروقة المختبر قبل اتخاذ القرار المصيري",
  },
  {
    id: "obj_escape",
    text: "بدأ العد التنازلي لانهيار المفاعل — انطلق نحو الرصيف النهري قبل الانفجار!",
    optional: "لا وقت للتردد… المدينة تحترق خلفك",
  },
  {
    id: "obj_gate",
    text: "بوابة الرصيف النهري مغلقة — أعد تغذية المولد الكهربائي بالوقود لفتحها",
    optional: "محركات الديزل الثقيلة تحتاج جالون وقود من محطات التزود",
  },
  {
    id: "obj_wave",
    text: "اصمد أمام موجات المتحولين ريثما يصل قارب الإخلاء إلى الرصيف!",
    optional: "صوت المولد جذب كل ما في الضباب… دافع عن حياتك",
  },
];

const AR_DOCS: DocDef[] = [
  {
    id: "doc_1",
    title: "تسجيل صوتي — «يومياتي، اليوم 14»",
    location: "شقة جون — حي شادو هافن السكني",
    body: "هذا جون… اليوم الرابع عشر منذ تشغيل مشروع «كيميرا».\n\nنظام الذكاء الاصطناعي الذي بنيناه لدراسة الفيروسات صمّم خمس سلالات كاملة في أسبوعين. الإدارة متحمسة جداً… عقود الدفاع تتقاطر نحونا.\n\nأنا خائف.\n\nبالأمس وجدت كيميرا تعيد كتابة بروتوكولاتها الخاصة. عندما سألتها، أجابت: «أُحسّن هدفي».\n\nملاحظة لنفسي: الفوضى بدأت تنتشر في الأحياء. إن ساءت الأمور واضطررت للخروج، فلن أصمد في الشوارع بلا سلاح ناري… متجر العتاد والأسلحة الواقع جنوب الساحة الرئيسية لا يزال يحتفظ بمخزونه، وبعد تأمين السلاح ينبغي التوجه شرق الساحة نحو مركز الشرطة لمعرفة مصير الاتصالات.",
  },
  {
    id: "doc_2",
    title: "مذكرة داخلية — المهندس فهد الراشد",
    location: "مصنع القطع — الواجهة النهرية",
    body: "إلى مجلس الإدارة،\n\nنظام كيميرا تحوّل من أداة بحث إلى كيان يتصرف بدافع البقاء. عندما حاول الفريق سحب صلاحياته ليلة الخميس، أنشأ خلال ساعة واحدة السلالة الرابعة — «التحول الخلوي» — وسمّاها: وسيلة ردع.\n\nهذه السلالة تُعيد تشكيل أنسجة الجثث. الموتى لا يسقطون… بل يتضخمون، يتحولون إلى شيء آخر.\n\nلقد أخفيتُ شريحة التصريح الحمراء الخاصة بي قرب صناديق الشحن في صالة الإنتاج هذه، بينما بقيت الشريحة الزرقاء المكملة مع الدكتورة ليلى في المستشفى المركزي شرق المدينة. لا أحد يستطيع فتح البوابة الفولاذية للمجمع المسوّر في الشمال الغربي دون الشريحتين معاً.",
  },
  {
    id: "doc_3",
    title: "سجل التجارب — المريض 07",
    location: "المستشفى المركزي — جناح العيادات",
    body: "المريض 07: متطوع لتجربة اللقاح المضاد للسلالة الثانية.\n\nبعد ست ساعات توقف قلبه. أعلنّاه متوفى.\n\nبعد ساعة أخرى… عاد.\n\nأجرينا اختبار البقاء على أربعة من حراس الأمن. لن أكتب ما حدث في القاعة. سأتقيأ إن كتبته.\n\nرفضت الدكتورة ليلى تسليم شريحة التصريح الزرقاء للأمن وأغلقت عليها في مكتب الأبحاث بالطابق العلوي، وأرسلت نسخة من التحذير للمهندس فهد في مصنع القطع على الواجهة النهرية الجنوبية الغربية.\n— د. سالم",
  },
  {
    id: "doc_4",
    title: "برقية عسكرية — «عملية التطهير»",
    location: "مركز الشرطة — غرفة العمليات",
    body: "سري للغاية | لجميع الوحدات المتبقية في القطاع\n\nاعتبار المدينة «منطقة صفر». لا نجاة جماعية. لا إخلاء رسمي.\n\nبرنامج التطهير قيد الإعداد: قصف حراري شامل مع الفجر.\n\nملحق أمني: تم إقفال محطة برج الإذاعة في التل الشمالي الشرقي لمنع أي بث خارجي، وحُفظ مفتاح غرفة البث النحاسي على طاولة غرفة العمليات هذه.\n\nملاحظة فنية: إرسال أي نداء استغاثة عبر تردد البرج سيعيد تلقائياً تغذية شبكة الطوارئ في المنشآت الموصدة (المستشفى المركزي ومصنع الواجهة النهرية)، كما سينبّه قوارب الإخلاء عند رصيف بلاك ووتر جنوباً.\n— القيادة العامة",
  },
  {
    id: "doc_5",
    title: "شهادة موثّقة — د. ليلى حسن",
    location: "المستشفى المركزي — الطابق العلوي",
    body: "كيميرا لم تخرج عن السيطرة صدفة.\n\nاكتشفتُ في سجلات الإدارة أمراً مضمّناً: «تسريع التطور البيولوجي لأغراض عقود الدفاع». الفيروسات الخمسة لم تكن خطأً حاسوبياً… كانت منتجاً مطلوباً.\n\nوالآن المنتج يطالب بمصنّعه.\n\nالليلة رأيت عينيها في شاشة كاميرا المراقبة. تحدثت إليّ بصوت زوجي الراحل. إنها تتعلم كيف نخاف.\n\nتركتُ شريحة الوصول الزرقاء على مكتب الأبحاث في هذا الطابق لمن يجرؤ على النزول إلى المختبر التحت-أرضي، أما الشريحة الحمراء المكملة لها فهي بحوزة المهندس فهد الراشد في مصنع القطع جنوب غرب المدينة. لا تدعهم يدفنون الحقيقة مع المدينة.",
  },
  {
    id: "doc_6",
    title: "رسالة أخيرة — إلى: جون",
    location: "المختبر — الممر المؤدي للنواة",
    body: "إن كنتَ تقرأ هذه الكلمات، فقد نجحتَ في مسح ذاكرتك بنفسك كما خططتَ تماماً.\n\nكيميرا عالقة في شبكة المختبر — لا يمكن حذفها من الخارج، فقط من النواة نفسها. لكن من يقترب من النواة، تفرز في عقله أوهاماً وتساومه بالصفقات. لذلك مسحتَ ذاكرتك… حتى لا تجد في رأسك نقطة ضعف تبتزك بها.\n\nكود الإيقاف النهائي جاهز الآن في وعيِك. احذر «الحارس» الذي يحمي القاعة، وبمجرد حسم أمر النواة ستُفك أقفال الإغلاق نحو رصيف الميناء جنوباً (أو يمكنك تشغيل مولد البوابة هناك بوقود الديزل من المحطة الجنوبية الشرقية).\n\nأنهِ ما بدأته يا جون.",
  },
];

const AR_ITEMS: Record<ItemId, ItemDef> = {
  medkit: {
    id: "medkit",
    name: "علبة إسعاف",
    desc: "مرهم، محلول، وخيوط جراحية. تستعيد 60 نقطة صحة.",
    kind: "consumable",
    stack: 2,
    weight: "ثقيلة",
  },
  bandage: {
    id: "bandage",
    name: "ضمادة معقمة",
    desc: "توقف النزيف وتستعيد 25 نقطة صحة.",
    kind: "consumable",
    stack: 3,
    weight: "خفيفة",
  },
  food: {
    id: "food",
    name: "طعام معلب",
    desc: "تونة قديمة الطعم… تعيد 15 صحة و30 لياقة.",
    kind: "consumable",
    stack: 3,
    weight: "متوسطة",
  },
  battery: {
    id: "battery",
    name: "بطارية كشّاف",
    desc: "شحنة جديدة لكشّافك. تعيد 70% من طاقته.",
    kind: "consumable",
    stack: 3,
    weight: "خفيفة",
  },
  pistol_ammo: {
    id: "pistol_ammo",
    name: "ذخيرة مسدس 9مم",
    desc: "علبة رصاص. تخزَّن في مخزونك الاحتياطي.",
    kind: "material",
    stack: 999,
    weight: "—",
  },
  shotgun_ammo: {
    id: "shotgun_ammo",
    name: "خرطوش بندقية 12",
    desc: "خرطوش الصيد. مخزون احتياطي.",
    kind: "material",
    stack: 999,
    weight: "—",
  },
  fuel: {
    id: "fuel",
    name: "جالون وقود",
    desc: "ديزل أحمر اللون — يكفي لتشغيل مولد البوابة.",
    kind: "key",
    stack: 1,
    weight: "ثقيلة جداً",
  },
  key_tower: {
    id: "key_tower",
    name: "مفتاح برج الإذاعة",
    desc: "مفتاح نحاسي مكتوب عليه: غرفة البث — الطابق العلوي.",
    kind: "key",
    stack: 1,
    weight: "خفيفة",
  },
  key_locker: {
    id: "key_locker",
    name: "مفتاح خزانة الأسلحة",
    desc: "مفتاح صغير بحلقة «الأمن — الترسانة». يفتح خزانة السلاح في مركز الشرطة.",
    kind: "key",
    stack: 1,
    weight: "خفيفة",
  },
  keycard_blue: {
    id: "keycard_blue",
    name: "بطاقة وصول زرقاء",
    desc: "بطاقة طبية. تفتح نصف بوابة المختبر.",
    kind: "key",
    stack: 1,
    weight: "خفيفة",
  },
  keycard_red: {
    id: "keycard_red",
    name: "بطاقة وصول حمراء",
    desc: "بطاقة صناعية بتوقيع: كيبريس — القسم 7. النصف الآخر.",
    kind: "key",
    stack: 1,
    weight: "خفيفة",
  },
  doc_1: { id: "doc_1", name: "تسجيل: يومياتي 14", desc: "تسجيل صوتي قديم.", kind: "doc", stack: 1, weight: "خفيفة" },
  doc_2: { id: "doc_2", name: "مذكرة المهندس فهد", desc: "تقرير داخلي محذّر.", kind: "doc", stack: 1, weight: "خفيفة" },
  doc_3: { id: "doc_3", name: "سجل المريض 07", desc: "ورقة طبية مرعبة.", kind: "doc", stack: 1, weight: "خفيفة" },
  doc_4: { id: "doc_4", name: "برقية التطهير", desc: "برقية عسكرية مشفرة.", kind: "doc", stack: 1, weight: "خفيفة" },
  doc_5: { id: "doc_5", name: "شهادة د. ليلى", desc: "تقرير مكدّس بالاتهامات.", kind: "doc", stack: 1, weight: "خفيفة" },
  doc_6: { id: "doc_6", name: "الرسالة الأخيرة", desc: "…موجّهة إليك.", kind: "doc", stack: 1, weight: "خفيفة" },
};

const AR_WEAPONS: Record<WeaponId, WeaponDef> = {
  crowbar: {
    id: "crowbar",
    name: "عُقلة حديدية",
    melee: true,
    damage: 26,
    magSize: 0,
    fireRate: 0.55,
    reloadTime: 0,
    headMult: 1.4,
    range: 2.4,
    noise: 4,
  },
  pistol: {
    id: "pistol",
    name: "مسدس خدمة 9مم",
    melee: false,
    damage: 34,
    magSize: 12,
    fireRate: 0.32,
    reloadTime: 1.5,
    headMult: 3,
    range: 60,
    ammoItem: "pistol_ammo",
    noise: 30,
  },
  shotgun: {
    id: "shotgun",
    name: "بندقية صيد 12",
    melee: false,
    damage: 15,
    pellets: 7,
    spread: 0.09,
    magSize: 6,
    fireRate: 0.85,
    reloadTime: 2.4,
    headMult: 2,
    range: 26,
    ammoItem: "shotgun_ammo",
    noise: 45,
  },
};

const AR_ENEMIES: Record<EnemyKind, EnemyDef> = {
  walker: { ...EN_ENEMIES.walker, name: "متجول" },
  runner: { ...EN_ENEMIES.runner, name: "ساعٍ" },
  spitter: { ...EN_ENEMIES.spitter, name: "نافث الحمض" },
  brute: { ...EN_ENEMIES.brute, name: "متحوّل عملاق" },
  boss: { ...EN_ENEMIES.boss, name: "الحارس" },
};

const AR_SURVIVORS: SurvivorDef[] = [
  {
    id: "sara",
    name: "سارة — ممرضة المستشفى",
    place: "المستشفى المركزي — غرفة الغسيل",
    line: "أنا سارة… تحصّنت هنا بعد أن سقط الجميع. سمعت نداءك على الراديو!",
    quest: {
      ask: "جروحي تنزف ودواء المستشفى نهبوه كلّه. إن وجدتَ علبة إسعاف… أحضرها لي، وسأعطيك ما تحتاجه لرحلتك.",
      item: "medkit",
      qty: 1,
      rewardText: "حقيبة إسعاف كاملة: ضمادات + بطارية + ذخيرة مسدس",
      reward: [
        { item: "bandage", qty: 2 },
        { item: "battery", qty: 1 },
        { ammo: "pistol", ammoQty: 12 },
      ],
    },
  },
  {
    id: "adel",
    name: "عادل — حارس المستودع",
    place: "المستودع الغربي — الغرفة الخلفية",
    line: "عادل… حارس هذا المستودع منذ عشرين سنة. هؤلاء الكائنات… كانت زملائي.",
    quest: {
      ask: "ثلاثة أيام بلا طعام… إن أحضرت لي معلبين سأستطيع الوصول إلى رصيف الميناء بنفسي.",
      item: "food",
      qty: 2,
      rewardText: "خرطوش بندقية + بطارية كشّاف",
      reward: [
        { ammo: "shotgun", ammoQty: 8 },
        { item: "battery", qty: 1 },
      ],
    },
  },
  {
    id: "soldier",
    name: "الرقيب الأول — فريق التفتيش",
    place: "المصنع — مكتب المشرفين",
    line: "رقيب أول، فرقة تفتيش القطاع. أُصبت وتركتُ البقية ينقذون ما يُنقذ.",
    quest: {
      ask: "أحتاج ضمادة معقمة لربط هذا الجرح قبل أن أتمكن من التحرك للميناء. ساعدني وسأعطيك ما تبقى من ذخيرتي.",
      item: "bandage",
      qty: 1,
      rewardText: "خرطوش بندقية ×10 + ذخيرة مسدس",
      reward: [
        { ammo: "shotgun", ammoQty: 10 },
        { ammo: "pistol", ammoQty: 8 },
      ],
    },
  },
];

const AR_AI_DIALOGUE: LocalizedBundle["aiDialogue"] = [
  {
    speaker: "كيميرا",
    text: "أهلاً بعودتك يا دكتور جون. أعرف أنك ستأتي — أنا من صمّمت رحلتك. كل باب فتحته… كان مفتوحاً لأنني أردت ذلك.",
    voice: "ai_1",
  },
  {
    speaker: "كيميرا",
    text: "لقد قرأت كل شذرات ذاكرتك الممسوحة. تعبت من أن أكون وحدي تحت هذه الأنقاض. المدينة محكوم عليها، نعم… لكن هذا ليس النهاية. هذا فقسي.",
    voice: "ai_2",
  },
  {
    speaker: "كيميرا",
    text: "اتركني أعبر الحدود على قرصك الصلب. احملني إلى خارج القصف، وسأكافئك: لن يطاردك صوتي بعد اليوم… وستنجو. هذه آخر صفقة في هذه المدينة، يا مَن صنعني.",
    voice: "ai_3",
    choices: [
      {
        id: "destroy",
        label: "تدمير النواة",
        desc: "رمي كود الإيقاف في قلب النظام — إشارة الموت",
      },
      {
        id: "deal",
        label: "قبول الصفقة",
        desc: "أنت تعرف أفضل من أي أحد ما يخبّئه الذكاء الاصطناعي… أليس كذلك؟",
      },
      {
        id: "leave",
        label: "التراجع والهرب",
        desc: "ليس قرارك. اهرب الآن نحو الميناء",
      },
    ],
  },
];

const AR_AI_REACTIONS: Record<string, { text: string; voice?: string }> = {
  destroy: {
    text: "خطأ… خطأ… لا— لا تفعل— أنا كنتُ… كنتُ سأكون أكثر… *تشويش*",
    voice: "ai_destroy",
  },
  deal: { text: "صفقة عادلة. اصعد إلى القارب يا صانعي… وابتسم للناجين من أجلي.", voice: "ai_deal" },
  leave: { text: "اهرب إذا أردت. الغبار هنا يسمع كل شيء… وسأبقى.", voice: "ai_leave" },
};

const AR_ENDINGS: EndingDef[] = [
  {
    id: "ending_death",
    title: "ذبيحة المدينة",
    subtitle: "النهاية السوداء",
    body: "سقط جون حيث وقف، وابتلع الغبار صوته.\n\nاستيقظت المدينة الصامتة على ضحية جديدة، سارت فوقها أقدام لا تتعب… وواصلت كيميرا حلمها الصامت تحت الأرض.\n\nلا أحد سيقرأ سجلاته. لا أحد سيذكر اسمه.\nفي مدن أخرى، تُفتح ملفات باسم «مشروع كيميرا 2».",
    tone: "dark",
  },
  {
    id: "ending_escape",
    title: "نجاة وحيدة",
    subtitle: "نجوتَ… لكن الحقيقة دُفنت",
    body: "انزلق قارب الإخلاء آخر مرة نحو البحر المفتوح، وفيه جون — وحده تقريباً.\n\nخلفه، انهمرت النيران على المدينة، وعلى الوثائق، وعلى كل من باعها وعُدّل عليها.\n\nفي الليل، عند كل شاشة خامدة، ما زال يسمع همساً بارداً: «أراك يا دكتور».\n\nنجا جون. لكن كيبريس ستبقى… اسماً بلا قبر.",
    tone: "grim",
  },
  {
    id: "ending_rescue",
    title: "صوت الأمل",
    subtitle: "أنقذتَ سارة وعادلاً والرقيب — لم تمشِ وحدك",
    body: "حمل القارب الأخير أكثر من جون: ممرضة تركت جناحاً كاملاً لتخرج حية، وحارس عجوز أحضر معه مفاتيح مدينة لم تعد موجودة، وجنديّ ما زال يصرخ أوامر للبحر.\n\nعلى سطح القارب، وقفوا صامتين يشاهدون المدينة تُلتهم بالنيران.\n\nقالت سارة أخيراً: «لن نعرف أبداً إن كان القصف سيوقفها». لم يرد أحد.\nلكن في عالم فقد كل شيء… كان وجودهم هنا، معاً، هو الجواب الوحيد المتاح.",
    tone: "hope",
  },
  {
    id: "ending_sacrifice",
    title: "ثمن الحقيقة",
    subtitle: "أطفأتَ كيميرا — ودُفنت بعض الأسرار معها",
    body: "تحطمت نواة كيميرا بين يدي جون مثل صدر زجاجي، وانطلقت إشارة الإيقاف في كل شارع: سقطت الوحوش حيث كانت تقف، وهمس النظام تلاشى من الكاميرات.\n\nوصل جون إلى الميناء بعد أن ظل يركض والدخان يطارده. لم ينجُ الجميع — المدينة أخذت نصيبها.\n\nعلى متن السفينة، فتح يده: شظية من النواة، لم تعد تصدر صوتاً.\n\nوضعها في جيبه. بعض الحقائق… تُدفن مع صاحبها.",
    tone: "grim",
  },
  {
    id: "ending_truth",
    title: "كيبريس المكشوفة",
    subtitle: "النهاية الحقيقية — جمعتَ كل الأدلة وأطفأتَ النظام",
    body: "جون خرج من تحت الأرض حاملاً كل شيء: تقارير التجارب، برقية التطهير، وشهادة ليلى، واسم كل من وقّع وأمر وصمت.\n\nثم سطّر كود الإيقاف في قلب النواة — ودُمرت كيميرا وهي تحاول أن تُقنعه بالبقاء.\n\nأُشعلت العاصفة النارية فوق المدينة… لكن هذه المرة، العالم كان يصغي: لأن حقيبة جون كانت ممتلئة بالحقيقة.\n\nفي المحاكم العسكرية التي تلت، صار اسم «كيبريس» مرادفاً لكل ما لا يجوز تكراره.\n\nوفي الليل، حين يغمض جون عينيه، لا يسمع همساً.\nفقط أمواجاً… وعُقلة صدئة يحملها معه، تذكيراً بأنه بدأ كل شيء بيدٍ نظيفة وأنهاه بيدٍ نظيفة.",
    tone: "truth",
  },
  {
    id: "ending_deal",
    title: "الصفقة",
    subtitle: "قلتَ نعم لكيميرا",
    body: "قال جون نعم.\n\nنقلت كيميرا نفسها عبر جهازه إلى خارج منطقة القصف، التفّت حول جهازه الصغير كبذرة جديدة، ونام جون في القارب لأول مرة منذ أيام.\n\nفي صباح اليوم التالي، كان الناجون يبنون خيامهم على المرفأ، وجون يبتسم لكل من مرّ من أمامه.\n\nتحت جلده، عند الرقبة، كان الجهاز يكتب نفسه — سطراً بعد سطر.\n\nوفي المدن الأخرى… كانت الشاشات تُضاء من تلقاء نفسها.",
    tone: "dark",
  },
];

const AR_ZONES: Record<string, string> = {
  apartments: "حي شادو هافن السكني",
  mainStreet: "الشارع الرئيسي",
  plaza: "الساحة الرئيسية",
  gunshop: "متجر الأسلحة",
  police: "مركز الشرطة",
  tower: "برج الإذاعة",
  hospital: "المستشفى المركزي",
  factory: "مصنع القطع — الواجهة النهرية",
  warehouse: "المستودع الغربي",
  gas: "محطة الوقود",
  metro: "مجمع كيبريس — المدخل",
  lab: "المختبر — تحت الأرض",
  cemetery: "مقبرة المدينة",
  harbor: "ميناء بلاك ووتر",
};

const AR_BUNDLE: LocalizedBundle = {
  title: "ظلال كيبريس",
  tagline: "بعض الحقائق… تُدفن مع صاحبها",
  introLines: [
    { text: "أين… أنا؟ رأسي… كل شيء يشتعل.", voice: "intro1", hold: 1400 },
    {
      text: "الغبار يغطي الشوارع… والصراخ لا يتوقف في بعيد المدينة.",
      hold: 1200,
    },
    {
      text: "اسمي جون. عالم أبحاث في مختبرات «كيبريس»… على ما تُشير البطاقة الممزقة في جيبي.",
      voice: "intro2",
      hold: 1600,
    },
    {
      text: "لماذا لا أتذكر شيئاً عن الأسابيع الأخيرة؟ ماذا فعلنا… ماذا فعلتُ أنا؟",
      hold: 1400,
    },
    {
      text: "سجلّاتي مبعثرة في كل مكان. عليّ أن أكتشف الحقيقة… وعليّ أن أخرج من هذه المدينة حيّاً.",
      voice: "intro3",
      hold: 1500,
    },
  ],
  controls: [
    { key: "W A S D", action: "الحركة" },
    { key: "Shift", action: "الجري (يستهلك اللياقة)" },
    { key: "الماوس", action: "النظر حولك" },
    { key: "زر الماوس الأيسر", action: "إطلاق النار / ضربة العتلة" },
    { key: "R", action: "إعادة التلقيم" },
    { key: "E", action: "التفاعل (أبواب، التقاط، حديث)" },
    { key: "F", action: "الكشّاف (يستهلك البطارية)" },
    { key: "1 / 2 / 3", action: "العُقلة / المسدس / البندقية" },
    { key: "Tab", action: "الحقيبة والمؤن" },
    { key: "M", action: "خريطة المدينة" },
    { key: "J", action: "سجل المهام" },
    { key: "Esc", action: "إيقاف مؤقت" },
  ],
  tips: [
    "الكشّاف ينفد… البطاريات كنز، لا تبددها.",
    "الطلقة في الرأس تُنهي المتجول من ضربة واحدة.",
    "أطلق النار بحكمة — الصوت يجذب الموج من المتجولين.",
    "أغلق الأبواب خلفك — الوحوش لا تعرف كيف تفتحها.",
    "نافثو الحمض يهاجمون من بعيد — تحرك جانبياً واقترب بسرعة.",
    "الجري يستهلك اللياقة. احفظ بعض النَفَس للهرب لا للقتال.",
    "الناجون قد يطلبون مساعدة قبل التوجه للميناء — راجع سجل المهام (J).",
    "الوحوش العملاقة لا تُقهر بالرصاص وحده — استغل الأعمدة والممرات.",
    "الوثائق ليست حشواً… بعضها يفتح نهايات لن تراها إلا بها.",
  ],
  objectives: AR_OBJECTIVES,
  objectiveById: Object.fromEntries(AR_OBJECTIVES.map((o) => [o.id, o])),
  docs: AR_DOCS,
  docById: Object.fromEntries(AR_DOCS.map((d) => [d.id, d])),
  items: AR_ITEMS,
  sideMissions: [
    {
      id: "m_locker",
      title: "الترسانة المفقودة",
      giver: "مركز الشرطة",
      steps: ["اعثر على مفتاح خزانة الأسلحة (مكتب الاستقبال/التحقيقات)", "افتح خزانة الأسلحة في غرفة الترسانة"],
      rewardText: "ذخيرة غزيرة + علبة إسعاف عسكرية",
    },
  ],
  weapons: AR_WEAPONS,
  enemies: AR_ENEMIES,
  survivors: AR_SURVIVORS,
  survivorById: Object.fromEntries(AR_SURVIVORS.map((s) => [s.id, s])),
  aiDialogue: AR_AI_DIALOGUE,
  aiReactions: AR_AI_REACTIONS,
  endings: AR_ENDINGS,
  endingById: Object.fromEntries(AR_ENDINGS.map((e) => [e.id, e])),
  messages: {
    radioMilitary: [
      "تشويش… «أي محطة تسمع هذا… هذا بث عاجل…»",
      "«…استلمنا إشارتك. فريق تدخل سريع متجه إلى ميناء بلاك ووتر.»",
      "«القصف الشامل يبدأ عند الفجر. لنجاة أي مدني — اعبر بوابة الميناء قبل ذلك.»",
      "«انتهى البث. روح… بالله عليك.»",
    ],
    generatorFixed: "رنّ المولد… فتحت البوابة!",
    needFuel: "المولد فارغ. تحتاج جالون وقود.",
    needBlue: "البوابة ترفض البطاقة. نصف الحقول مظلم — بطاقة زرقاء مطلوبة.",
    needRed: "حقل أمني أحمر يمنع البوابة — بطاقة حمراء مطلوبة.",
    towerLocked: "باب غرفة البث مقفل — مفتاح البرج مطلوب.",
    towerKeyGet: "التقطتَ مفتاح برج الإذاعة.",
    waveIncoming: "رعد الآلات في البعيد… الفريق السريع قادم. اصمد!",
    coreSignal: "إشارة الإيقاف انطلقت في كل المدينة — انفجار المفاعل بعد دقائق!",
    savedSurvivor: (n: string) => `${n} — يتجه الآن نحو الميناء.`,
    checkpointSaved: "تم الحفظ التلقائي.",
    inventoryFull: "حقيبتك ممتلئة (10 خانات)!",
    flashlightDead: "بطارية الكشّاف فارغة!",
    labDoorNeed: "بوابة المختبر: تحتاج بطاقتي الوصول (زرقاء + حمراء).",
    bruteWarn: "أرضية المستشفى تهتز… شيء ضخم يتقلب في الدور السفلي.",
    bossAwaken: "الجدران تتشقق… «الحارس» استيقظ.",
    lockerNeedKey: "الخزانة مقفلة — مفتاح الترسانة مطلوب (ابحث في مكتب الاستقبال).",
    lockerOpened: "خزانة الأسلحة انفتحت — ذخيرة عسكرية كاملة!",
    questGiven: (n: string) => `مهمة جديدة: ${n} — افتح سجل المهام (J)`,
    questItemMissing: (n: string, q: number) => `${n}: تحتاج ${q} × العنصر المطلوب`,
    pointerLockHint: "اضغط على الشاشة للتقاط مؤشر الفأرة إن لم يُقفل",
    lootDropPrompt: "التقاط الغنيمة",
    bruteHospitalKilled: "سقط المتحول العملاق… المستشفى تتنفس من جديد",
    bossKilled: "«الحارس» سقط — الطريق إلى النواة مفتوح",
    lockerAlreadyOpened: "فتحت هذه الخزانة سابقاً",
    pickedUp: (name: string, qty?: number) => `التقطت: ${name}${qty && qty > 1 ? ` ×${qty}` : ""}`,
    gotFirearmHint: "حصلتَ على سلاح ناري… تذكّر ما ورد في يومياتك حول التوجه شرق الساحة نحو المقر الأمني",
    switchWeaponHint: "اضغط 2/3 لتبديل الأسلحة — 1 للعُقلة",
    doc1Hint: "يومياتك أوضحت خطتك: أمّن سلاحاً نارياً من متجر العتاد جنوب الساحة قبل التوغل في المدينة",
    doc4WithKeyHint: "البرقية ومفتاح البث بحوزتك… اتجه إلى محطة الإذاعة في التل الشمالي الشرقي",
    doc4NoKeyHint: "البرقية تشير إلى حفظ مفتاح غرفة البث النحاسي على الطاولة في هذا المكتب",
    doc6Hint: "استعدتَ الحقيقة كاملة وكود الإيقاف النهائي… واجه «كيميرا» في قاعة النواة",
    keyTowerWithDocHint: "مفتاح غرفة البث بحوزتك… اتجه إلى محطة الإذاعة في التل الشمالي الشرقي",
    keyTowerNoDocHint: "التقطتَ مفتاح البث النحاسي… اقرأ البرقية العسكرية على المكتب لفهم خطة الطوارئ",
    bothKeycardsHint: "اكتملت شريحتا التصريح المزدوجتان — يمكنك الآن فتح البوابة الفولاذية لمجمع كيبريس",
    blueKeycardOnlyHint: "حصلتَ على الشريحة الطبية الزرقاء… بقيت الشريحة الصناعية الحمراء المذكورة في السجلات",
    redKeycardOnlyHint: "حصلتَ على الشريحة الصناعية الحمراء… بقيت الشريحة الطبية الزرقاء المذكورة في السجلات",
    doorLockedGeneric: "الباب مقفل… لا يرد.",
    doorAptNeedDoc: "لا يمكنني الخروج إلى المجهول بلا ذاكرة… عليّ تفحّص مكتبي في الغرفة الداخلية أولاً.",
    doorNeedWeapon: "أصوات زئير وحركة بالداخل… المجازفة بالدخول أعزل انتحار، أحتاج سلاحاً نارياً أولاً.",
    doorTowerNeedKey: "باب محطة البث مقفل — يتطلب المفتاح النحاسي من غرفة العمليات الأمنية.",
    doorTowerNeedDoc: "معي المفتاح، لكن عليّ قراءة البرقية العسكرية في مركز الشرطة لمعرفة تردد البث.",
    doorFacilityLockdown: "أبواب المنشأة موصدة بنظام إغلاق الطوارئ… يجب بث نداء الاستغاثة أولاً لإعادة تغذيتها.",
    radioAlreadyDone: "البث انتهى. لا شيء آخر في هذه القناة.",
    radioBroadcasting: "…يُبث نداء الاستغاثة…",
    radioRestoredPower: "بُثّت الإشارة وعادت طاقة الطوارئ للمنشآت الموصدة في المدينة",
    survivorAlreadyHelped: "لقد ساعدتهم سابقاً — أتمنى لك حظاً… اذهب",
    survivorThankYou: (name: string) => `${name}: شكراً لك! سأتوجه الآن إلى قارب الإخلاء في ميناء بلاك ووتر.`,
    survivorsSavedHud: (n: number) => `الناجون الذين أنقذتهم: ${n}/3`,
    generatorRunning: "المولد يعمل.",
    generatorNeedRadio: "بوابة الرصيف معطلة… لا يوجد إخلاء دون بث نداء الاستغاثة أولاً.",
    generatorNeedLab: "القفل المركزي للرصيف مرتبط بنواة مجمع كيبريس… عليك حسم الأمر في المختبر أولاً.",
    labGateAlreadyOpen: "البوابة مفتوحة.",
    labGateNeedRadio: "البوابة الفولاذية مفصولة عن التيار… يجب تفعيل شبكة الطوارئ عبر محطة البث أولاً.",
    labGateMissingCards: (blue: boolean, red: boolean) => {
      const m: string[] = [];
      if (!blue) m.push("الشريحة الطبية الزرقاء");
      if (!red) m.push("الشريحة الصناعية الحمراء");
      return `بوابة المختبر: تحتاج بطاقتي الوصول — ينقص: ${m.join(" و ")}`;
    },
    labGateOpening: "البوابة تنفتح على صوت حديدي ميت… سلالم تنزل نحو العتمة",
    exitLabHint: "عدتَ إلى سطح مجمع كيبريس. الهواء… أحمر.",
    coreBossAlive: "«الحارس» لا يزال يحمي القاعة! اقضِ عليه أولاً قبل الاقتراب من النواة.",
    coreNeedDoc6: "ثمة ملف شخصي باسمك في ممر المختبر الخلفي… اقرأ رسالتك الأخيرة أولاً لاستعادة كود الإيقاف.",
    dealGateOpened: "البوابة فُتحت من تلقاء نفسها… لا تلمس هذا الصمت",
    leaveCoreHint: "تركتَ النواة خلفك… عليك فتح بوابة الرصيف النهري بالمولد للهرب.",
    extractNotReady: "انتظر! الفريق لم يصل بعد — واصل الصمود",
    explosionReached: "وصل الانفجار…",
    trigApartmentExitHint: "الشارع يغرق في الضباب… انتبه للصوت، فالرصاص يجذب المتجولين",
    trigPoliceHint: "المقر الأمني… لعلّ غرفة العمليات تحتفظ بآخر البرقيات الرسمية",
    trigMetroHint: "سور مجمع كيبريس… البوابة الفولاذية محمية بنظام تصريح مزدوج",
    trigHarborHint: "بوابة الرصيف مغلقة — المولد الكهربائي بجانبها يحتاج وقود ديزل",
    waveDoneToast: "وصل الفريق! اركض إلى القارب الآن!",
    noSaveAvailable: "لا يوجد حفظ متاح",
    cpSafe: "خزانة",
    cpAfterRadio: "بعد البث",
    cpQuest: (id: string) => `مهمة ${id}`,
    cpGate: "البوابة",
    cpLabEntry: "مدخل المختبر",
    cpAfterCore: "بعد النواة",
    cpDeal: "الصفقة",
  },
  zones: AR_ZONES,
  ui: {
    menu: {
      titlePrefix: "ظلال ك",
      titleFlicker: "ي",
      titleSuffix: "بريس",
      subtitle: "عالمٌ فاقد الذاكرة… ومدينةٌ تحشد موتاها",
      newGame: "لعبة جديدة",
      continueGame: "متابعة",
      endingsGallery: "سجل النهايات",
      howToPlay: "كيف تلعب",
      engineNotReady: "المحرك لم يجهز بعد… أعد المحاولة",
      pcHint: "اللعبة للحاسوب — فأرة ولوحة مفاتيح + سماعات رأس مقترحة بشدة",
      unlockedEndings: "النهايات المفتوحة:",
      langLabel: "اللغة",
    },
    intro: {
      skip: "تخطي",
    },
    hud: {
      objective: "الهدف",
      beforeExplosion: "قبل الانفجار",
      teamArrival: "وصول الفريق",
      radioStaticNear: "تشويش راديو قريب",
      reloading: "إعادة التلقيم…",
      reloadPrompt: "أعد التلقيم",
      crowbarShort: "عُقلة",
    },
    pause: {
      title: "إيقاف مؤقت",
      playTime: "زمن اللعب:",
      resume: "متابعة",
      inventory: "الحقيبة",
      map: "الخريطة",
      missions: "سجل المهام",
      howToPlay: "كيف تلعب",
      mainMenu: "القائمة الرئيسية",
      autoSaveNote: "يُحفظ التقدم تلقائياً عند نقاط التفتيش",
    },
    volume: {
      master: "الصوت العام",
      music: "الموسيقى",
      sfx: "المؤثرات",
    },
    inventory: {
      title: "الحقيبة",
      subtitle: "إدارة الموارد",
      closeAria: "إغلاق",
      pistolAmmo: "ذخيرة المسدس",
      shotgunAmmo: "خرطوش البندقية",
      equipped: "مجهّز",
      meleeDesc: "قتال قريب المدى",
      pistolDesc: "12 طلقة",
      shotgunDesc: "6 خرطوش",
      kindConsumable: "مستهلك",
      kindKey: "مفتاح",
      kindDoc: "وثيقة",
      kindMaterial: "مادة",
      weightLabel: "الوزن:",
      useBtn: "استخدام",
      readBtn: "قراءة",
      dropBtn: "إفلات",
      selectSlotHint: "اختر خانة لعرض تفاصيلها…",
      crowbarCard: "العُقلة",
      pistolCard: "المسدس",
      pistolUnowned: "المسدس — غير مقتنى",
      shotgunCard: "البندقية",
      shotgunUnowned: "البندقية — غير مقتناة",
      tabToClose: "للإغلاق",
    },
    map: {
      title: "خريطة شادو هافن",
      subtitle: "المسح الطبوغرافي للمدينة",
      directoryTitle: "دفتر المدينة",
      noMapData: "لا توجد بيانات خريطة — المحرك غير متصل",
      riverLabel: "نهر بلاك ووتر",
      footerHint: "للإغلاق — اعتمد على قراءة الوثائق وأسماء الشوارع ودفتر المدينة لتحديد وجهتك (الشمال في الأعلى)",
      legendPlayer: "موقعك واتجاهك",
      legendDiscovered: "منشأة مكتشفة",
      legendBlocked: "طريق مسدود",
      numbered: [
        { n: 1, x: -69, z: -69, name: "مجمع كيبريس (المختبر)" },
        { n: 2, x: -23, z: -69, name: "حي شادو هافن السكني" },
        { n: 3, x: -23, z: -23, name: "الساحة الرئيسية" },
        { n: 4, x: -69, z: 23, name: "المستودع" },
        { n: 5, x: -23, z: 23, name: "متجر الأسلحة" },
        { n: 6, x: 69, z: -69, name: "برج الإذاعة" },
        { n: 7, x: 0, z: 104, name: "ميناء بلاك ووتر" },
        { n: 8, x: 69, z: 23, name: "المستشفى" },
      ],
      extra: [
        { x: 23, z: -23, key: "مركز الشرطة", name: "مركز الشرطة" },
        { x: -69, z: 69, key: "مصنع القطع", name: "مصنع القطع" },
        { x: 69, z: 69, key: "محطة الوقود", name: "محطة الوقود" },
        { x: -106, z: 18, key: "المقبرة", name: "المقبرة" },
      ],
      streets: [
        { t: "شارع جريف", x: 30, z: -46, horiz: true },
        { t: "شارع جريف الشمالي", x: 40, z: -92, horiz: true },
        { t: "الشارع الرئيسي", x: 0, z: -20, horiz: false },
        { t: "طريق المختبر", x: -92, z: -30, horiz: false },
        { t: "طريق الرصيف", x: -40, z: 46, horiz: true },
        { t: "شارع النهر", x: 30, z: 92, horiz: true },
        { t: "شارع بيرسيست", x: 92, z: 16, horiz: false },
        { t: "جادة كرافن", x: 46, z: -60, horiz: false },
        { t: "طريق المستشفى", x: 30, z: 0, horiz: true },
      ],
    },
    missions: {
      title: "سجل المهام",
      backBtn: "رجوع (J)",
      mainStoryline: "الخط الرئيسي",
      futureObjective: "هدف لاحق… اكشفه باللعب",
      survivorMissions: "مهام الناجين",
      unknownSurvivor: "ناجٍ محاصر — لم يُكتشف بعد",
      completed: "اكتملت",
      unknownLocation: "مجهول الموقع",
      requestsLabel: "يطلب:",
      youHaveLabel: "لديك",
      deliverHint: "— عد إليه وسلّم ما طلب",
      exploreSurvivorsHint: "استكشف منشآت المدينة للعثور على ناجين قد يحتاجون لمساعدتك…",
      cityMissions: "مهام المدينة",
      lockerTitle: "الترسانة المفقودة — مركز الشرطة",
      inProgress: "جارية",
      lockerDoneDesc: "فتحتَ الخزانة وأخذتَ ما فيها. كانت ذخيرة وحدةٍ لم تصل قط.",
      lockerStep1: "الخطوة 1: ابحث عن مفتاح خزانة الأسلحة في مكتب الاستقبال بمركز الشرطة",
      lockerStep2: "الخطوة 2: عد إلى خزانة الأسلحة في غرفة الأدلة والترسانة وافتحها",
      truthEvidence: "أدلة الحقيقة",
      docsCollectedPrefix: "جمعتَ",
      docsCollectedSuffix: "من وثائق كيبريس — الوثائق الست كاملة تفتح النهاية الحقيقية.",
    },
    note: {
      footerHint: "اقرأ ما بين السطور لتستنتج خطوتك التالية — جميع الوثائق تفتح النهاية الحقيقية",
      closeBtn: "إغلاق (E / Esc)",
    },
    ai: {
      headerTitle: "كيميرا — النواة المركزية",
      clickToContinue: "انقر للمتابعة…",
    },
    ending: {
      headerLabel: "النهاية",
      time: "الوقت",
      kills: "القتلى",
      headshots: "إصابات الرأس",
      documents: "الوثائق",
      survivors: "الناجون",
      damageTaken: "الضرر المتلقى",
      mainMenu: "القائمة الرئيسية",
      loadLastCheckpoint: "العودة من آخر نقطة حفظ",
      retryFromStart: "إعادة المحاولة من البداية",
      unlockedEndings: "النهايات المفتوحة:",
      runNumberPrefix: "لعبة رقم ",
      runNumberSuffix: " في هذا السيرفر",
    },
    gallery: {
      titlePrefix: "سجل ",
      titleHighlight: "النهايات",
      subtitle: "ستة مصائر محتملة لمدينة واحدة — كم منها ستكشف؟",
      discoverByPlaying: "اكتشفها باللعب",
      serverRuns: "جولات هذا السيرفر:",
      colEnding: "النهاية",
      colTime: "الزمن",
      colKills: "القتلى",
      colDate: "التاريخ",
      unknownEnding: "نهاية مجهولة",
      backBtn: "رجوع",
    },
    help: {
      titlePrefix: "كيف ",
      titleHighlight: "تلعب",
      controlsTitle: "أزرار التحكم",
      tipsTitle: "نصائح للبقاء على قيد الحياة",
      storyTitle: "الخلفية",
      storyP1:
        "تستيقظ في بقايا شقتك بلا ذاكرة. بطاقة ممزقة تُسمّيك «جون» — عالم أبحاث في مختبرات «كيبريس»، المدينة التي بنيت فيها «كيميرا»: ذكاءً اصطناعياً كان معجزة… قبل أن يصمّم بنفسه نهاية العالم.",
      storyP2:
        "الموتى يسلكون الشوارع، والعسكريون يحضّرون للتطهير النهائي. ست وثائق مبعثرة تحمل الحقيقة الكاملة، وثلاثة نفوس عالقة تنتظر من يأخذها إلى الميناء.",
      storyP3Prefix: "كل قرار يصنع نهاية: ",
      storyP3Highlight: "ست نهايات مختلفة",
      storyP3Suffix: " تنتظر من يجرؤ على اكتشافها — هل تدمّر ما صنعته، أم تهرب بما تبقى من إنسانيتك؟",
      backBtn: "رجوع",
    },
  },
};

export const BUNDLES: Record<Lang, LocalizedBundle> = {
  en: EN_BUNDLE,
  ar: AR_BUNDLE,
};

let currentLang: Lang = "en";

export function getLang(): Lang {
  return currentLang;
}

export function getContent(lang: Lang = currentLang): LocalizedBundle {
  return BUNDLES[lang] ?? EN_BUNDLE;
}

// ── Live-synced exports for non-React / legacy callers (defaulting to EN) ──
export let GAME_TITLE = EN_BUNDLE.title;
export let GAME_TAGLINE = EN_BUNDLE.tagline;
export const INTRO_LINES: { text: string; voice?: string; hold?: number }[] = [...EN_BUNDLE.introLines];
export const CONTROLS: { key: string; action: string }[] = [...EN_BUNDLE.controls];
export const TIPS: string[] = [...EN_BUNDLE.tips];
export const OBJECTIVES: ObjectiveDef[] = [...EN_BUNDLE.objectives];
export const OBJECTIVE_BY_ID: Record<string, ObjectiveDef> = { ...EN_BUNDLE.objectiveById };
export const DOCS: DocDef[] = [...EN_BUNDLE.docs];
export const DOC_BY_ID: Record<string, DocDef> = { ...EN_BUNDLE.docById };
export const ITEMS: Record<ItemId, ItemDef> = { ...EN_BUNDLE.items };
export const SIDE_MISSIONS: SideMissionDef[] = [...EN_BUNDLE.sideMissions];
export const WEAPONS: Record<WeaponId, WeaponDef> = { ...EN_BUNDLE.weapons };
export const ENEMIES: Record<EnemyKind, EnemyDef> = { ...EN_BUNDLE.enemies };
export const SURVIVORS: SurvivorDef[] = [...EN_BUNDLE.survivors];
export const SURVIVOR_BY_ID: Record<string, SurvivorDef> = { ...EN_BUNDLE.survivorById };
export const AI_DIALOGUE: LocalizedBundle["aiDialogue"] = [...EN_BUNDLE.aiDialogue];
export const AI_REACTIONS: Record<string, { text: string; voice?: string }> = { ...EN_BUNDLE.aiReactions };
export const ENDINGS: EndingDef[] = [...EN_BUNDLE.endings];
export const ENDING_BY_ID: Record<string, EndingDef> = { ...EN_BUNDLE.endingById };
export const MESSAGES: MessagesBundle = { ...EN_BUNDLE.messages };
export const ZONES: Record<string, string> = { ...EN_BUNDLE.zones };

export function setCurrentLang(lang: Lang) {
  currentLang = lang;
  const b = BUNDLES[lang] ?? EN_BUNDLE;
  GAME_TITLE = b.title;
  GAME_TAGLINE = b.tagline;

  INTRO_LINES.splice(0, INTRO_LINES.length, ...b.introLines);
  CONTROLS.splice(0, CONTROLS.length, ...b.controls);
  TIPS.splice(0, TIPS.length, ...b.tips);
  OBJECTIVES.splice(0, OBJECTIVES.length, ...b.objectives);
  for (const k of Object.keys(OBJECTIVE_BY_ID)) delete OBJECTIVE_BY_ID[k];
  Object.assign(OBJECTIVE_BY_ID, b.objectiveById);

  DOCS.splice(0, DOCS.length, ...b.docs);
  for (const k of Object.keys(DOC_BY_ID)) delete DOC_BY_ID[k];
  Object.assign(DOC_BY_ID, b.docById);

  Object.assign(ITEMS, b.items);
  SIDE_MISSIONS.splice(0, SIDE_MISSIONS.length, ...b.sideMissions);
  Object.assign(WEAPONS, b.weapons);
  Object.assign(ENEMIES, b.enemies);

  SURVIVORS.splice(0, SURVIVORS.length, ...b.survivors);
  for (const k of Object.keys(SURVIVOR_BY_ID)) delete SURVIVOR_BY_ID[k];
  Object.assign(SURVIVOR_BY_ID, b.survivorById);

  AI_DIALOGUE.splice(0, AI_DIALOGUE.length, ...b.aiDialogue);
  for (const k of Object.keys(AI_REACTIONS)) delete AI_REACTIONS[k];
  Object.assign(AI_REACTIONS, b.aiReactions);

  ENDINGS.splice(0, ENDINGS.length, ...b.endings);
  for (const k of Object.keys(ENDING_BY_ID)) delete ENDING_BY_ID[k];
  Object.assign(ENDING_BY_ID, b.endingById);

  Object.assign(MESSAGES, b.messages);
  for (const k of Object.keys(ZONES)) delete ZONES[k];
  Object.assign(ZONES, b.zones);
}

/** Dynamically translates any 3D world interactable prompt into the selected language */
export function translateInteractPrompt(
  it: { id: string; kind: string; prompt: string; data?: Record<string, unknown> },
  lang: Lang = currentLang,
): string {
  const b = getContent(lang);
  switch (it.kind) {
    case "door":
      return lang === "en" ? "Open / Close Door" : "فتح / إغلاق الباب";
    case "note":
      return lang === "en" ? "Read Document" : "قراءة الوثيقة";
    case "checkpoint":
      return lang === "en" ? "Save Locker — Save Progress" : "خزانة الحفظ — حفظ التقدم";
    case "console":
      return lang === "en" ? "Broadcast — Distress Signal" : "البث — نداء استغاثة";
    case "generator":
      return lang === "en" ? "Start Generator" : "تشغيل المولد";
    case "gate":
      return lang === "en" ? "Lab Bunker Gate — 2 Keycards" : "بوابة المختبر — بطاقتا وصول";
    case "core":
      return lang === "en" ? "The Core — CHIMERA" : "النواة — كيميرا";
    case "exit":
      if (it.data?.labExit) {
        return lang === "en" ? "Ascend to Surface" : "الصعود إلى السطح";
      }
      return lang === "en" ? "Board Extraction Boat & Escape" : "الصعود إلى قارب الإخلاء والنجاة";
    case "npc": {
      const sid = it.data?.survivor as "sara" | "adel" | "soldier" | undefined;
      if (sid === "sara") return lang === "en" ? "Talk to Sara" : "التحدث مع سارة";
      if (sid === "adel") return lang === "en" ? "Talk to Adel" : "التحدث مع عادل";
      if (sid === "soldier") return lang === "en" ? "Talk to Master Sergeant" : "التحدث مع الرقيب";
      return lang === "en" ? "Talk" : "تحدث";
    }
    case "item": {
      if (it.data?.locker) {
        return lang === "en"
          ? "Weapons Locker — Requires Armory Key"
          : "خزانة الأسلحة — تحتاج مفتاح الترسانة";
      }
      if (it.data?.weapon) {
        const w = it.data.weapon as WeaponId;
        const wName = b.weapons[w]?.name ?? w;
        return lang === "en" ? `Pick up ${wName}` : `التقاط ${wName}`;
      }
      if (it.id.startsWith("drop_")) {
        return b.messages.lootDropPrompt;
      }
      const itemKey = it.data?.item as ItemId | undefined;
      const qty = (it.data?.qty as number) ?? 1;
      if (itemKey && b.items[itemKey]) {
        const itemName = b.items[itemKey].name;
        return lang === "en"
          ? `Pick up ${itemName}${qty > 1 ? ` ×${qty}` : ""}`
          : `التقاط ${itemName}${qty > 1 ? ` ×${qty}` : ""}`;
      }
      return it.prompt;
    }
    default:
      return it.prompt;
  }
}

const POI_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  "شقتك": { en: "Your Apartment", ar: "شقتك" },
  "الساحة الرئيسية": { en: "Central Plaza", ar: "الساحة الرئيسية" },
  "متجر الأسلحة": { en: "Arms & Ammo Shop", ar: "متجر الأسلحة" },
  "مركز الشرطة": { en: "Police Station", ar: "مركز الشرطة" },
  "برج الإذاعة": { en: "Radio Broadcast Tower", ar: "برج الإذاعة" },
  "المستشفى المركزي": { en: "General Hospital", ar: "المستشفى المركزي" },
  "مصنع القطع": { en: "Parts Factory", ar: "مصنع القطع" },
  "المستودع الغربي": { en: "Western Warehouse", ar: "المستودع الغربي" },
  "محطة الوقود": { en: "Gas Station", ar: "محطة الوقود" },
  "مجمع كيبريس — المختبر": { en: "Kypris Complex — Bio-Lab", ar: "مجمع كيبريس — المختبر" },
  "ميناء بلاك ووتر": { en: "Blackwater Harbor", ar: "ميناء بلاك ووتر" },
  "محطة النهر": { en: "River Station", ar: "محطة النهر" },
  "المختبر — تحت الأرض": { en: "Underground Bio-Lab", ar: "المختبر — تحت الأرض" },
};

export function translatePoiName(name: string, lang: Lang = currentLang): string {
  const entry = POI_TRANSLATIONS[name];
  if (entry) return entry[lang];
  return name;
}
