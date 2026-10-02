"use client";

// ─────────────────────────────────────────────────────────────
// محرك اللعبة — GameEngine (Three.js)
// NOTE: world.ts (city), enemies.ts (AI) are separate modules.
// UI components must ONLY use getEngine() public API below.
// ─────────────────────────────────────────────────────────────
import type { MapSnapshot, WeaponId } from "./types";
import type { CutsceneId } from "./cutscenes";

export type AIChoice = "destroy" | "deal" | "leave";

export interface GameEngineApi {
  startNewGame(): void;
  continueGame(): void;
  startRun(): void;
  pause(): void;
  resume(): void;
  quitToMenu(): void;
  equipWeapon(w: WeaponId | null): void;
  reload(): void;
  getMapSnapshot(): MapSnapshot | null;
  chooseAI(choice: AIChoice): void;
  playCutscene(id: CutsceneId, isTest?: boolean): void;
  skipCutscene(): void;
}

let engine: (GameEngineApi & { dispose(): void }) | null = null;

export function setEngine(e: (GameEngineApi & { dispose(): void }) | null) {
  engine = e;
}

export function getEngine(): (GameEngineApi & { dispose(): void }) | null {
  return engine;
}
