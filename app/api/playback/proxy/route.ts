import { proxyUpstreamResponse } from "@/src/lib/iptv/playback-proxy";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const urlParam = params.get("url");

  if (!urlParam) {
    return Response.json({ error: "Missing upstream url param" }, { status: 400 });
  }

  try {
    return await proxyUpstreamResponse(request, new URL(urlParam));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Proxy request failed" }, { status: 502 });
  }
}
