import { getMovieBoxTaxonomy, getPublicCategories } from "@/src/lib/providers/moviebox/public-web";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [movieCollections, seriesCollections] = await Promise.all([
    getPublicCategories("movie"),
    getPublicCategories("show"),
  ]);

  return Response.json(
    {
      provider: "moviebox",
      taxonomy: getMovieBoxTaxonomy(),
      collections: {
        movie: movieCollections,
        series: seriesCollections,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
