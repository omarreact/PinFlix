import { proxyLiveChannel } from "@/src/lib/providers/live-tv/proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const channelId = url.searchParams.get("channelId")?.trim();
  const resource = url.searchParams.get("resource");

  if (!channelId) {
    return Response.json({ error: "channelId is required" }, { status: 400 });
  }

  try {
    return await proxyLiveChannel(request, channelId, resource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live proxy failed.";
    if (message === "LOCAL_NETWORK_ONLY") {
      return Response.json({
        code: "LOCAL_NETWORK_ONLY",
        error: "This channel is only available from a compatible local/BDIX network.",
      }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 502 });
  }
}
