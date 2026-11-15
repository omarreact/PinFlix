import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";
import { getCineplexStatusSummary } from "@/src/lib/providers/cineplexbd";
import {
  hasCineplexGateway,
  probeCineplexGateway,
} from "@/src/lib/providers/cineplexbd/gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gatewayConfigured = hasCineplexGateway();

  const [gateway, summary, direct] = await Promise.all([
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
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
