import type { SaveData } from "./types";

const KEY = "kypris_save_v1";
const ENDINGS_KEY = "kypris_endings_v1";
const SETTINGS_KEY = "kypris_settings_v1";

export function saveCheckpoint(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadCheckpoint(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (!d || typeof d.hp !== "number" || !Array.isArray(d.inventory)) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearCheckpoint() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function hasCheckpoint(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function getUnlockedEndings(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ENDINGS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function unlockEnding(id: string): string[] {
  const list = getUnlockedEndings();
  if (!list.includes(id)) list.push(id);
  try {
    localStorage.setItem(ENDINGS_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
  return list;
}

export function loadSettings(): { master: number; music: number; sfx: number; hints: boolean } | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSettings(s: { master: number; music: number; sfx: number; hints: boolean }) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}
