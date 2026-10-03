export type SavedTitle = {
  id: string;
  slug: string;
  title: string;
  kind: "movie" | "show";
  poster?: string;
  year?: number;
  genres?: string[];
};

export const SAVED_KEY = "pinflix_saved_v1";

export function readSavedTitles(): SavedTitle[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeSavedTitles(items: SavedTitle[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("pinflix:saved"));
}
