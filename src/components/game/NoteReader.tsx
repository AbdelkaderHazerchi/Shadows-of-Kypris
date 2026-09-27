"use client";

import { useEffect } from "react";
import { FileText, X } from "lucide-react";
import { DOC_BY_ID } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { audio } from "@/lib/game/audio";

/** قارئ الوثائق — ورقة قديمة تُعرض فوق المشهد */
export default function NoteReader() {
  const noteId = useGame((g) => g.noteId);

  useEffect(() => {
    if (noteId) audio.play("paper");
  }, [noteId]);

  if (!noteId) return null;
  const doc = DOC_BY_ID[noteId];
  if (!doc) return null;

  const close = () => {
    useGame.getState().setNote(null);
    useGame.getState().setScreen("playing");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="kypris-paper kypris-scroll max-h-[84vh] w-[min(680px,92vw)] rotate-[-0.5deg] overflow-y-auto rounded p-8 shadow-2xl">
        <div className="kypris-creep">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-title text-2xl font-bold leading-snug">{doc.title}</h2>
            <FileText className="mt-1 h-5 w-5 shrink-0 opacity-40" strokeWidth={1.5} />
          </div>
          <p className="mb-4 mt-2 border-b border-black/20 pb-2 text-xs opacity-70">{doc.location}</p>
          <p className="whitespace-pre-line font-title text-lg leading-8">{doc.body}</p>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-black/15 pt-4">
          <p className="text-[10px] opacity-60">ملاحظة: الوثائق تفتح نهايات خفية</p>
          <button
            onClick={close}
            className="flex items-center gap-2 rounded bg-stone-800 px-4 py-2 font-ui text-sm text-stone-100 transition-colors hover:bg-stone-700"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
