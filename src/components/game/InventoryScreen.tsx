"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Crosshair,
  FileText,
  Hammer,
  Heart,
  Key,
  Plus,
  Shell,
  ShieldAlert,
  X,
} from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { audio } from "@/lib/game/audio";
import { getEngine } from "@/lib/game/engineRef";
import type { InvSlot, ItemId, Lang, WeaponId } from "@/lib/game/types";

function ItemIcon({ item, lang, className }: { item: ItemId; lang: Lang; className?: string }) {
  const kind = getContent(lang).items[item]?.kind;
  if (item === "food") return <Heart className={className} strokeWidth={1.6} />;
  if (kind === "consumable") return <Plus className={className} strokeWidth={1.6} />;
  if (kind === "key") return <Key className={className} strokeWidth={1.6} />;
  if (kind === "doc") return <FileText className={className} strokeWidth={1.6} />;
  return <Boxes className={className} strokeWidth={1.6} />;
}

function WeaponCard({
  id,
  name,
  owned,
  equipped,
  lang,
  stickHits,
  stickMaxHits,
  ammoCount,
  onPick,
}: {
  id: WeaponId;
  name: string;
  owned: boolean;
  equipped: boolean;
  lang: Lang;
  stickHits?: number;
  stickMaxHits?: number;
  ammoCount?: number;
  onPick: () => void;
}) {
  const ui = getContent(lang).ui.inventory;
  const keyNum = id === "crowbar" ? "1" : id === "pistol" ? "2" : "3";

  return (
    <button
      disabled={!owned}
      onClick={onPick}
      className={`kypris-hud-corner relative flex flex-col justify-between rounded border p-3.5 text-start transition-all ${
        equipped
          ? "border-amber-500/70 bg-amber-950/25 shadow-[inset_0_0_24px_rgba(245,158,11,0.12)]"
          : owned
            ? "border-stone-800/90 bg-stone-950/65 hover:border-stone-600/80 hover:bg-stone-900/60"
            : "cursor-not-allowed border-stone-900/70 bg-black/35 opacity-45"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span
          dir="ltr"
          className={`inline-flex h-5 w-5 items-center justify-center rounded border font-mono text-[10px] font-bold ${
            equipped
              ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
              : "border-stone-800 bg-black/60 text-stone-500"
          }`}
        >
          {keyNum}
        </span>

        {equipped ? (
          <span className="rounded border border-amber-500/50 bg-amber-950/60 px-1.5 py-0.5 font-ui text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
            {ui.equipped}
          </span>
        ) : owned ? (
          <span className="text-[10px] text-stone-500">
            {id === "crowbar" ? (
              <Hammer className="h-3.5 w-3.5 text-amber-600/80" strokeWidth={1.6} />
            ) : id === "pistol" ? (
              <Crosshair className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.6} />
            ) : (
              <Shell className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.6} />
            )}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5">
        <p className={`font-ui text-sm font-bold ${owned ? "text-stone-100" : "text-stone-600"}`}>
          {name}
        </p>
        <p className="mt-0.5 text-[11px] leading-4 text-stone-500">
          {id === "crowbar" ? ui.meleeDesc : id === "pistol" ? ui.pistolDesc : ui.shotgunDesc}
        </p>
      </div>

      {/* Durability or Reserve Ammo footer */}
      {owned && id === "crowbar" && (stickMaxHits ?? 0) > 0 && (
        <div className="mt-3 w-full border-t border-stone-800/80 pt-2">
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-stone-400">
              {lang === "ar" ? "المتانة المتبقية" : "Condition"}
            </span>
            <span
              dir="ltr"
              className={`font-mono font-bold ${
                (stickHits ?? 0) <= 2 ? "text-red-400" : "text-amber-400"
              }`}
            >
              {stickHits}/{stickMaxHits}
            </span>
          </div>
          <div className="flex gap-0.5" dir="ltr">
            {Array.from({ length: stickMaxHits ?? 8 }).map((_, idx) => {
              const active = idx < (stickHits ?? 0);
              const low = (stickHits ?? 0) <= 2;
              return (
                <span
                  key={idx}
                  className={`h-1.5 flex-1 rounded-[1px] ${
                    active ? (low ? "bg-red-500" : "bg-amber-500") : "bg-stone-800"
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {owned && (id === "pistol" || id === "shotgun") && (
        <div className="mt-3 flex w-full items-center justify-between border-t border-stone-800/80 pt-2 text-[10px]">
          <span className="text-stone-500">
            {lang === "ar" ? "الذخيرة الاحتياطية" : "Reserve Ammo"}
          </span>
          <span dir="ltr" className="font-mono font-bold text-stone-300">
            {ammoCount ?? 0}
          </span>
        </div>
      )}
    </button>
  );
}

export default function InventoryScreen() {
  const lang = useGame((g) => g.lang);
  const inventory = useGame((g) => g.inventory);
  const hudAmmoPistol = useGame((g) => g.hud.pistolAmmo);
  const hudAmmoShotgun = useGame((g) => g.hud.shotgunAmmo);
  const stickHits = useGame((g) => g.hud.stickHits);
  const stickMaxHits = useGame((g) => g.hud.stickMaxHits);
  const equipped = useGame((g) => g.hud.equipped);
  const weapons = useGame((g) => g.weapons);
  const [selected, setSelected] = useState<number | null>(null);

  const c = getContent(lang);
  const ui = c.ui.inventory;
  const kindLabel: Record<string, string> = {
    consumable: ui.kindConsumable,
    key: ui.kindKey,
    doc: ui.kindDoc,
    material: ui.kindMaterial,
  };

  const close = () => {
    useGame.getState().setScreen("playing");
    getEngine()?.resume();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        useGame.getState().setScreen("playing");
        getEngine()?.resume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const used = inventory.filter(Boolean).length;
  const slot: InvSlot | null = selected !== null ? (inventory[selected] ?? null) : null;
  const def = slot ? c.items[slot.item] : null;

  const onUse = () => {
    if (!slot || !def || def.kind !== "consumable") return;
    const sfx = slot.item === "battery" ? "pickup" : "heal";
    useGame.getState().useSlot(slot.uid);
    audio.play(sfx);
  };

  const onDrop = () => {
    if (!slot) return;
    useGame.getState().dropSlot(slot.uid);
    audio.play("ui_click");
    setSelected(null);
  };

  const onRead = () => {
    if (!slot || !def || def.kind !== "doc") return;
    audio.play("paper");
    useGame.getState().setNote(slot.item);
    useGame.getState().setScreen("note");
  };

  const pickWeapon = (w: WeaponId) => {
    useGame.getState().equip(w);
    getEngine()?.equipWeapon(w);
    audio.play("ui_click");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
      <div className="kypris-panel kypris-hud-corner kypris-scroll max-h-[88vh] w-[min(900px,95vw)] overflow-y-auto rounded-md p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between border-b border-stone-800/80 pb-3.5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h2 className="font-title text-2xl font-bold tracking-wide text-stone-100">
                {ui.title}
              </h2>
              <span className="rounded border border-stone-800 bg-black/50 px-2 py-0.5 font-ui text-xs text-amber-500/90">
                {ui.subtitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              dir="ltr"
              className="rounded border border-stone-800 bg-black/50 px-2.5 py-1 font-mono text-xs text-stone-300"
            >
              {used} / 10
            </span>
            <button
              onClick={close}
              className="kypris-btn rounded p-1.5 text-stone-400 hover:text-stone-100"
              aria-label={ui.closeAria}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Weapons & Loadout Section */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-ui text-xs font-semibold tracking-wider text-stone-400 uppercase">
              {lang === "ar" ? "الأسلحة والتجهيز الميداني" : "Field Loadout & Weapons"}
            </span>
            {!weapons.crowbar && !weapons.pistol && !weapons.shotgun && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400/90">
                <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} />
                {lang === "ar"
                  ? "أنت أعزل حالياً — ابحث عن عصا خشبية لحماية نفسك"
                  : "Currently unarmed — scavenge a wooden stick for self-defense"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <WeaponCard
              id="crowbar"
              name={weapons.crowbar ? ui.crowbarCard : ui.crowbarUnowned}
              owned={weapons.crowbar}
              equipped={equipped === "crowbar"}
              lang={lang}
              stickHits={stickHits}
              stickMaxHits={stickMaxHits}
              onPick={() => pickWeapon("crowbar")}
            />
            <WeaponCard
              id="pistol"
              name={weapons.pistol ? ui.pistolCard : ui.pistolUnowned}
              owned={weapons.pistol}
              equipped={equipped === "pistol"}
              lang={lang}
              ammoCount={hudAmmoPistol}
              onPick={() => pickWeapon("pistol")}
            />
            <WeaponCard
              id="shotgun"
              name={weapons.shotgun ? ui.shotgunCard : ui.shotgunUnowned}
              owned={weapons.shotgun}
              equipped={equipped === "shotgun"}
              lang={lang}
              ammoCount={hudAmmoShotgun}
              onPick={() => pickWeapon("shotgun")}
            />
          </div>
        </div>

        {/* Reserve Ammo Strip */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded border border-stone-800/90 bg-black/45 px-4 py-2.5">
            <Crosshair className="h-4 w-4 text-amber-600/80" strokeWidth={1.6} />
            <span className="text-xs text-stone-400">{ui.pistolAmmo}</span>
            <span dir="ltr" className="ms-auto font-mono text-base font-bold text-stone-200">
              {hudAmmoPistol}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded border border-stone-800/90 bg-black/45 px-4 py-2.5">
            <Shell className="h-4 w-4 text-amber-600/80" strokeWidth={1.6} />
            <span className="text-xs text-stone-400">{ui.shotgunAmmo}</span>
            <span dir="ltr" className="ms-auto font-mono text-base font-bold text-stone-200">
              {hudAmmoShotgun}
            </span>
          </div>
        </div>

        {/* Inventory 10-Slot Tactical Grid */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {inventory.map((s, i) => {
            const isSel = selected === i;
            const itemDef = s ? c.items[s.item] : null;
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`kypris-hud-corner group relative flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded border p-2.5 transition-all ${
                  s
                    ? isSel
                      ? "border-amber-500/80 bg-amber-950/30 shadow-[inset_0_0_20px_rgba(245,158,11,0.15)]"
                      : "border-stone-800 bg-stone-950/75 hover:border-stone-600"
                    : isSel
                      ? "border-amber-600/60 bg-black/50"
                      : "border-dashed border-stone-800/70 bg-black/30 hover:border-stone-700/70"
                }`}
              >
                <span
                  dir="ltr"
                  className="absolute right-1.5 top-1 font-mono text-[9px] text-stone-600"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s && itemDef ? (
                  <>
                    <ItemIcon
                      item={s.item}
                      lang={lang}
                      className={`h-6 w-6 transition-transform group-hover:scale-105 ${
                        itemDef.kind === "consumable"
                          ? "text-emerald-400/90"
                          : itemDef.kind === "key"
                            ? "text-amber-400/90"
                            : itemDef.kind === "doc"
                              ? "text-sky-300/90"
                              : "text-stone-300"
                      }`}
                    />
                    <span className="line-clamp-1 text-center font-ui text-[11px] font-medium leading-4 text-stone-200">
                      {itemDef.name}
                    </span>
                    {s.qty > 1 && (
                      <span
                        dir="ltr"
                        className="absolute left-1.5 top-1 rounded border border-amber-700/40 bg-black/85 px-1.5 font-mono text-[10px] font-bold text-amber-400"
                      >
                        ×{s.qty}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-mono text-[10px] text-stone-800">—</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Item Inspector */}
        <div className="mb-4 min-h-[96px] rounded border border-stone-800/90 bg-black/55 p-4">
          {slot && def ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-title text-lg font-bold text-stone-100">{def.name}</p>
                  <span className="rounded border border-stone-700/80 bg-stone-900/80 px-2 py-0.5 font-ui text-[10px] text-amber-400/90">
                    {kindLabel[def.kind]}
                  </span>
                  <span className="font-mono text-[10px] text-stone-500">
                    {ui.weightLabel} {def.weight}
                  </span>
                </div>
                <p className="mt-1.5 max-w-xl text-xs leading-6 text-stone-300">{def.desc}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                {def.kind === "consumable" && (
                  <button
                    onClick={onUse}
                    className="kypris-btn rounded border-emerald-700/60 px-4 py-2 font-ui text-sm font-semibold text-emerald-300"
                  >
                    {ui.useBtn}
                  </button>
                )}
                {def.kind === "doc" && (
                  <button
                    onClick={onRead}
                    className="kypris-btn rounded border-amber-700/60 px-4 py-2 font-ui text-sm font-semibold text-amber-300"
                  >
                    {ui.readBtn}
                  </button>
                )}
                <button
                  onClick={onDrop}
                  className="kypris-btn rounded border-red-900/60 px-4 py-2 font-ui text-sm text-red-400"
                >
                  {ui.dropBtn}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[64px] items-center justify-center">
              <p className="font-ui text-xs text-stone-500">{ui.selectSlotHint}</p>
            </div>
          )}
        </div>

        <p className="text-center font-ui text-[11px] text-stone-500">
          <span
            dir="ltr"
            className="rounded border border-stone-800 bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-stone-300"
          >
            Tab
          </span>{" "}
          {ui.tabToClose}
        </p>
      </div>
    </div>
  );
}
