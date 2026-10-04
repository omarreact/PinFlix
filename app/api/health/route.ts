import { probeMovieBoxConnectivity } from "@/src/lib/providers/moviebox/web";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const movieBox = await probeMovieBoxConnectivity(2_500);

  return Response.json(
    {
      ok: true,
      degraded: !movieBox.reachable,
      service: "pinflix",
      catalog: {
        provider: "moviebox",
        source: "moviebox-web",
      },
      playback: {
        provider: "moviebox",
        mode: "explicitly-unlocked-direct-sources",
      },
      connectivity: movieBox,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
