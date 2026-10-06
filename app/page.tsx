import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { getHomeSections, getLatestPage } from "@/src/lib/providers/moviebox/web";

export const revalidate = 120;

export default async function HomePage() {
  const [homeSections, latestMovies, latestShows] = await Promise.all([
    getHomeSections().catch(() => []),
    getLatestPage("movie", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
    getLatestPage("show", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
  ]);

  const homeItems = homeSections.flatMap((section) => section.items);
  const uniqueHome = [...new Map(homeItems.map((item) => [item.id, item])).values()];

  let movieRail = uniqueHome.filter((item) => item.kind === "movie").slice(0, 14);
  let seriesRail = uniqueHome.filter((item) => item.kind === "show").slice(0, 14);

  if (movieRail.length < 6 && latestMovies.items.length) {
    movieRail = [...new Map([...movieRail, ...latestMovies.items].map((i) => [i.id, i])).values()].slice(
      0,
      14,
    );
  }
  if (seriesRail.length < 6 && latestShows.items.length) {
    seriesRail = [...new Map([...seriesRail, ...latestShows.items].map((i) => [i.id, i])).values()].slice(
      0,
      14,
    );
  }

  const featured =
    uniqueHome[0] ?? movieRail[0] ?? seriesRail[0] ?? latestMovies.items[0] ?? latestShows.items[0];

  const sectionLabels = new Set([
    "trending movies",
    "trending movie",
    "top series",
    "featured",
    "popular series",
    "popular movie",
  ]);
  const extraSections = homeSections
    .filter((section) => !sectionLabels.has(section.label.toLowerCase()))
    .filter((section) => section.items.length > 0)
    .slice(0, 14);

  const hasCatalog = Boolean(featured) || movieRail.length > 0 || seriesRail.length > 0;

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
          <EntertainmentRail key={section.id} title={section.label} items={section.items} />
        ))}

        {!hasCatalog && (
          <div className="glass-panel rounded-2xl p-7 text-zinc-400">
            <p className="font-bold text-white">Catalog temporarily unavailable</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              PinFlix could not refresh the movibox.net catalog right now. Try again shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
