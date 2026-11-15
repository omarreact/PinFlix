import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";
import { getCineplexStatusSummary } from "@/src/lib/providers/cineplexbd";
import {
  hasCineplexGateway,
  probeCineplexGateway,
} from "@/src/lib/providers/cineplexbd/gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


const KNOWN_GATEWAY_PROBES = [
  { url: "http://pinflix-http.pincodeit.com/" },
  { url: "http://pinflix-http.pincodeit.com/pinflix-http-cpanel/" },
  { url: "http://pinflix-http.pincodeit.com/pinflix-api/status.php" },
  { url: "http://pinflix-http.pincodeit.com/api.php?action=health" },
  { url: "http://pinflix-http.pincodeit.com/site/api.php?action=health" },
  { url: "http://pinflix-http.pincodeit.com/_ebn/health" },
  { url: "http://pinflix-http.pincodeit.com/ebn-host-live/_ebn/health" },
  {
    url: "http://pinflix-http.pincodeit.com/api/catalogue/?kind=movie&q=Inception&page=1",
  },
  {
    url: "http://pinflix-http.pincodeit.com/pinflix-http-cpanel/api/catalogue/?kind=movie&q=Inception&page=1",
  },
  {
    url: "http://115.187.18.87/",
    host: "test.pincodeit.com",
  },
  {
    url: "http://115.187.18.87/ebn-host-live/_ebn/health",
    host: "test.pincodeit.com",
  },
  {
    url: "http://115.187.18.87/ebn-host-live/api/catalogue/?kind=movie&q=Inception&page=1",
    host: "test.pincodeit.com",
  },
] as const;

async function responseFingerprint(response: Response) {
  const type = response.headers.get("content-type") || "";
  if (!/(?:text\/html|application\/json|text\/plain)/i.test(type)) {
    await response.body?.cancel();
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < 8_192) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        size += value.byteLength;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const bytes = new Uint8Array(Math.min(size, 8_192));
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = bytes.length - offset;
    if (remaining <= 0) break;
    const slice = chunk.subarray(0, remaining);
    bytes.set(slice, offset);
    offset += slice.length;
  }
  const text = new TextDecoder().decode(bytes).replace(/\s+/g, " ").trim();
  const title = text.match(/<title[^>]*>([^<]{1,160})<\/title>/i)?.[1]?.trim();
  const hints = [...text.matchAll(/(?:href|src)=["']([^"'#]{1,240})["']/gi)]
    .map((match) => match[1])
    .filter((value) => /(?:api|pinflix|ebn|next)/i.test(value))
    .slice(0, 8);

  return {
    ...(title ? { title } : {}),
    ...(hints.length ? { hints } : {}),
    prefix: text.slice(0, 180),
  };
}

async function probeKnownGatewayPaths() {
  return Promise.all(
    KNOWN_GATEWAY_PROBES.map(async (probe) => {
      const url = new URL(probe.url);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4_500);
      try {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
            "User-Agent": "PinFlix/1.0 gateway diagnostic",
            ...("host" in probe ? { Host: probe.host } : {}),
          },
          cache: "no-store",
          redirect: "manual",
          signal: controller.signal,
        });
        const fingerprint = await responseFingerprint(response);
        const location = response.headers.get("location");
        return {
          path: url.pathname + url.search,
          ...("host" in probe ? { hostHeader: probe.host } : {}),

          status: response.status,
          contentType: response.headers.get("content-type"),
          location:
            location && location.length < 300 ? location : null,
          reachable: true,
          ...(fingerprint ? { fingerprint } : {}),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        return {
          path: url.pathname + url.search,
          ...("host" in probe ? { hostHeader: probe.host } : {}),
          status: null,
          contentType: null,
          location: null,
          reachable: false,
          outcome:
            message.includes("timeout") || message.includes("aborted")
              ? "timeout"
              : message.includes("resolve") ||
                  message.includes("getaddrinfo") ||
                  message.includes("dns")
                ? "dns_error"
                : "network_error",
        };
      } finally {
        clearTimeout(timer);
      }
    }),
  );
}

export async function GET(request: Request) {
  const gatewayConfigured = hasCineplexGateway();
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  const [gateway, summary, direct, candidates] = await Promise.all([
    probeCineplexGateway(),
    getCineplexStatusSummary(),
    gatewayConfigured
      ? Promise.resolve({
          reachable: false,
          status: null,
          latencyMs: 0,
          outcome: "skipped_gateway_preferred" as const,
        })
      : probeCineplexConnectivity(),
    deep ? probeKnownGatewayPaths() : Promise.resolve(undefined),
  ]);

  const liveThroughGateway =
    gateway.configured && gateway.reachable && gateway.providerLive;
  const liveDirect =
    direct.reachable && direct.status !== null && direct.status < 500;

  return Response.json(
    {
      ok: liveThroughGateway || liveDirect,
      provider: "cineplexbd",
      transport: gatewayConfigured ? "ebn-gateway" : "direct",
      upstream: "http://cineplexbd.net",
      gateway,
      direct,
      taxonomy: {
        source: summary.taxonomySource,
        categories: summary.categories,
        navigation: summary.navigation,
      },
      ...(candidates ? { candidatePaths: candidates } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
