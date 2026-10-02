import { Suspense } from "react";
import { ChannelRail, EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { ContinueWatching } from "@/src/components/continue-watching";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { channels as demoChannels, entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";
import * as tmdb from "@/src/lib/providers/tmdb";
import { getPublicLiveChannels, toPublicChannel } from "@/src/lib/providers/live-tv";

export default async function HomePage() {
  const [latestMovies, latestSeries, fallbackMovies, fallbackSeries, live] = await Promise.all([
    cineplexbd.getLatestPage("movie", 1),
    cineplexbd.getLatestPage("show", 1),
    tmdb.isTmdbConfigured()
      ? tmdb.getPopularMovies(1)
      : Promise.resolve({ items: staticEntertainment.filter((item) => item.kind === "movie") }),
    tmdb.isTmdbConfigured()
      ? tmdb.getPopularTv(1)
      : Promise.resolve({ items: staticEntertainment.filter((item) => item.kind === "show") }),
    getPublicLiveChannels().catch(() => []),
  ]);

  const livePreview = live.length > 0
    ? live.slice(0, 16).map(toPublicChannel)
    : demoChannels;

  const movieRail = (latestMovies.items.length > 0 ? latestMovies.items : fallbackMovies.items).slice(0, 12);
  const seriesRail = (latestSeries.items.length > 0 ? latestSeries.items : fallbackSeries.items).slice(0, 12);

  return (
    <div className="space-y-10 md:space-y-12">
      <HomeHero />
      <ContinueWatching />
      <Suspense fallback={null}>
        <BrowseTabs active="all" />
      </Suspense>
      <EntertainmentRail title="Recently added movies" items={movieRail} href="/movies" />
      <EntertainmentRail title="Recently added series" items={seriesRail} href="/series" />
      <ChannelRail title="Live right now" channels={livePreview} href="/browse" />
    </div>
  );
}
