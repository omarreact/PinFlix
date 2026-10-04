import { catalogProvider } from "@/src/lib/providers/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function optionalPositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000
    ? parsed
    : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";

  if (!catalogProvider.canHandleId(id)) {
    return Response.json({ error: "Unsupported provider title ID" }, { status: 400 });
  }

  const streams = await catalogProvider.resolveStreams(id, {
    season: optionalPositiveInteger(url.searchParams.get("season")),
    episode: optionalPositiveInteger(url.searchParams.get("episode")),
  });

  if (!streams.length) {
    return Response.json({ error: "Stream not found" }, { status: 404 });
  }

  return Response.json(
    {
      id,
      sources: streams.map((source, sourceIndex) => ({
        protocol: source.protocol,
        priority: source.priority,
        subtitles: source.subtitles ?? [],
        quality: source.quality,
        sourceIndex,
        url: source.url,
      })),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
      },
    },
  );
}
