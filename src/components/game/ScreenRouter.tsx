"use client";

import { getEngine } from "@/lib/game/engineRef";
import { useGame } from "@/lib/game/state";
import AIDialogue from "./AIDialogue";
import EndScreen from "./EndScreen";
import GalleryScreen from "./GalleryScreen";
import HelpScreen from "./HelpScreen";
import HUD from "./HUD";
import Intro from "./Intro";
import InventoryScreen from "./InventoryScreen";
import MainMenu from "./MainMenu";
import MapScreen from "./MapScreen";
import MissionsScreen from "./MissionsScreen";
import NoteReader from "./NoteReader";
import PauseMenu from "./PauseMenu";

/** موجّه الشاشات — يعرض الطبقة المناسبة حسب حالة اللعبة */
export default function ScreenRouter() {
  const screen = useGame((g) => g.screen);

  switch (screen) {
    case "playing":
      return (
        <>
          <HUD />
          <AIDialogue />
        </>
      );
    case "inventory":
      return <InventoryScreen />;
    case "note":
      return <NoteReader />;
    case "map":
      return <MapScreen />;
    case "missions":
      return <MissionsScreen />;
    case "paused":
      return <PauseMenu />;
    case "ending":
      return <EndScreen />;
    case "menu":
      return <MainMenu />;
    case "intro":
      return (
        <Intro
          onFinish={() => {
            // المحرك قد يعرّف startRun (نسخة أحدث من الواجهة) — نداؤه آمن اختيارياً
            const e = getEngine();
            if (e) (e as unknown as { startRun?: () => void }).startRun?.();
            useGame.getState().setScreen("playing");
          }}
        />
      );
    case "help":
      return <HelpScreen />;
    case "gallery":
      return <GalleryScreen />;
    default:
      return null;
  }
}
