import { getHealthAggregates } from "@/src/lib/iptv/health";
import { recordSourceResult } from "@/src/lib/iptv/health";

export async function POST(request: Request) {
  const body = await request.json() as { channelId?: string; sourceIndex?: number; success?: boolean; latencyMs?: number };
  if (!body.channelId || typeof body.sourceIndex !== "number" || typeof body.success !== "boolean") return Response.json({ error: "Invalid health event" }, { status: 400 });
  recordSourceResult(`${body.channelId}:${body.sourceIndex}`, body.success, body.latencyMs);
  return Response.json({ ok: true });
}

export function GET() { return Response.json({ ok: true, service: "pinflix", sources: getHealthAggregates() }); }
