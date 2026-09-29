"use client";

import { Globe, Music, Speaker, Volume2 } from "lucide-react";
import { audio } from "@/lib/game/audio";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { saveSettings } from "@/lib/game/save";

type VolKey = "master" | "music" | "sfx";

const sliderClass =
  "h-1.5 w-36 md:w-44 appearance-none rounded-full bg-stone-800 outline-none cursor-pointer " +
  "border border-stone-700/60 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8b1a1a] " +
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-red-950 " +
  "[&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(139,26,26,0.9)] " +
  "[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:bg-[#8b1a1a] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(139,26,26,0.9)]";

export default function VolumeSliders() {
  const lang = useGame((g) => g.lang);
  const setLang = useGame((g) => g.setLang);
  const master = useGame((g) => g.settings.master);
  const music = useGame((g) => g.settings.music);
  const sfx = useGame((g) => g.settings.sfx);

  const c = getContent(lang);
  const rows: { key: VolKey; label: string; Icon: typeof Volume2 }[] = [
    { key: "master", label: c.ui.volume.master, Icon: Volume2 },
    { key: "music", label: c.ui.volume.music, Icon: Music },
    { key: "sfx", label: c.ui.volume.sfx, Icon: Speaker },
  ];

  const onChange = (key: VolKey, value: number) => {
    const store = useGame.getState();
    store.setSetting(key, value);
    const s = useGame.getState().settings;
    audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    saveSettings({ ...s, lang });
  };

  const onSelectLang = (nextLang: "en" | "ar") => {
    audio.init();
    audio.play("ui_click");
    setLang(nextLang);
    const s = useGame.getState().settings;
    saveSettings({ ...s, lang: nextLang });
  };

  const values: Record<VolKey, number> = { master, music, sfx };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Language Switcher */}
      <div className="mb-1 flex items-center justify-between gap-3 border-b border-stone-800/70 pb-2.5">
        <div className="flex items-center gap-2 text-xs text-stone-400 font-ui">
          <Globe className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
          <span>{c.ui.menu.langLabel}</span>
        </div>
        <div className="flex items-center gap-1.5" dir="ltr">
          <button
            type="button"
            onClick={() => onSelectLang("en")}
            className={`rounded border px-3 py-1 font-ui text-xs transition ${
              lang === "en"
                ? "border-amber-600/80 bg-amber-950/50 text-amber-200 shadow-[0_0_12px_rgba(180,100,20,0.3)]"
                : "border-stone-800 bg-black/50 text-stone-400 hover:border-stone-600 hover:text-stone-200"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onSelectLang("ar")}
            className={`rounded border px-3 py-1 font-ui text-xs transition ${
              lang === "ar"
                ? "border-amber-600/80 bg-amber-950/50 text-amber-200 shadow-[0_0_12px_rgba(180,100,20,0.3)]"
                : "border-stone-800 bg-black/50 text-stone-400 hover:border-stone-600 hover:text-stone-200"
            }`}
          >
            العربية
          </button>
        </div>
      </div>

      {rows.map(({ key, label, Icon }) => (
        <div key={key} className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
          <span className="w-24 text-xs text-stone-400 font-ui">{label}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={values[key]}
            onChange={(e) => onChange(key, Number(e.target.value))}
            className={sliderClass}
            aria-label={label}
          />
          <span dir="ltr" className="w-8 text-[10px] text-stone-600 font-mono text-left">
            {Math.round(values[key] * 100)}
          </span>
        </div>
      ))}
    </div>
  );
}
