// ─────────────────────────────────────────────────────────────
// أدوات مشتركة صغيرة لواجهة «ظلال كيبريس»
// ─────────────────────────────────────────────────────────────

/** ثوانٍ → "M:SS" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
