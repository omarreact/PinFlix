"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { usePinFlixStore } from "@/src/lib/store";
import { entertainment } from "@/src/lib/iptv/catalog";

type ContinueItem = {
  id: string;
  title: string;
  href: string;
  image: string;
  subtitle: string;
  progress: number;
};

const fallbackItems: ContinueItem[] = [
  {
    id: "city-of-glass",
    title: "City of Glass",
    href: "/watch/shoreline",
    image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=900&q=80",
    subtitle: "S1 E5 · 28 min left",
    progress: 0.72,
  },
  {
    id: "red-horizon",
    title: "Red Horizon",
    href: "/watch/the-last-signal",
    image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&q=80",
    subtitle: "1h 14 min left",
    progress: 0.28,
  },
];

function buildItems(
  recent: { id: string; title: string; href: string; image: string; progress?: number }[],
): ContinueItem[] {
  if (!recent.length) return fallbackItems;

  return recent.slice(0, 4).map((item, index) => {
    const match = entertainment.find((entry) => entry.id === item.id || entry.slug === item.id);
    return {
      id: item.id,
      title: item.title,
      href: item.href,
      image: item.image || match?.backdrop || match?.poster || fallbackItems[index % 2]?.image || "",
      subtitle: match?.kind === "show"
        ? `S1 E${Math.min(index + 1, match.episodes ?? 1)} · keep watching`
        : match?.kind === "movie"
          ? `${match.year ?? ""} · ${Math.round((item.progress ?? 0.4) * 100)}% watched`
          : "Continue",
      progress: item.progress ?? (index === 0 ? 0.72 : 0.35),
    };
  });
}

export function ContinueWatching() {
  const recent = usePinFlixStore((state) => state.recent);
  const items = buildItems(recent);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">Continue watching</h2>
        <Link href="/saved" className="tv-focus text-sm font-semibold text-muted hover:text-fg">
          View all
        </Link>
      </div>
      <div className="hide-scrollbar grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="tv-focus group relative overflow-hidden rounded-2xl border border-line bg-panel"
          >
            <div className="relative aspect-[2.4/1] overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
              <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm">
                <Play size={18} fill="currentColor" />
              </span>
            </div>
            <div className="px-4 pb-3 pt-2">
              <h3 className="truncate text-base font-semibold">{item.title}</h3>
              <p className="mt-1 truncate text-sm text-muted">{item.subtitle}</p>
            </div>
            <div className="h-1 w-full bg-white/10">
              <div
                className="h-full rounded-r-full bg-coral"
                style={{ width: `${Math.max(4, Math.min(100, item.progress * 100))}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
