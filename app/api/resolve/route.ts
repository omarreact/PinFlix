import { getRankedChannelSources } from "@/src/lib/iptv/sources";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";
import { providerFromChannelId, resolveLiveProviderChannel } from "@/src/lib/providers/live-tv";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("channelId");
  if (!id) return Response.json({ error: "Channel ID required" }, { status: 400 });

  if (id.startsWith("cb-")) {
    const streams = await cineplexbd.resolveStreams(id);
    if (!streams.length) return Response.json({ error: "Stream not found" }, { status: 404 });

    return Response.json({
      channelId: id,
      sources: streams.map((source, index) => ({
        quality: source.quality,
        protocol: source.protocol,
        priority: source.priority,
        sourceIndex: index,
        url: `/api/playback/proxy?url=${encodeURIComponent(source.url)}`,
        subtitles: [],
      })),
    });
  }

  if (providerFromChannelId(id)) {
    const stream = await resolveLiveProviderChannel(id);
    if (!stream) return Response.json({ error: "Live channel not found" }, { status: 404 });

    if (stream.networkScope === "local") {
      return Response.json({
        code: "LOCAL_NETWORK_ONLY",
        error: "This channel is only available from a compatible local/BDIX network.",
      }, { status: 409 });
    }

    return Response.json({
      channelId: id,
      sources: [{
        quality: stream.quality,
        protocol: stream.protocol,
        priority: 1,
        sourceIndex: 0,
        url: `/api/live/proxy?channelId=${encodeURIComponent(id)}`,
        subtitles: [],
      }],
    });
  }

  const rankedSources = getRankedChannelSources(id);
  if (!rankedSources.length) return Response.json({ error: "Channel not found" }, { status: 404 });

  return Response.json({
    channelId: id,
    sources: rankedSources.map(({ source, sourceIndex }) => ({
      quality: source.quality,
      protocol: source.protocol,
      priority: source.priority,
      sourceIndex,
      url: `/api/proxy?channelId=${encodeURIComponent(id)}&source=${sourceIndex}`,
      subtitles: source.subtitles?.map((track, index) => ({
        label: track.label,
        language: track.language,
        url: `/api/subtitles?channelId=${encodeURIComponent(id)}&source=${sourceIndex}&track=${index}`,
      })),
    })),
  });
}
