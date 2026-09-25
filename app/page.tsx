import { Suspense } from "react";
import { ChannelRail, EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { ContinueWatching } from "@/src/components/continue-watching";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { channels, entertainment } from "@/src/lib/iptv/catalog";

export default function HomePage() {
  return (
    <div className="space-y-10 md:space-y-12">
      <HomeHero />
      <ContinueWatching />
      <Suspense fallback={null}>
        <BrowseTabs active="all" />
      </Suspense>
      <ChannelRail title="Live right now" channels={channels} href="/browse" />
      <EntertainmentRail title="Movies & Shows" items={entertainment} href="/movies" />
    </div>
  );
}
