import { WatchHistory } from "@/src/components/watch-history";
import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { getHomeSections } from "@/src/lib/providers/moviebox/web";
import type { Entertainment } from "@/src/types/catalog";

export const revalidate = 120;
export const preferredRegion = "sin1";

function uniqueItems(items: Entertainment[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export default async function HomePage() {
  const [homeSections, movieCatalog, seriesCatalog] = await Promise.all([
    getHomeSections().catch(() => []),
    catalogProvider.getLatestPage("movie", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
    catalogProvider.getLatestPage("show", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
  ]);

  const featuredItems = uniqueItems(homeSections.flatMap((section) => section.items));
  const movies = uniqueItems([
    ...featuredItems.filter((item) => item.kind === "movie"),
    ...movieCatalog.items,
  ]).slice(0, 12);
  const series = uniqueItems([
    ...featuredItems.filter((item) => item.kind === "show"),
    ...seriesCatalog.items,
  ]).slice(0, 12);
  const featured = featuredItems[0] ?? movies[0] ?? series[0];

  return (
    <div>
      <HomeHero item={featured} />
      <div className="relative z-20 mx-auto -mt-8 max-w-[1400px] space-y-12 px-6 pb-24 md:-mt-14 md:px-12">
        <Suspense fallback={null}>
          <BrowseTabs active="all" />
        </Suspense>

        <WatchHistory compact />
        {movies.length > 0 && <EntertainmentRail title="Now Streaming Movies" items={movies} href="/movies" />}
        {series.length > 0 && <EntertainmentRail title="Now Streaming Series" items={series} href="/series" />}

        {!featured && (
          <div className="glass-panel rounded-2xl p-7 text-zinc-400">
            <p className="font-bold text-white">Movie catalog temporarily unavailable</p>
            <p className="mt-2 text-sm leading-6">PinFlix could not load playable provider-backed titles. Try again shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
