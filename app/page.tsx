import { Suspense } from "react";
import { ChannelRail, EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { ContinueWatching } from "@/src/components/continue-watching";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { channels, entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as tmdb from "@/src/lib/providers/tmdb";

export default async function HomePage() {
  const popular = tmdb.isTmdbConfigured()
    ? await tmdb.getPopularMovies(1)
    : { items: staticEntertainment };

  const railItems = popular.items.length > 0 ? popular.items.slice(0, 12) : staticEntertainment;

  return (
    <div className="space-y-10 md:space-y-12">
      <HomeHero />
      <ContinueWatching />
      <Suspense fallback={null}>
        <BrowseTabs active="all" />
      </Suspense>
      <ChannelRail title="Live right now" channels={channels} href="/browse" />
      <EntertainmentRail title="Popular movies" items={railItems} href="/movies" />
    </div>
  );
}
