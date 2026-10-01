"use client";

import { useEffect } from "react";
import { FileText, X } from "lucide-react";
import { getContent } from "@/lib/game/content";
import { useGame } from "@/lib/game/state";
import { getEngine } from "@/lib/game/engineRef";
import { audio } from "@/lib/game/audio";

export default function NoteReader() {
  const lang = useGame((g) => g.lang);
  const noteId = useGame((g) => g.noteId);

  const c = getContent(lang);

  useEffect(() => {
    if (noteId) audio.play("paper");
  }, [noteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "KeyE" || e.code === "Space") {
        e.preventDefault();
        useGame.getState().setNote(null);
        useGame.getState().setScreen("playing");
        getEngine()?.resume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!noteId) return null;
  const doc = c.docById[noteId];
  if (!doc) return null;

  const close = () => {
    useGame.getState().setNote(null);
    useGame.getState().setScreen("playing");
    getEngine()?.resume();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="kypris-paper kypris-scroll relative max-h-[85vh] w-[min(680px,92vw)] rotate-[-0.4deg] overflow-y-auto rounded-sm p-8 shadow-2xl">
        <div className="kypris-creep">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block rounded-sm border border-black/25 bg-black/5 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase opacity-75">
                {noteId.toUpperCase()}
              </span>
              <h2 className="mt-1.5 font-title text-2xl font-bold leading-snug">
                {doc.title}
              </h2>
            </div>
            <FileText className="mt-1 h-5 w-5 shrink-0 opacity-45" strokeWidth={1.6} />
          </div>
          <p className="mb-5 mt-2 border-b border-black/20 pb-2.5 font-ui text-xs font-medium opacity-75">
            {doc.location}
          </p>
          <p className="whitespace-pre-line font-title text-lg leading-8">{doc.body}</p>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-black/15 pt-4">
          <p className="font-ui text-[11px] opacity-75">{c.ui.note.footerHint}</p>
          <button
            onClick={close}
            className="flex shrink-0 items-center gap-2 rounded bg-stone-900 px-4 py-2 font-ui text-sm font-semibold text-stone-100 shadow transition-colors hover:bg-stone-800"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            {c.ui.note.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
