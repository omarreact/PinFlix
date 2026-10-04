import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { TMDBMediaRow } from "@/src/components/tmdb/media-row";
import { isTMDBConfigured } from "@/src/lib/tmdb/client";
import { getTrendingMovies, getTrendingTV } from "@/src/lib/tmdb/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [latestMovies, latestSeries] = await Promise.all([
    catalogProvider.getLatestPage("movie", 1),
    catalogProvider.getLatestPage("show", 1),
  ]);

  const movieRail = latestMovies.items.slice(0, 12);
  const seriesRail = latestSeries.items.slice(0, 12);
  const featured = movieRail[0] ?? seriesRail[0];

  let tmdbMovies: Awaited<ReturnType<typeof getTrendingMovies>>["results"] = [];
  let tmdbTV: Awaited<ReturnType<typeof getTrendingTV>>["results"] = [];

  if (isTMDBConfigured()) {
    const [movies, tv] = await Promise.allSettled([
      getTrendingMovies("week"),
      getTrendingTV("week"),
    ]);
    if (movies.status === "fulfilled") {
      tmdbMovies = movies.value.results.map((item) => ({ ...item, media_type: "movie" as const }));
    }
    if (tv.status === "fulfilled") {
      tmdbTV = tv.value.results.map((item) => ({ ...item, media_type: "tv" as const }));
    }
  }

  const hasTMDBDiscovery = tmdbMovies.length > 0 || tmdbTV.length > 0;
  const discoveryHero = featured ? undefined : tmdbMovies[0] ?? tmdbTV[0];

  return (
    <div>
      <HomeHero item={featured} discovery={discoveryHero} />

      <div className="relative z-20 mx-auto -mt-8 max-w-[1400px] space-y-12 px-6 pb-24 md:-mt-14 md:px-12">
        <Suspense fallback={null}>
          <BrowseTabs active="all" />
        </Suspense>

        {movieRail.length > 0 && (
          <EntertainmentRail title="Trending movies" items={movieRail} href="/movies" />
        )}

        {seriesRail.length > 0 && (
          <EntertainmentRail title="Series to watch" items={seriesRail} href="/series" />
        )}

        <TMDBMediaRow title="Trending Movies" items={tmdbMovies} />
        <TMDBMediaRow title="Trending Series" items={tmdbTV} />

        {!featured && (
          <div className="glass-panel rounded-2xl p-7 text-zinc-400">
            <p className="font-bold text-white">Playback catalog temporarily unavailable</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              {hasTMDBDiscovery
                ? "TMDB discovery remains available above while the playback catalog source is offline."
                : "PinFlix could not refresh its playback catalog right now. Try again shortly."}{" "}
              Status:{" "}
              <a className="text-accent underline-offset-2 hover:underline" href="/api/health">
                /api/health
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
