import { probeMovieBoxConnectivity } from "@/src/lib/providers/moviebox/web";
import { isTMDBConfigured } from "@/src/lib/tmdb/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [movieBox, tmdbConfigured] = await Promise.all([
    probeMovieBoxConnectivity(2_500),
    Promise.resolve(isTMDBConfigured()),
  ]);

  return Response.json(
    {
      ok: true,
      degraded: !movieBox.reachable,
      service: "pinflix",
      discovery: {
        tmdbConfigured,
      },
      playbackCatalog: {
        provider: "moviebox",
        transport: "direct-web-api",
        connectivity: movieBox,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
