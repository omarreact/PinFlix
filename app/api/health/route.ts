import { getTaxonomySummary } from "@/src/lib/providers/cineplexbd";
import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [catalog, connectivity] = await Promise.all([
    getTaxonomySummary(),
    probeCineplexConnectivity(),
  ]);

  return Response.json(
    {
      ok: connectivity.reachable,
      service: "pinflix",
      provider: "cineplexbd",
      catalog,
      connectivity,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
