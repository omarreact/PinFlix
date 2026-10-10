import { WatchHistory } from "@/src/components/watch-history";
import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { catalogProvider } from "@/src/lib/providers/catalog";
import type { Entertainment } from "@/src/types/catalog";

export const revalidate = 120;
export const preferredRegion = "sin1";

function uniqueItems(items: Entertainment[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export default async function HomePage() {
  // Render from the two catalog requests shown on this page: no extra home-feed fetch.
  const [movieCatalog, seriesCatalog] = await Promise.all([
    catalogProvider.getLatestPage("movie", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
    catalogProvider.getLatestPage("show", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
  ]);
  const movies = uniqueItems(movieCatalog.items).slice(0, 12);
  const series = uniqueItems(seriesCatalog.items).slice(0, 12);
  const featured = movies[0] ?? series[0];

  return (
    <div>
      <HomeHero item={featured} />
      <div className="relative z-20 pf-container mx-auto space-y-10 pb-16 pt-8">
        <Suspense fallback={null}>
          <BrowseTabs active="all" />
        </Suspense>

        <WatchHistory compact />
        {movies.length > 0 && <EntertainmentRail title="The movie collection" items={movies} href="/movies" />}
        {series.length > 0 && <EntertainmentRail title="Stories in series" items={series} href="/series" />}

        {!featured && (
          <div className="glass-panel rounded-lg p-7 text-zinc-400">
            <p className="font-bold text-white">Movie catalog temporarily unavailable</p>
            <p className="mt-2 text-sm leading-6">PinFlix could not load playable provider-backed titles. Try again shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
