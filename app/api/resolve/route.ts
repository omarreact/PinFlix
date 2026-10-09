import { catalogProvider } from "@/src/lib/providers/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

function optionalPositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : undefined;
}

function proxiedStreamUrl(id: string, rawUrl: string, season: number, episode: number) {
  const params = new URLSearchParams({
    id,
    url: rawUrl,
    season: String(season),
    episode: String(episode),
  });
  return `/api/proxy-stream?${params.toString()}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  const season = optionalPositiveInteger(url.searchParams.get("season")) ?? 0;
  const episode = optionalPositiveInteger(url.searchParams.get("episode")) ?? 0;

  if (!catalogProvider.canHandleId(id)) {
    return Response.json({ error: "Unsupported provider title ID" }, { status: 400 });
  }

  const streams = await catalogProvider.resolveStreams(id, {
    season: season || undefined,
    episode: episode || undefined,
  });

  if (!streams.length) {
    return Response.json({ error: "Stream not found" }, { status: 404 });
  }

  return Response.json(
    {
      id,
      sources: streams.map((source, sourceIndex) => {
        const shouldProxy =
          id.startsWith("mb-") && (source.protocol === "native" || source.protocol === "hls");
        const streamUrl = shouldProxy ? proxiedStreamUrl(id, source.url, season, episode) : source.url;

        return {
          protocol: source.protocol,
          priority: source.priority,
          subtitles: source.subtitles ?? [],
          quality: source.quality,
          sourceIndex,
          url: streamUrl,
        };
      }),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      },
    },
  );
}
