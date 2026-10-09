import type { SavedTitle } from "./saved";
export type HistoryEntry = SavedTitle & { season?: number; episode?: number; position: number; duration: number; updatedAt: number; completed: boolean };
export const HISTORY_KEY = "pinflix-history-v1";
export function readHistory(): HistoryEntry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string" && Number.isFinite(item.position)) : [];
  } catch { return []; }
}
export function writeHistory(entries: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 100))); window.dispatchEvent(new Event("pinflix:history")); } catch { /* Storage may be disabled. */ }
}
export function saveProgress(entry: HistoryEntry) {
  writeHistory([entry, ...readHistory().filter((item) => !(item.id === entry.id && item.season === entry.season && item.episode === entry.episode))]);
}
export function historyHref(entry: HistoryEntry) {
  const params = new URLSearchParams();
  if (entry.season) params.set("season", String(entry.season));
  if (entry.episode) params.set("episode", String(entry.episode));
  return `/watch/${encodeURIComponent(entry.id)}${params.size ? `?${params}` : ""}`;
}
