import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";
import { getCineplexStatusSummary } from "@/src/lib/providers/cineplexbd";
import {
  hasCineplexGateway,
  probeCineplexGateway,
} from "@/src/lib/providers/cineplexbd/gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


const KNOWN_GATEWAY_PROBES = [
  "http://pinflix-http.pincodeit.com/",
  "http://pinflix-http.pincodeit.com/pinflix-http-cpanel/",
  "http://pinflix-http.pincodeit.com/pinflix-api/status.php",
  "http://pinflix-http.pincodeit.com/api.php?action=health",
  "http://pinflix-http.pincodeit.com/site/api.php?action=health",
  "http://pinflix-http.pincodeit.com/_ebn/health",
  "http://pinflix-http.pincodeit.com/ebn-host-live/_ebn/health",
  "http://pinflix-http.pincodeit.com/api/catalogue/?kind=movie&q=Inception&page=1",
  "http://pinflix-http.pincodeit.com/pinflix-http-cpanel/api/catalogue/?kind=movie&q=Inception&page=1",
] as const;

async function probeKnownGatewayPaths() {
  return Promise.all(
    KNOWN_GATEWAY_PROBES.map(async (value) => {
      const url = new URL(value);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4_500);
      try {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
            "User-Agent": "PinFlix/1.0 gateway diagnostic",
          },
          cache: "no-store",
          redirect: "manual",
          signal: controller.signal,
        });
        await response.body?.cancel();
        const location = response.headers.get("location");
        return {
          path: url.pathname + url.search,
          status: response.status,
          contentType: response.headers.get("content-type"),
          location:
            location && location.length < 300 ? location : null,
          reachable: true,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        return {
          path: url.pathname + url.search,
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
