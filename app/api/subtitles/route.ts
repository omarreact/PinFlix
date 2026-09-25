import { assertSafeUpstream } from "@/src/lib/iptv/proxy-safety";
import { getChannelSource } from "@/src/lib/iptv/sources";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const channelId = params.get("channelId");
  const sourceIndex = Number(params.get("source") ?? "0");
  const trackIndex = Number(params.get("track") ?? "0");
  const source = channelId ? getChannelSource(channelId, sourceIndex) : undefined;
  const track = source?.subtitles?.[trackIndex];
  if (!track) return Response.json({ error: "Subtitle track not found" }, { status: 404 });
  try {
    await assertSafeUpstream(track.url);
    const upstream = await fetch(track.url, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) return Response.json({ error: "Subtitle track unavailable" }, { status: 502 });
    return new Response(upstream.body, { headers: { "Cache-Control": "no-store", "Content-Type": upstream.headers.get("content-type") ?? "text/vtt" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Subtitle request failed" }, { status: 502 });
  }
}
