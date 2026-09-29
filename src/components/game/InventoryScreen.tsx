"use client";

import { useEffect, useState } from "react";
import { Boxes, Crosshair, FileText, Heart, Key, Plus, Shell, X } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { audio } from "@/lib/game/audio";
import { getEngine } from "@/lib/game/engineRef";
import type { InvSlot, ItemId, Lang, WeaponId } from "@/lib/game/types";

function ItemIcon({ item, lang, className }: { item: ItemId; lang: Lang; className?: string }) {
  const kind = getContent(lang).items[item]?.kind;
  if (item === "food") return <Heart className={className} strokeWidth={1.5} />;
  if (kind === "consumable") return <Plus className={className} strokeWidth={1.5} />;
  if (kind === "key") return <Key className={className} strokeWidth={1.5} />;
  if (kind === "doc") return <FileText className={className} strokeWidth={1.5} />;
  return <Boxes className={className} strokeWidth={1.5} />;
}

function WeaponCard({
  id,
  name,
  owned,
  equipped,
  lang,
  onPick,
}: {
  id: WeaponId;
  name: string;
  owned: boolean;
  equipped: boolean;
  lang: Lang;
  onPick: () => void;
}) {
  const ui = getContent(lang).ui.inventory;
  return (
    <button
      disabled={!owned}
      onClick={onPick}
      className={`kypris-btn relative flex flex-col items-center gap-1 px-4 py-3 text-center ${
        equipped ? "border-amber-500" : ""
      } ${owned ? "text-stone-200" : "cursor-not-allowed text-stone-700 opacity-50"}`}
    >
      {equipped && (
        <span className="absolute -top-2 right-2 rounded-sm border border-amber-500 bg-black px-1.5 text-[10px] text-amber-400">
          {ui.equipped}
        </span>
      )}
      <span className="font-ui text-sm font-bold">{name}</span>
      <span className="text-[10px] text-stone-500">
        {id === "crowbar" ? ui.meleeDesc : id === "pistol" ? ui.pistolDesc : ui.shotgunDesc}
      </span>
    </button>
  );
}

export default function InventoryScreen() {
  const lang = useGame((g) => g.lang);
  const inventory = useGame((g) => g.inventory);
  const hudAmmoPistol = useGame((g) => g.hud.pistolAmmo);
  const hudAmmoShotgun = useGame((g) => g.hud.shotgunAmmo);
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

  const close = () => useGame.getState().setScreen("playing");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        close();
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="kypris-panel kypris-scroll max-h-[86vh] w-[min(920px,94vw)] overflow-y-auto rounded p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 className="font-title text-2xl font-bold text-stone-100">
            {ui.title} — <span className="text-amber-700">{ui.subtitle}</span>
          </h2>
          <div className="flex items-center gap-4">
            <span dir="ltr" className="font-mono text-xs text-stone-500">
              {used}/10
            </span>
            <button
              onClick={close}
              className="kypris-btn rounded p-1.5 text-stone-400 hover:text-stone-100"
              aria-label={ui.closeAria}
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Reserve Ammo Bar */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 border border-stone-800 bg-black/40 px-4 py-2.5">
            <Crosshair className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
            <span className="text-xs text-stone-400">{ui.pistolAmmo}</span>
            <span dir="ltr" className="ms-auto font-mono text-lg font-bold text-stone-200">
              {hudAmmoPistol}
            </span>
          </div>
          <div className="flex items-center gap-3 border border-stone-800 bg-black/40 px-4 py-2.5">
            <Shell className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
            <span className="text-xs text-stone-400">{ui.shotgunAmmo}</span>
            <span dir="ltr" className="ms-auto font-mono text-lg font-bold text-stone-200">
              {hudAmmoShotgun}
            </span>
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-5">
          {inventory.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1.5 border p-2 transition-colors ${
                s
                  ? "border-stone-700 bg-stone-950/60 hover:border-stone-500"
                  : "border-dashed border-stone-800 bg-black/30"
              } ${selected === i ? "border-amber-500" : ""}`}
            >
              {s ? (
                <>
                  <ItemIcon item={s.item} lang={lang} className="h-6 w-6 text-stone-300" />
                  <span className="line-clamp-1 text-center text-[11px] leading-4 text-stone-400">
                    {c.items[s.item]?.name}
                  </span>
                  {s.qty > 1 && (
                    <span
                      dir="ltr"
                      className="absolute left-1 top-1 rounded-sm bg-black/80 px-1 font-mono text-[10px] text-amber-500"
                    >
                      ×{s.qty}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-stone-800">—</span>
              )}
            </button>
          ))}
        </div>

        {/* Details Panel */}
        <div className="mb-5 min-h-[92px] border border-stone-800/80 bg-black/40 p-4">
          {slot && def ? (
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-title text-lg font-bold text-stone-100">{def.name}</p>
                  <span className="rounded-sm border border-stone-700 px-1.5 py-0.5 text-[10px] text-stone-400">
                    {kindLabel[def.kind]}
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-xs leading-6 text-stone-400">{def.desc}</p>
                <p className="mt-1 text-[10px] text-stone-600">
                  {ui.weightLabel} {def.weight}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {def.kind === "consumable" && (
                  <button
                    onClick={onUse}
                    className="kypris-btn px-4 py-2 font-ui text-sm text-emerald-400"
                  >
                    {ui.useBtn}
                  </button>
                )}
                {def.kind === "doc" && (
                  <button
                    onClick={onRead}
                    className="kypris-btn px-4 py-2 font-ui text-sm text-amber-300"
                  >
                    {ui.readBtn}
                  </button>
                )}
                <button
                  onClick={onDrop}
                  className="kypris-btn px-4 py-2 font-ui text-sm text-red-400"
                >
                  {ui.dropBtn}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-600">{ui.selectSlotHint}</p>
          )}
        </div>

        {/* Weapons */}
        <div className="mb-3 grid grid-cols-3 gap-3">
          <WeaponCard
            id="crowbar"
            name={ui.crowbarCard}
            owned
            equipped={equipped === "crowbar"}
            lang={lang}
            onPick={() => pickWeapon("crowbar")}
          />
          <WeaponCard
            id="pistol"
            name={weapons.pistol ? ui.pistolCard : ui.pistolUnowned}
            owned={weapons.pistol}
            equipped={equipped === "pistol"}
            lang={lang}
            onPick={() => pickWeapon("pistol")}
          />
          <WeaponCard
            id="shotgun"
            name={weapons.shotgun ? ui.shotgunCard : ui.shotgunUnowned}
            owned={weapons.shotgun}
            equipped={equipped === "shotgun"}
            lang={lang}
            onPick={() => pickWeapon("shotgun")}
          />
        </div>

        <p className="text-center text-[11px] text-stone-600">
          <span dir="ltr" className="font-mono">
            Tab
          </span>{" "}
          {ui.tabToClose}
        </p>
      </div>
    </div>
  );
}
