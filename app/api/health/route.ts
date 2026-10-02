import { fallbackCineplexCategories } from "@/src/lib/providers/cineplexbd/categories";
import { probeCineplexConnectivity } from "@/src/lib/providers/cineplexbd/api";

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

  return Response.json(
    {
      ok: true,
      degraded: !connectivity.reachable,
      service: "pinflix",
      provider: "cineplexbd",
      catalog: {
        fallbackReady: true,
        movieCategories: movieCategories.length,
        tvCategories: tvCategories.length,
        totalCategories: fallbackCineplexCategories.length,
      },
      connectivity,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
