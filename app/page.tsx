import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { getHomeSections } from "@/src/lib/providers/moviebox/web";

export const revalidate = 300;

export default async function HomePage() {
  const homeSections = await getHomeSections();
  const homeItems = homeSections.flatMap((section) => section.items);
  const uniqueItems = [...new Map(homeItems.map((item) => [item.id, item])).values()];
  const movieRail = uniqueItems.filter((item) => item.kind === "movie").slice(0, 12);
  const seriesRail = uniqueItems.filter((item) => item.kind === "show").slice(0, 12);
  const featured = uniqueItems[0];

  const sectionLabels = new Set(["trending movies", "trending movie", "top series"]);
  const extraSections = homeSections
    .filter((section) => !sectionLabels.has(section.label.toLowerCase()))
    .slice(0, 12);

  return (
    <div>
      <HomeHero item={featured} />

      <div className="relative z-20 mx-auto -mt-8 max-w-[1400px] space-y-12 px-6 pb-24 md:-mt-14 md:px-12">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Demo Mode active. Only add media you own, have licensed, or are authorized to distribute.
        </div>

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
            <p className="font-bold text-white">Catalog temporarily unavailable</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              PinFlix could not refresh the catalog right now. Try again shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
