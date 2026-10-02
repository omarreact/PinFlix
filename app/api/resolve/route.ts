import { getRankedChannelSources } from "@/src/lib/iptv/sources";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";
import { providerFromChannelId, resolveLiveProviderChannel } from "@/src/lib/providers/live-tv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function optionalPositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000
    ? parsed
    : undefined;
}

function toCineplexRewriteUrl(value: string) {
  try {
    const upstream = new URL(value);
    const hostname = upstream.hostname.toLowerCase();
    const port = upstream.port || (upstream.protocol === "https:" ? "443" : "80");

    if (upstream.protocol === "http:" && hostname === "vod.cineplexbd.net" && port === "8081") {
      return `/cineplex-vod${upstream.pathname}${upstream.search}`;
    }

    if (upstream.protocol === "http:" && hostname === "cineplexbd.net" && port === "80") {
      return `/cineplex-origin${upstream.pathname}${upstream.search}`;
    }
  } catch {
    // Fall back to the guarded application proxy for non-standard sources.
  }

  return null;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("channelId");
  if (!id) return Response.json({ error: "Channel ID required" }, { status: 400 });

  if (id.startsWith("cb-")) {
    const url = new URL(request.url);
    const streams = await cineplexbd.resolveStreams(id, {
      season: optionalPositiveInteger(url.searchParams.get("season")),
      episode: optionalPositiveInteger(url.searchParams.get("episode")),
    });
    if (!streams.length) return Response.json({ error: "Stream not found" }, { status: 404 });

    return Response.json({
      channelId: id,
      sources: streams.flatMap((source, index) => {
        const rewriteUrl = toCineplexRewriteUrl(source.url);
        const proxyUrl = `/api/playback/proxy?url=${encodeURIComponent(source.url)}`;
        const base = {
          protocol: source.protocol,
          priority: source.priority,
          subtitles: [],
        };

        if (!rewriteUrl) {
          return [{
            ...base,
            quality: source.quality,
            sourceIndex: index,
            url: proxyUrl,
          }];
        }

        return [
          {
            ...base,
            quality: `${source.quality} · Direct HTTPS`,
            sourceIndex: index * 2,
            url: rewriteUrl,
          },
          {
            ...base,
            quality: `${source.quality} · Proxy fallback`,
            priority: source.priority + 1,
            sourceIndex: index * 2 + 1,
            url: proxyUrl,
          },
        ];
      }),
    }, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      },
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
