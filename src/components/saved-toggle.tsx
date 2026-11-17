"use client";
import { Check, Plus } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  SAVED_KEY,
  readSavedTitles,
  writeSavedTitles,
  type SavedTitle,
} from "@/src/lib/saved";
function subscribe(callback: () => void) {
  window.addEventListener("pinflix:saved", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("pinflix:saved", callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(SAVED_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
export function SavedToggle({
  item,
  className = "secondary",
}: {
  item: SavedTitle;
  className?: string;
}) {
  const data = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const saved =
    data !== "[]" && readSavedTitles().some((entry) => entry.id === item.id);
  function toggle() {
    const current = readSavedTitles();
    writeSavedTitles(
      saved
        ? current.filter((entry) => entry.id !== item.id)
        : [item, ...current],
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-pressed={saved}
    >
      {saved ? <Check size={18} /> : <Plus size={18} />}{" "}
      {saved ? "In My List" : "My List"}
    </button>
  );
}
