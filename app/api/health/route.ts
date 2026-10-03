import { fallbackCineplexCategories } from "@/src/lib/providers/cineplexbd/categories";
import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";
import { isTMDBConfigured } from "@/src/lib/tmdb/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const connectivity = await probeCineplexConnectivity(2_500);
  const movieCategories = fallbackCineplexCategories.filter(
    (item) => item.endpoint === "category.php",
  );
  const tvCategories = fallbackCineplexCategories.filter(
    (item) => item.endpoint === "tcategory.php",
  );
  const tmdbConfigured = isTMDBConfigured();

  return Response.json(
    {
      ok: true,
      degraded: !connectivity.reachable,
      service: "pinflix",
      discovery: {
        tmdbConfigured,
      },
      playbackCatalog: {
        provider: "cineplexbd",
        fallbackReady: true,
        movieCategories: movieCategories.length,
        tvCategories: tvCategories.length,
        totalCategories: fallbackCineplexCategories.length,
        connectivity,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
