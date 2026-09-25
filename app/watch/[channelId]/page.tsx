import { notFound } from "next/navigation";
import { BackLink } from "@/src/components/catalog-sections";
import { findChannel, findEntertainment } from "@/src/lib/iptv/catalog";
import { WatchPlayer } from "@/src/components/watch-player";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";
import { getLiveProviderChannel, providerFromChannelId } from "@/src/lib/providers/live-tv";

export default async function WatchPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  let channel = findChannel(channelId);

  if (!channel && providerFromChannelId(channelId)) {
    channel = await getLiveProviderChannel(channelId) || undefined;
  }

  let item = findEntertainment(channelId);
  if (!item && channelId.startsWith("cb-")) {
    item = await cineplexbd.getDetails(channelId) || undefined;
  }

  if (!channel && !item) notFound();

  if (item) {
    return <div className="space-y-6">
      <BackLink href={`/entertainment/${item.slug}`}>Title details</BackLink>
      <WatchPlayer channelId={item.id} posterLabel={item.kind === "movie" ? "🎬" : "📺"} />
      <div>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-brand">Now playing</p>
        <h1 className="mt-2 text-3xl font-black">{item.title}</h1>
        <p className="mt-2 text-muted">{item.synopsis}</p>
      </div>
    </div>;
  }

  if (!channel) notFound();
  return <div className="space-y-6">
    <BackLink href="/browse">Live TV</BackLink>
    <WatchPlayer channelId={channel.id} posterLabel={channel.networkScope === "local" ? "📡" : "📺"} />
    <div>
      <p className="text-sm font-bold uppercase tracking-[.18em] text-brand">
        {channel.networkScope === "local" ? "BDIX / Local channel" : "Live now"}
      </p>
      <h1 className="mt-2 text-3xl font-black">{channel.name}</h1>
      <p className="mt-2 text-muted">{channel.description}</p>
      {channel.networkScope === "local"
        ? <p className="mt-4 text-sm text-warning">This source is only reachable from a compatible local/BDIX network and is intentionally not proxied through Vercel.</p>
        : channel.epg?.now && <p className="mt-4 text-sm text-muted">Now: {channel.epg.now}{channel.epg.next ? ` · Next: ${channel.epg.next}` : ""}</p>}
    </div>
  </div>;
}
