"use client";

import { Music, Speaker, Volume2 } from "lucide-react";
import { audio } from "@/lib/game/audio";
import { useGame } from "@/lib/game/state";
import { saveSettings } from "@/lib/game/save";

type VolKey = "master" | "music" | "sfx";

const ROWS: { key: VolKey; label: string; Icon: typeof Volume2 }[] = [
  { key: "master", label: "الصوت العام", Icon: Volume2 },
  { key: "music", label: "الموسيقى", Icon: Music },
  { key: "sfx", label: "المؤثرات", Icon: Speaker },
];

const sliderClass =
  "h-1.5 w-36 md:w-44 appearance-none rounded-full bg-stone-800 outline-none cursor-pointer " +
  "border border-stone-700/60 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8b1a1a] " +
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-red-950 " +
  "[&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(139,26,26,0.9)] " +
  "[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:bg-[#8b1a1a] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(139,26,26,0.9)]";

/** صف منزلقات الصوت الثلاثة — مستخدم في القائمة الرئيسية وقائمة الإيقاف */
export default function VolumeSliders() {
  const master = useGame((g) => g.settings.master);
  const music = useGame((g) => g.settings.music);
  const sfx = useGame((g) => g.settings.sfx);

  const onChange = (key: VolKey, value: number) => {
    const store = useGame.getState();
    store.setSetting(key, value);
    const s = store.settings;
    audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    saveSettings(s);
  };

  const values: Record<VolKey, number> = { master, music, sfx };

  return (
    <div className="flex flex-col gap-2.5">
      {ROWS.map(({ key, label, Icon }) => (
        <div key={key} className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-stone-500" strokeWidth={1.5} />
          <span className="w-20 text-xs text-stone-400 font-ui">{label}</span>
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
