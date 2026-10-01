"use client";

import { create } from "zustand";
import type {
  AmbientProfile,
  EndingId,
  GameFlags,
  GameStats,
  HudState,
  InvSlot,
  ItemId,
  Lang,
  SaveData,
  Screen,
  WeaponId,
} from "./types";
import { ITEMS, INVENTORY_SLOTS, WEAPONS, OBJECTIVE_BY_ID, getContent, setCurrentLang } from "./content";

let uidCounter = 0;
const nextUid = () => `u${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

const initialFlags: GameFlags = {
  exitedApartment: false,
  hasWeapon: false,
  hasTowerKey: false,
  radioDone: false,
  saraSaved: false,
  saraQuest: false,
  adelSaved: false,
  adelQuest: false,
  soldierSaved: false,
  lockerOpened: false,
  metSara: false,
  metAdel: false,
  metSoldier: false,
  labEntered: false,
  metAI: false,
  dealAccepted: false,
  coreDestroyed: false,
  bossKilled: false,
  generatorFixed: false,
  waveDone: false,
  extracted: false,
  bruteHospitalKilled: false,
};

const initialStats: GameStats = {
  kills: 0,
  headshots: 0,
  shots: 0,
  damageTaken: 0,
  itemsUsed: 0,
  playSeconds: 0,
};

const initialHud: HudState = {
  hp: 100,
  maxHp: 100,
  stamina: 100,
  battery: 100,
  flashlightOn: true,
  crouching: false,
  hidden: false,
  equipped: null,
  stickHits: 0,
  stickMaxHits: 0,
  pistolMag: 0,
  shotgunMag: 0,
  pistolAmmo: 0,
  shotgunAmmo: 0,
  reloading: false,
  objective: "",
  optionalObjective: "",
  prompt: "",
  hint: "",
  hintAt: 0,
  damageAt: 0,
  healAt: 0,
  heartbeat: false,
  threat: 0,
  zone: "",
  escapeTimer: -1,
  waveTimer: -1,
  bossesNear: false,
};

export interface GameStore {
  screen: Screen;
  prevScreen: Screen;
  hud: HudState;
  inventory: (InvSlot | null)[];
  weapons: { crowbar: boolean; pistol: boolean; shotgun: boolean };
  flags: GameFlags;
  docsRead: ItemId[];
  stats: GameStats;
  endingId: EndingId | null;
  objectiveId: string;
  checkpoint: string;
  ambient: AmbientProfile;
  lang: Lang;
  settings: { master: number; music: number; sfx: number; hints: boolean; lang?: Lang };
  hasSave: boolean;
  toast: { text: string; at: number } | null;
  noteId: ItemId | null;
  aiChoiceOpen: boolean;

  setLang: (l: Lang) => void;
  setScreen: (s: Screen) => void;
  setHud: (p: Partial<HudState>) => void;
  setPrompt: (p: string) => void;
  showHint: (t: string) => void;
  toastMsg: (t: string) => void;
  damageFlash: () => void;
  healFlash: () => void;
  setObjective: (id: string) => void;
  setFlag: <K extends keyof GameFlags>(k: K, v: GameFlags[K]) => void;
  setAmbient: (a: AmbientProfile) => void;
  setNote: (id: ItemId | null) => void;
  setAiChoiceOpen: (v: boolean) => void;

  addItem: (item: ItemId, qty?: number) => boolean;
  removeItemByUid: (uid: string, qty?: number) => void;
  consumeFirst: (item: ItemId) => boolean;
  hasItem: (item: ItemId) => boolean;
  countItem: (item: ItemId) => number;
  useSlot: (uid: string) => void;
  dropSlot: (uid: string) => void;
  moveSlot: (from: number, to: number) => void;

  equip: (w: WeaponId | null) => void;
  giveWeapon: (w: "crowbar" | "pistol" | "shotgun", durability?: number) => void;
  breakStick: () => void;

  addKill: () => void;
  addHeadshot: () => void;
  addShot: () => void;
  addDamage: (n: number) => void;
  addItemUsed: () => void;
  tickPlaySeconds: (s: number) => void;

  markDoc: (id: ItemId) => void;
  setEnding: (id: EndingId) => void;

  resetRun: () => void;
  applySave: (s: SaveData) => void;
  getSaveData: (pos: [number, number], yaw: number) => SaveData;
  setHasSave: (v: boolean) => void;
  setSetting: (k: "master" | "music" | "sfx" | "hints", v: number | boolean) => void;
}

const emptyInventory = () =>
  Array.from({ length: INVENTORY_SLOTS }, () => null as InvSlot | null);

export const useGame = create<GameStore>((set, get) => ({
  screen: "menu",
  prevScreen: "menu",
  hud: { ...initialHud },
  inventory: emptyInventory(),
  weapons: { crowbar: false, pistol: false, shotgun: false },
  flags: { ...initialFlags },
  docsRead: [],
  stats: { ...initialStats },
  endingId: null,
  objectiveId: "obj_wake",
  checkpoint: "",
  ambient: "menu",
  lang: "en",
  settings: { master: 0.8, music: 0.7, sfx: 0.9, hints: true, lang: "en" },
  hasSave: false,
  toast: null,
  noteId: null,
  aiChoiceOpen: false,

  setLang: (l) => {
    setCurrentLang(l);
    const b = getContent(l);
    set((g) => {
      const def = b.objectiveById[g.objectiveId];
      return {
        lang: l,
        settings: { ...g.settings, lang: l },
        hud: {
          ...g.hud,
          objective: g.hud.objective ? (def?.text ?? g.hud.objective) : "",
          optionalObjective: g.hud.optionalObjective ? (def?.optional ?? g.hud.optionalObjective) : "",
          zone: "",
          prompt: "",
        },
      };
    });
  },
  setScreen: (s) => set((g) => ({ screen: s, prevScreen: g.screen })),
  setHud: (p) => set((g) => ({ hud: { ...g.hud, ...p } })),
  setPrompt: (p) => set((g) => (g.hud.prompt === p ? g : { hud: { ...g.hud, prompt: p } })),
  showHint: (t) =>
    set((g) => ({ hud: { ...g.hud, hint: t, hintAt: Date.now() } })),
  toastMsg: (t) => set({ toast: { text: t, at: Date.now() } }),
  damageFlash: () => set((g) => ({ hud: { ...g.hud, damageAt: Date.now() } })),
  healFlash: () => set((g) => ({ hud: { ...g.hud, healAt: Date.now() } })),
  setObjective: (id) => {
    const o = get().objectiveId;
    if (o === id) return;
    const def = OBJECTIVE_BY_ID[id];
    set((g) => ({
      objectiveId: id,
      hud: {
        ...g.hud,
        objective: def?.text ?? "",
        optionalObjective: def?.optional ?? "",
      },
    }));
  },
  setFlag: (k, v) => set((g) => ({ flags: { ...g.flags, [k]: v } })),
  setAmbient: (a) => set({ ambient: a }),
  setNote: (id) => set({ noteId: id }),
  setAiChoiceOpen: (v) => set({ aiChoiceOpen: v }),

  addItem: (item, qtyArg = 1) => {
    const inv = [...get().inventory];
    const def = ITEMS[item];
    let qty = qtyArg;
    // ammo goes to pool, never to slots
    if (item === "pistol_ammo" || item === "shotgun_ammo") {
      set((g) =>
        item === "pistol_ammo"
          ? { hud: { ...g.hud, pistolAmmo: Math.min(120, g.hud.pistolAmmo + qty) } }
          : { hud: { ...g.hud, shotgunAmmo: Math.min(48, g.hud.shotgunAmmo + qty) } },
      );
      return true;
    }
    // stack first
    for (let i = 0; i < inv.length && qty > 0; i++) {
      const s = inv[i];
      if (s && s.item === item && s.qty < def.stack) {
        const take = Math.min(def.stack - s.qty, qty);
        inv[i] = { ...s, qty: s.qty + take };
        qty -= take;
      }
    }
    // new slots
    for (let i = 0; i < inv.length && qty > 0; i++) {
      if (!inv[i]) {
        const take = Math.min(def.stack, qty);
        inv[i] = { uid: nextUid(), item, qty: take };
        qty -= take;
      }
    }
    if (qty > 0) {
      set({ inventory: inv });
      return false; // partial / failed
    }
    set({ inventory: inv });
    return true;
  },

  removeItemByUid: (uid, qty = 1) =>
    set((g) => {
      const inv = g.inventory.map((s) => {
        if (s && s.uid === uid) {
          const left = s.qty - qty;
          return left > 0 ? { ...s, qty: left } : null;
        }
        return s;
      });
      return { inventory: inv };
    }),

  consumeFirst: (item) => {
    const inv = get().inventory;
    for (const s of inv) {
      if (s && s.item === item) {
        get().removeItemByUid(s.uid, 1);
        return true;
      }
    }
    return false;
  },

  hasItem: (item) => get().inventory.some((s) => s && s.item === item),

  countItem: (item) =>
    get().inventory.reduce((n, s) => (s && s.item === item ? n + s.qty : n), 0),

  useSlot: (uid) => {
    const g = get();
    const slot = g.inventory.find((s) => s && s.uid === uid);
    if (!slot) return;
    const h = g.hud;
    switch (slot.item) {
      case "medkit":
        if (h.hp >= h.maxHp) return;
        g.setHud({ hp: Math.min(h.maxHp, h.hp + 60), healAt: Date.now() });
        break;
      case "bandage":
        if (h.hp >= h.maxHp) return;
        g.setHud({ hp: Math.min(h.maxHp, h.hp + 25), healAt: Date.now() });
        break;
      case "food":
        g.setHud({
          hp: Math.min(h.maxHp, h.hp + 15),
          stamina: Math.min(100, h.stamina + 30),
          healAt: Date.now(),
        });
        break;
      case "battery":
        g.setHud({ battery: Math.min(100, h.battery + 70) });
        break;
      default:
        return; // non-consumables not "used" from inventory
    }
    g.addItemUsed();
    g.removeItemByUid(uid, 1);
  },

  dropSlot: (uid) => get().removeItemByUid(uid, 999),

  moveSlot: (from, to) =>
    set((g) => {
      const inv = [...g.inventory];
      if (from === to || from < 0 || to < 0 || from >= inv.length || to >= inv.length)
        return g;
      const a = inv[from];
      const b = inv[to];
      // merge same stackable
      if (a && b && a.item === b.item) {
        const def = ITEMS[a.item];
        const take = Math.min(def.stack - b.qty, a.qty);
        if (take > 0) {
          inv[to] = { ...b, qty: b.qty + take };
          inv[from] = a.qty - take > 0 ? { ...a, qty: a.qty - take } : null;
          return { inventory: inv };
        }
      }
      inv[from] = b;
      inv[to] = a;
      return { inventory: inv };
    }),

  equip: (w) => set((g) => ({ hud: { ...g.hud, equipped: w, reloading: false } })),

  giveWeapon: (w, durability) => {
    set((g) => {
      const weapons = { ...g.weapons, [w]: true };
      const h = { ...g.hud };
      if (w === "crowbar") {
        const hits = durability ?? (7 + Math.floor(Math.random() * 5));
        h.stickHits = hits;
        h.stickMaxHits = hits;
        if (!h.equipped) h.equipped = "crowbar";
        return { weapons, hud: h };
      }
      if (!h.equipped || h.equipped === "crowbar") {
        h.equipped = w;
      }
      if (w === "pistol" && h.pistolMag === 0) h.pistolMag = WEAPONS.pistol.magSize;
      if (w === "shotgun" && h.shotgunMag === 0) h.shotgunMag = WEAPONS.shotgun.magSize;
      return { weapons, hud: h, flags: { ...g.flags, hasWeapon: true } };
    });
  },

  breakStick: () => {
    set((g) => {
      const weapons = { ...g.weapons, crowbar: false };
      let nextEq: WeaponId | null = g.hud.equipped;
      if (nextEq === "crowbar") {
        nextEq = weapons.pistol ? "pistol" : weapons.shotgun ? "shotgun" : null;
      }
      return {
        weapons,
        hud: { ...g.hud, stickHits: 0, stickMaxHits: 0, equipped: nextEq },
      };
    });
  },

  addKill: () => set((g) => ({ stats: { ...g.stats, kills: g.stats.kills + 1 } })),
  addHeadshot: () => set((g) => ({ stats: { ...g.stats, headshots: g.stats.headshots + 1 } })),
  addShot: () => set((g) => ({ stats: { ...g.stats, shots: g.stats.shots + 1 } })),
  addDamage: (n) => set((g) => ({ stats: { ...g.stats, damageTaken: g.stats.damageTaken + n } })),
  addItemUsed: () => set((g) => ({ stats: { ...g.stats, itemsUsed: g.stats.itemsUsed + 1 } })),
  tickPlaySeconds: (s) => set((g) => ({ stats: { ...g.stats, playSeconds: g.stats.playSeconds + s } })),

  markDoc: (id) =>
    set((g) => (g.docsRead.includes(id) ? g : { docsRead: [...g.docsRead, id] })),

  setEnding: (id) => set({ endingId: id }),

  resetRun: () =>
    set((g) => ({
      screen: g.screen,
      hud: { ...initialHud },
      inventory: emptyInventory(),
      weapons: { crowbar: false, pistol: false, shotgun: false },
      flags: { ...initialFlags },
      docsRead: [],
      stats: { ...initialStats },
      endingId: null,
      objectiveId: "obj_wake",
      checkpoint: "",
      ambient: "menu",
      noteId: null,
      aiChoiceOpen: false,
    })),

  applySave: (s) =>
    set(() => {
      const hasCrowbar = Boolean(s.weapons?.crowbar && (s.stickHits ?? 0) > 0);
      const eq =
        s.equipped === "crowbar" && !hasCrowbar
          ? s.weapons?.pistol
            ? "pistol"
            : s.weapons?.shotgun
              ? "shotgun"
              : null
          : s.equipped;
      return {
        hud: {
          ...initialHud,
          hp: s.hp,
          stamina: s.stamina,
          battery: s.battery,
          pistolAmmo: s.pistolAmmo,
          shotgunAmmo: s.shotgunAmmo,
          pistolMag: s.pistolMag,
          shotgunMag: s.shotgunMag,
          stickHits: hasCrowbar ? (s.stickHits ?? 9) : 0,
          stickMaxHits: hasCrowbar ? (s.stickMaxHits ?? 9) : 0,
          equipped: eq,
        },
        inventory: s.inventory,
        weapons: {
          crowbar: hasCrowbar,
          pistol: Boolean(s.weapons?.pistol),
          shotgun: Boolean(s.weapons?.shotgun),
        },
        flags: s.flags,
        docsRead: s.docsRead,
        stats: s.stats,
        objectiveId: s.objectiveId,
        checkpoint: s.checkpoint,
      };
    }),

  getSaveData: (pos, yaw) => {
    const g = get();
    return {
      pos,
      yaw,
      hp: g.hud.hp,
      stamina: g.hud.stamina,
      battery: g.hud.battery,
      pistolAmmo: g.hud.pistolAmmo,
      shotgunAmmo: g.hud.shotgunAmmo,
      pistolMag: g.hud.pistolMag,
      shotgunMag: g.hud.shotgunMag,
      stickHits: g.hud.stickHits,
      stickMaxHits: g.hud.stickMaxHits,
      weapons: g.weapons,
      equipped: g.hud.equipped,
      inventory: g.inventory,
      flags: g.flags,
      docsRead: g.docsRead,
      stats: g.stats,
      objectiveId: g.objectiveId,
      checkpoint: g.checkpoint,
      savedAt: Date.now(),
    };
  },

  setHasSave: (v) => set({ hasSave: v }),
  setSetting: (k, v) => set((g) => ({ settings: { ...g.settings, [k]: v } as typeof g.settings })),
}));
