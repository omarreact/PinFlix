export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      itemCount =
        json.data?.items?.length ?? json.data?.operatingList?.length ?? 0;
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
  const [home, filter] = await Promise.all([
    probe("/wefeed-h5api-bff/home?host=movibox.net&channel=1"),
    probe("/wefeed-h5api-bff/subject/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: 1, perPage: 6, channelId: 1 }),
    }),
  ]);

  const reachable = Boolean(home.ok || filter.ok);

  return Response.json(
    {
      ok: true,
      service: "pinflix",
      catalog: {
        provider: "moviebox",
        host: "movibox.net",
        reachable,
      },
      playback: {
        provider: "moviebox",
        host: "movibox.net",
      },
      probes: {
        home,
        filter,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
