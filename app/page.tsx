import { Suspense } from "react";
import { ChannelRail, EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { ContinueWatching } from "@/src/components/continue-watching";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { channels as demoChannels, entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as tmdb from "@/src/lib/providers/tmdb";
import { getPublicLiveChannels, toPublicChannel } from "@/src/lib/providers/live-tv";

export default async function HomePage() {
  const [popular, live] = await Promise.all([
    tmdb.isTmdbConfigured()
      ? tmdb.getPopularMovies(1)
      : Promise.resolve({ items: staticEntertainment }),
    getPublicLiveChannels().catch(() => []),
  ]);

  const livePreview = live.length > 0
    ? live.slice(0, 16).map(toPublicChannel)
    : demoChannels;

  const railItems = popular.items.length > 0 ? popular.items.slice(0, 12) : staticEntertainment;

  return (
    <div className="space-y-10 md:space-y-12">
      <HomeHero />
      <ContinueWatching />
      <Suspense fallback={null}>
        <BrowseTabs active="all" />
      </Suspense>
      <ChannelRail title="Live right now" channels={livePreview} href="/browse" />
      <EntertainmentRail title="Popular movies" items={railItems} href="/movies" />
    </div>
  );
}
