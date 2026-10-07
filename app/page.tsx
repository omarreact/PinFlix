import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { getTmdbTrending } from "@/src/lib/tmdb";

export const revalidate = 120;

export default async function HomePage() {
  const trending = await getTmdbTrending().catch(() => []);
  const movies = trending.filter((item) => item.kind === "movie").slice(0, 12);
  const series = trending.filter((item) => item.kind === "show").slice(0, 12);
  const featured = trending[0];

  return (
    <div>
      <HomeHero item={featured} />
      <div className="relative z-20 mx-auto -mt-8 max-w-[1400px] space-y-12 px-6 pb-24 md:-mt-14 md:px-12">
        <Suspense fallback={null}>
          <BrowseTabs active="all" />
        </Suspense>

        {movies.length > 0 && <EntertainmentRail title="Trending Movies" items={movies} href="/movies" />}
        {series.length > 0 && <EntertainmentRail title="Trending Series" items={series} href="/series" />}

        {!featured && (
          <div className="glass-panel rounded-2xl p-7 text-zinc-400">
            <p className="font-bold text-white">TMDB catalog temporarily unavailable</p>
            <p className="mt-2 text-sm leading-6">PinFlix could not refresh metadata right now. Try again shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
