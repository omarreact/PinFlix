import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [latestMovies, latestSeries] = await Promise.all([
    cineplexbd.getLatestPage("movie", 1),
    cineplexbd.getLatestPage("show", 1),
  ]);

  const movieRail = latestMovies.items.slice(0, 12);
  const seriesRail = latestSeries.items.slice(0, 12);
  const featured = movieRail[0] ?? seriesRail[0];

  return (
    <div>
      <HomeHero item={featured} />

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

        {!featured && (
          <div className="glass-panel rounded-2xl p-7 text-zinc-400">
            <p className="font-bold text-white">Catalog temporarily unavailable</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              PinFlix could not reach the CineplexBD catalog from this network right now. Browse
              Movies and Series categories (taxonomy still loads from the verified fallback), then
              refresh shortly. Status:{" "}
              <a className="text-accent underline-offset-2 hover:underline" href="/api/cineplexbd/status">
                /api/cineplexbd/status
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
