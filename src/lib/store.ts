"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RecentItem } from "@/src/types/media";

type PinFlixStore = {
  favorites: string[];
  recent: RecentItem[];
  toggleFavorite: (id: string) => void;
  addRecent: (item: RecentItem) => void;
};

export const usePinFlixStore = create<PinFlixStore>()(persist((set) => ({
  favorites: [],
  recent: [],
  toggleFavorite: (id) => set((state) => ({ favorites: state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [...state.favorites, id] })),
  addRecent: (item) => set((state) => ({ recent: [item, ...state.recent.filter((entry) => entry.id !== item.id)].slice(0, 12) })),
}), { name: "pinflix-local" }));
