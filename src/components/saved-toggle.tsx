"use client";

import { Bookmark, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { readSavedTitles, writeSavedTitles, type SavedTitle } from "@/src/lib/saved";

export function SavedToggle({ item }: { item: SavedTitle }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const nextSaved = readSavedTitles().some((entry) => entry.id === item.id);
    const timer = window.setTimeout(() => setSaved(nextSaved), 0);
    return () => window.clearTimeout(timer);
  }, [item.id]);

  function toggle() {
    const current = readSavedTitles();
    const exists = current.some((entry) => entry.id === item.id);
    const next = exists ? current.filter((entry) => entry.id !== item.id) : [item, ...current];
    writeSavedTitles(next);
    setSaved(!exists);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="tv-focus inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/10"
      aria-pressed={saved}
    >
      {saved ? <Check size={18} /> : <Bookmark size={18} />}
      {saved ? "In My List" : "Add to My List"}
    </button>
  );
}
