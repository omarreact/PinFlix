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
        discovery: "moviebox-web",
        playback: "moviebox-unlocked-direct",
        connectivity: movieBox,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
