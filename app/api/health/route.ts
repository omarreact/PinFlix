import { getMediaEdgeHealth } from "@/src/lib/media-edge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

const H5 = "https://h5-api.aoneroom.com";

async function probe(path: string, init?: RequestInit) {
  const started = Date.now();
  try {
    const response = await fetch(`${H5}${path}`, {
      ...init,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        Origin: "https://movibox.net",
        Referer: "https://movibox.net/",
        ...(init?.headers || {}),
      },
    });
    const text = await response.text();
    let code: number | null = null;
    let itemCount = 0;
    try {
      const json = JSON.parse(text) as {
        code?: number;
        data?: { items?: unknown[]; operatingList?: unknown[] };
      };
      code = typeof json.code === "number" ? json.code : null;
      itemCount = json.data?.items?.length ?? json.data?.operatingList?.length ?? 0;
    } catch {
      /* not json */
    }
    return {
      ok: response.ok && code === 0,
      http: response.status,
      code,
      itemCount,
      ms: Date.now() - started,
      bytes: text.length,
      rateLimited: response.status === 429,
      retryAfter: response.headers.get("retry-after"),
    };
  } catch (error) {
    return {
      ok: false,
      http: 0,
      code: null,
      itemCount: 0,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const [home, filter, mediaEdge] = await Promise.all([
    probe("/wefeed-h5api-bff/home?host=movibox.net&channel=1"),
    probe("/wefeed-h5api-bff/subject/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: 1, perPage: 6, channelId: 1 }),
    }),
    getMediaEdgeHealth(),
  ]);

  const reachable = Boolean(home.ok || filter.ok);
  const rateLimited = Boolean(home.rateLimited || filter.rateLimited);
  const mediaEdgeReachable = Boolean(mediaEdge.ok && mediaEdge.body && typeof mediaEdge.body === "object");

  return Response.json(
    {
      ok: reachable || mediaEdgeReachable,
      degraded: !(reachable && mediaEdgeReachable),
      region: "sin1",
      reason: rateLimited
        ? "moviebox_upstream_rate_limited"
        : reachable || mediaEdgeReachable
          ? null
          : "all_upstreams_unreachable",
      service: "pinflix",
      catalog: {
        provider: "moviebox",
        host: "movibox.net",
        reachable,
      },
      playback: {
        primary: "cloudflare-media-edge",
        fallback: "moviebox",
        host: "movibox.net",
      },
      mediaEdge: {
        provider: "cloudflare-worker-r2",
        reachable: mediaEdgeReachable,
        status: mediaEdge.status,
        baseUrl: mediaEdge.baseUrl,
        body: mediaEdge.body ?? null,
        error: "error" in mediaEdge ? mediaEdge.error : undefined,
      },
      probes: {
        home,
        filter,
      },
    },
    {
      status: reachable || mediaEdgeReachable ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
