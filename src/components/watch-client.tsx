"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ListVideo, Loader2 } from "lucide-react";
import { WatchPlayer } from "@/src/components/watch-player";
import { catalogProvider } from "@/src/lib/providers/catalog";
import type { Entertainment } from "@/src/types/catalog";
import type { SeriesNavigation } from "@/src/lib/providers/contracts";

function seriesHref(mediaId: string, season: number, episode: number) {
  const params = new URLSearchParams({
    season: String(season),
    episode: String(episode),
  });
  return `/watch/${encodeURIComponent(mediaId)}?${params.toString()}`;
}

export function WatchClient({
  mediaId,
  requestedSeason,
  requestedEpisode,
}: {
  mediaId: string;
  requestedSeason: number;
  requestedEpisode: number;
}) {
  const router = useRouter();
  const [item, setItem] = useState<Entertainment | null>(null);
  const [navigation, setNavigation] = useState<SeriesNavigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        if (!catalogProvider.canHandleId(mediaId)) {
          setError(true);
          return;
        }
        const details = await catalogProvider.getDetails(mediaId);
        if (!details) {
          setError(true);
          return;
        }
        setItem(details);
        if (details.kind === "show") {
          const nav = await catalogProvider.getSeriesNavigation(details.id, requestedSeason);
          setNavigation(nav);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [mediaId, requestedSeason]);

  if (error) {
    // Note: client components can't trigger nextjs notFound() natively in render well,
    // so we just show an error state
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg text-white">
        <h1 className="text-3xl font-bold">404 - Not Found</h1>
        <p className="mt-4 text-zinc-400">The requested title could not be found.</p>
        <Link href="/" className="mt-8 rounded-full bg-accent px-6 py-2 font-bold text-bg">
          Go Home
        </Link>
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
      </div>
    );
  }

  const isSeries = item.kind === "show";
  const season = navigation?.season ?? requestedSeason;
  const episode = navigation
    ? Math.min(requestedEpisode, Math.max(1, navigation.episodes))
    : requestedEpisode;
  const nextHref =
    navigation && episode < navigation.episodes
      ? seriesHref(item.id, season, episode + 1)
      : undefined;
  const subtitle = isSeries ? `Season ${season} · Episode ${episode}` : item.year ? String(item.year) : undefined;

  return (
    <div className="min-h-screen bg-bg text-white">
      <WatchPlayer
        mediaId={item.id}
        title={item.title}
        subtitle={subtitle}
        backHref={`/entertainment/${item.slug}`}
        nextHref={nextHref}
        season={isSeries ? season : undefined}
        episode={isSeries ? episode : undefined}
        historyItem={{ slug: item.slug, kind: item.kind, poster: item.poster, year: item.year, genres: item.genres }}
      />

      <div className="mx-auto max-w-[1400px] space-y-8 px-5 py-8 sm:px-8 md:px-12 md:py-12">
        {navigation && (navigation.seasons.length > 1 || navigation.episodes > 1) && (
          <section className="glass-panel rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <ListVideo size={18} className="text-accent" />
              <h2 className="font-bold">Episodes</h2>
            </div>
            
            {navigation.seasons.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {navigation.seasons.map((s) => (
                  <Link
                    key={s}
                    href={seriesHref(item.id, s, 1)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                      s === season
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    Season {s}
                  </Link>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {Array.from({ length: navigation.episodes }).map((_, i) => {
                const ep = i + 1;
                const active = ep === episode;
                return (
                  <Link
                    key={ep}
                    href={seriesHref(item.id, season, ep)}
                    className={`flex items-center justify-center rounded-xl border p-3 text-sm font-medium transition-all ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {active ? "Playing" : `Episode ${ep}`}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h1 className="text-2xl font-bold">{item.title}</h1>
          {item.synopsis && (
            <p className="max-w-4xl text-sm leading-relaxed text-zinc-400">
              {item.synopsis}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
