import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { getHomeSections } from "@/src/lib/providers/moviebox/public-web";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [homeSections, latestMovies, latestSeries] = await Promise.all([
    getHomeSections(),
    catalogProvider.getLatestPage("movie", 1),
    catalogProvider.getLatestPage("show", 1),
  ]);

  const movieRail = latestMovies.items.slice(0, 12);
  const seriesRail = latestSeries.items.slice(0, 12);
  const featured =
    homeSections.flatMap((section) => section.items)[0] ??
    movieRail[0] ??
    seriesRail[0];

  const sectionLabels = new Set(["trending movies", "trending movie", "top series"]);
  const extraSections = homeSections
    .filter((section) => !sectionLabels.has(section.label.toLowerCase()))
    .slice(0, 12);

  return (
    <div>
      <HomeHero item={featured} />

      <div className="relative z-20 mx-auto -mt-8 max-w-[1400px] space-y-12 px-6 pb-24 md:-mt-14 md:px-12">
        <Suspense fallback={null}>
          <BrowseTabs active="all" />
        </Suspense>

        {movieRail.length > 0 && (
          <EntertainmentRail title="Trending Movies" items={movieRail} href="/movies" />
        )}

        {seriesRail.length > 0 && (
          <EntertainmentRail title="Trending Series" items={seriesRail} href="/series" />
        )}

        {extraSections.map((section) => (
          <EntertainmentRail
            key={section.id}
            title={section.label}
            items={section.items}
          />
        ))}

        {!featured && (
          <div className="glass-panel rounded-2xl p-7 text-zinc-400">
            <p className="font-bold text-white">MovieBox catalog temporarily unavailable</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              PinFlix could not refresh MovieBox right now. Try again shortly or check{" "}
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
