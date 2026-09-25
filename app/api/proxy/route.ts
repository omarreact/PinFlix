import { proxyUpstreamResponse } from "@/src/lib/iptv/playback-proxy";
import { getChannelSource, resolveChannel } from "@/src/lib/iptv/sources";
import { recordSourceResult } from "@/src/lib/iptv/health";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const urlParam = params.get("url");
  const id = params.get("channelId");
  const sourceIndex = Number(params.get("source") ?? "0");

  if (urlParam) {
    try {
      return await proxyUpstreamResponse(request, new URL(urlParam));
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Proxy request failed" }, { status: 502 });
    }
  }

  const channel = id ? resolveChannel(id) : undefined;
  const source = id ? getChannelSource(id, sourceIndex) : undefined;
  if (!channel || !source) return Response.json({ error: "Stream source not found" }, { status: 404 });
  const started = Date.now();

  try {
    const asset = params.get("asset");
    const upstreamUrl = asset ? new URL(asset, source.url) : new URL(source.url);
    if (upstreamUrl.origin !== new URL(source.url).origin) throw new Error("Stream asset origin is not allowed.");
    const response = await proxyUpstreamResponse(request, upstreamUrl);
    recordSourceResult(`${channel.id}:${sourceIndex}`, true, Date.now() - started);
    return response;
  } catch (error) {
    recordSourceResult(`${channel.id}:${sourceIndex}`, false, Date.now() - started);
    return Response.json({ error: error instanceof Error ? error.message : "Proxy request failed" }, { status: 502 });
  }
}
