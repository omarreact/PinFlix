"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChannelCard } from "@/src/components/channel-card";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { channels, entertainment } from "@/src/lib/iptv/catalog";
import { usePinFlixStore } from "@/src/lib/store";

export default function SavedPage() {
  const favorites = usePinFlixStore((state) => state.favorites);
  const recent = usePinFlixStore((state) => state.recent);
  const favoriteChannels = useMemo(() => channels.filter((channel) => favorites.includes(channel.id)), [favorites]);
  const favoriteEntertainment = useMemo(() => entertainment.filter((item) => favorites.includes(item.id)), [favorites]);
  return <div className="space-y-10"><div><Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Home</Link><h1 className="mt-6 text-3xl font-black">My List</h1><p className="mt-2 text-muted">Your favorites and recently watched items.</p></div><section><h2 className="mb-4 text-xl font-bold">Favorites</h2>{favoriteChannels.length || favoriteEntertainment.length ? <div className="space-y-6">{favoriteChannels.length > 0 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favoriteChannels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}</div>}{favoriteEntertainment.length > 0 && <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{favoriteEntertainment.map((item) => <EntertainmentCard key={item.id} item={item} />)}</div>}</div> : <EmptyState title="Your list is empty" body="Save channels and stories to find them here." />}</section><section><h2 className="mb-4 text-xl font-bold">Recent</h2>{recent.length ? <div className="grid gap-3 sm:grid-cols-2">{recent.map((item) => <Link key={item.id} href={item.href} className="tv-focus rounded-2xl border border-line bg-surface p-4 font-semibold">{item.title}<span className="mt-1 block text-xs font-normal text-muted">{item.kind}</span></Link>)}</div> : <EmptyState title="Nothing watched yet" body="Start watching to build your recent list." />}</section></div>;
}
