import { catalogProvider } from "@/src/lib/providers/catalog";
import { filterCatalogue } from "@/src/lib/catalogue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

/** Safe public health probe: exposes no upstream URL, keys or media tokens.
 * Useful for distinguishing empty UI results from a failed provider feed.
 */
export async function GET() {
  const [movies, series] = await Promise.all([
    catalogProvider.getLatestPage("movie", 1),
    catalogProvider.getLatestPage("show", 1),
  ]);
  const counts = {
    movies: filterCatalogue(movies.items, "movie", null).length,
    series: filterCatalogue(series.items, "show", null).length,
  };
  const status = counts.movies && counts.series ? "healthy" :
    counts.movies || counts.series ? "partial" : "unavailable";
  return Response.json({
    service: "pinflix-catalogue", status, counts,
    checkedAt: new Date().toISOString(),
  }, {
    status: status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
