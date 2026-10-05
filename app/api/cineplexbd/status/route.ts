import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";
import { getCineplexStatusSummary } from "@/src/lib/providers/cineplexbd";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [connectivity, summary] = await Promise.all([
    probeCineplexConnectivity(),
    getCineplexStatusSummary(),
  ]);

  return Response.json(
    {
      ok: connectivity.reachable && connectivity.status !== null && connectivity.status < 500,
      provider: "cineplexbd",
      upstream: "http://cineplexbd.net",
      connectivity,
      taxonomy: {
        source: summary.taxonomySource,
        categories: summary.categories,
        navigation: summary.navigation,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
