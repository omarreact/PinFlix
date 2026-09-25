import { getRankedChannelSources } from "@/src/lib/iptv/sources";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

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
        // Since we already have full URLs, we can still use the proxy but using direct URL proxying
        // Wait, the regular proxy takes channelId & sourceIndex, which only works for static catalog.
        // We can just return a URL that goes through the direct proxy:
        url: `/api/playback/proxy?url=${encodeURIComponent(source.url)}`,
        subtitles: []
      }))
    });
  }

  const rankedSources = getRankedChannelSources(id);
  if (!rankedSources.length) return Response.json({ error: "Channel not found" }, { status: 404 });
  return Response.json({ channelId: id, sources: rankedSources.map(({ source, sourceIndex }) => ({ quality: source.quality, protocol: source.protocol, priority: source.priority, sourceIndex, url: `/api/proxy?channelId=${encodeURIComponent(id)}&source=${sourceIndex}`, subtitles: source.subtitles?.map((track, index) => ({ label: track.label, language: track.language, url: `/api/subtitles?channelId=${encodeURIComponent(id)}&source=${sourceIndex}&track=${index}` })) })) });
}
