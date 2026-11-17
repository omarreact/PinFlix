import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";
import { getCineplexStatusSummary } from "@/src/lib/providers/cineplexbd";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [direct, summary] = await Promise.all([
    probeCineplexConnectivity(),
    getCineplexStatusSummary(),
  ]);

  const ok =
    direct.reachable && direct.status !== null && direct.status < 500;

  return Response.json(
    {
      ok,
      provider: "cineplexbd",
      transport: "direct-cineplexbd",
      upstream: "http://cineplexbd.net",
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
