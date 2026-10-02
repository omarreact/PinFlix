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
    <div className="space-y-10 md:space-y-12">
      <HomeHero item={featured} />
      <Suspense fallback={null}>
        <BrowseTabs active="all" />
      </Suspense>

      {movieRail.length > 0 && (
        <EntertainmentRail title="Recently added movies" items={movieRail} href="/movies" />
      )}

      {seriesRail.length > 0 && (
        <EntertainmentRail title="Recently added web series" items={seriesRail} href="/series" />
      )}

      {!featured && (
        <div className="rounded-2xl border border-line bg-surface p-6 text-muted">
          <p className="font-medium text-fg">Catalog temporarily unavailable</p>
          <p className="mt-2 text-sm">
            CineplexBD is not reachable from the current catalog relay. The app is healthy;
            media playback will work once the origin or a Bangladesh-side relay is available.
            Refresh to try again.
          </p>
        </div>
      )}
    </div>
  );
}
