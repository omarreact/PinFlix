import * as cineplexbd from "@/src/lib/providers/cineplexbd";

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

    if (
      upstream.protocol === "http:" &&
      hostname === "vod.cineplexbd.net" &&
      port === "8081"
    ) {
      return `/cineplex-vod${upstream.pathname}${upstream.search}`;
    }

    if (
      upstream.protocol === "http:" &&
      (hostname === "cineplexbd.net" || hostname === "www.cineplexbd.net") &&
      port === "80"
    ) {
      return `/cineplex-origin${upstream.pathname}${upstream.search}`;
    }
  } catch {
    // Guarded proxy fallback is used below.
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";

  if (!id.startsWith("cb-")) {
    return Response.json({ error: "Cineplex title ID required" }, { status: 400 });
  }

  const streams = await cineplexbd.resolveStreams(id, {
    season: optionalPositiveInteger(url.searchParams.get("season")),
    episode: optionalPositiveInteger(url.searchParams.get("episode")),
  });

  if (!streams.length) {
    return Response.json({ error: "Stream not found" }, { status: 404 });
  }

  const sources = streams.flatMap((source, index) => {
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
  });

  return Response.json(
    { id, sources },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      },
    },
  );
}
