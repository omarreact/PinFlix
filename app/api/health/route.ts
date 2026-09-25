import { getHealthAggregates, recordSourceResult } from "@/src/lib/iptv/health";
import { getTaxonomySummary } from "@/src/lib/providers/cineplexbd";
import { getLiveProviderHealth } from "@/src/lib/providers/live-tv";

export async function POST(request: Request) {
  const body = await request.json() as {
    channelId?: string;
    sourceIndex?: number;
    success?: boolean;
    latencyMs?: number;
  };

  if (!body.channelId || typeof body.sourceIndex !== "number" || typeof body.success !== "boolean") {
    return Response.json({ error: "Invalid health event" }, { status: 400 });
  }

  recordSourceResult(`${body.channelId}:${body.sourceIndex}`, body.success, body.latencyMs);
  return Response.json({ ok: true });
}

export async function GET() {
  const [cineplexbd, liveTv] = await Promise.all([
    getTaxonomySummary(),
    getLiveProviderHealth(),
  ]);

  return Response.json({
    ok: true,
    service: "pinflix",
    sources: getHealthAggregates(),
    cineplexbd,
    liveTv,
  });
}
