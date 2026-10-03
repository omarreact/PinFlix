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

  const movieRail = latestMovies.items.slice(0, 14);
  const seriesRail = latestSeries.items.slice(0, 14);
  const featured = movieRail[0] ?? seriesRail[0];

  return (
    <div className="space-y-9 sm:space-y-12">
      <HomeHero item={featured} />

      <Suspense fallback={null}>
        <BrowseTabs active="all" />
      </Suspense>

      {movieRail.length > 0 && (
        <EntertainmentRail title="Fresh movies" items={movieRail} href="/movies" />
      )}

      {seriesRail.length > 0 && (
        <EntertainmentRail title="Web series to watch" items={seriesRail} href="/series" />
      )}

      {!featured && (
        <div className="soft-card rounded-2xl p-6 text-muted">
          <p className="font-bold text-slate-900">Catalog temporarily unavailable</p>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            PinFlix could not refresh the entertainment catalog right now. Try again shortly.
          </p>
        </div>
      )}
    </div>
  );
}
